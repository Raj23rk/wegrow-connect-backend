import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schemas/payment.schema';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import {
  SingAlongBooking,
  SingAlongBookingDocument,
  SingAlongBookingStatus,
} from '../sing-along/schemas/sing-along-booking.schema';
import {
  AiExplorerPrebooking,
  AiExplorerPrebookingDocument,
  AiPrebookingPaymentStatus,
  AiPrebookingStatus,
} from '../ai-explorer/schemas/ai-explorer-prebooking.schema';
import {
  AiExplorerCounter,
  AiExplorerCounterDocument,
} from '../ai-explorer/schemas/ai-explorer-counter.schema';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: Razorpay | null = null;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(SingAlongBooking.name)
    private readonly singAlongBookingModel: Model<SingAlongBookingDocument>,
    @InjectModel(AiExplorerPrebooking.name)
    private readonly aiExplorerPrebookingModel: Model<AiExplorerPrebookingDocument>,
    @InjectModel(AiExplorerCounter.name)
    private readonly counterModel: Model<AiExplorerCounterDocument>,
    private readonly configService: ConfigService,
  ) {
    this.keyId = (
      this.configService.get<string>('RAZORPAY_KEY_ID') ||
      process.env.RAZORPAY_KEY_ID ||
      ''
    ).trim();

    this.keySecret = (
      this.configService.get<string>('RAZORPAY_KEY_SECRET') ||
      process.env.RAZORPAY_KEY_SECRET ||
      ''
    ).trim();

    this.initRazorpay();
  }

  private initRazorpay(): void {
    if (this.keyId && this.keySecret && this.keyId !== 'RAZORPAY_KEY_ID') {
      try {
        this.razorpay = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        });
        this.logger.log('Razorpay SDK initialized successfully');
      } catch (err: any) {
        this.logger.error(`Failed to initialize Razorpay SDK: ${err.message}`);
      }
    } else {
      this.logger.warn(
        'Razorpay credentials not fully configured in environment.',
      );
    }
  }

  /**
   * Return public configuration for frontend checkout (KEY_ID only, never secret)
   */
  getConfig() {
    return {
      keyId: this.keyId,
      key_id: this.keyId,
      currency: 'INR',
      isLive: Boolean(this.razorpay),
    };
  }

  // =========================================================================
  // STEP 1: CREATE PAYMENT ORDER
  // =========================================================================
  async createOrder(dto: CreatePaymentOrderDto) {
    if (!this.razorpay) {
      this.initRazorpay();
    }

    if (!this.keyId || !this.keySecret) {
      throw new UnauthorizedException(
        'Razorpay credentials are not configured on the server',
      );
    }

    // Amount validation: must be in paise and >= 100 paise (₹1)
    let amountInPaise: number;
    if (dto.inRupees) {
      amountInPaise = Math.round(Number(dto.amount) * 100);
    } else {
      amountInPaise = Math.round(Number(dto.amountInPaise || dto.amount));
    }

    if (isNaN(amountInPaise) || amountInPaise < 100) {
      throw new BadRequestException(
        'Payment amount must be at least 100 paise (₹1.00)',
      );
    }

    const currency = (dto.currency || 'INR').toUpperCase();
    const receipt =
      dto.receipt || `rcpt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const purpose = dto.purpose || 'GENERAL';
    const notes = dto.notes || {};

    let orderId = '';

    try {
      if (!this.razorpay) {
        throw new UnauthorizedException('Razorpay client is not initialized');
      }

      const order = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          purpose,
          ...notes,
        },
      });

      orderId = order.id;
      amountInPaise = order.amount as number;
    } catch (error: any) {
      const statusCode = error.statusCode || error.status;
      const desc =
        error.error?.description ||
        error.description ||
        error.message ||
        (typeof error === 'object' ? JSON.stringify(error) : String(error)) ||
        'Razorpay order creation failed';

      this.logger.error(`Razorpay order creation failed: ${desc}`);

      // Handle auth failures (return 401)
      if (
        statusCode === 401 ||
        /auth|unauthorized|invalid\s*(key|secret)|bad_request_error/i.test(desc)
      ) {
        throw new UnauthorizedException(desc);
      }

      // Handle other Razorpay API errors (return 500)
      throw new InternalServerErrorException(desc);
    }

    // Save payment record in DB if model available
    try {
      if (this.paymentModel) {
        await this.paymentModel.create({
          orderId,
          amount: amountInPaise / 100,
          amountInPaise,
          currency,
          status: PaymentStatus.CREATED,
          purpose,
          receipt,
          customer: dto.customer || {},
          notes,
        });
      }
    } catch (dbErr: any) {
      this.logger.warn(`Could not save payment record to DB: ${dbErr.message}`);
    }

    return {
      order_id: orderId,
      orderId: orderId,
      amount: amountInPaise,
      currency,
      receipt,
      key_id: this.keyId,
      keyId: this.keyId,
      purpose,
      notes,
    };
  }

  // =========================================================================
  // STEP 3: VERIFY PAYMENT SIGNATURE
  // =========================================================================
  async verifyPayment(dto: VerifyPaymentDto) {
    const razorpayOrderId =
      dto.razorpay_order_id ||
      dto.razorpayOrderId ||
      dto.order_id ||
      dto.orderId;
    const razorpayPaymentId =
      dto.razorpay_payment_id ||
      dto.razorpayPaymentId ||
      dto.payment_id ||
      dto.paymentId;
    const razorpaySignature =
      dto.razorpay_signature ||
      dto.razorpaySignature ||
      dto.signature;

    // Validate missing fields: return 400
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestException(
        'Missing required fields: order_id, payment_id, and signature are required',
      );
    }

    if (!this.keySecret) {
      throw new InternalServerErrorException(
        'Razorpay secret key is not configured on the server',
      );
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isSignatureValid = generatedSignature === razorpaySignature;

    // Signature mismatch: return 400, do NOT mark as paid
    if (!isSignatureValid) {
      this.logger.warn(
        `Invalid Razorpay signature mismatch for order: ${razorpayOrderId}`,
      );
      if (this.paymentModel) {
        try {
          await this.paymentModel.findOneAndUpdate(
            { orderId: razorpayOrderId },
            { status: PaymentStatus.FAILED },
          );
        } catch {}
      }
      throw new BadRequestException(
        'Payment signature verification failed: signature mismatch',
      );
    }

    // Update payment record in MongoDB
    let payment: any = null;
    if (this.paymentModel) {
      try {
        payment = await this.paymentModel.findOneAndUpdate(
          { orderId: razorpayOrderId },
          {
            paymentId: razorpayPaymentId,
            signature: razorpaySignature,
            status: PaymentStatus.SUCCESS,
            metadata: dto.metadata || {},
          },
          { new: true, upsert: true },
        );
      } catch (dbErr: any) {
        this.logger.warn(`Could not update payment record in DB: ${dbErr.message}`);
      }
    }

    // If payment is linked to a Sing Along Booking, auto-confirm it
    const targetBookingId =
      dto.bookingId ||
      payment?.notes?.bookingId ||
      dto.metadata?.bookingId;

    if (targetBookingId && this.singAlongBookingModel) {
      try {
        await this.singAlongBookingModel.findOneAndUpdate(
          { bookingId: targetBookingId },
          {
            utr: razorpayPaymentId,
            status: SingAlongBookingStatus.CONFIRMED,
            notes: `Paid via Razorpay: ${razorpayPaymentId}`,
          },
        );
        this.logger.log(`Auto-confirmed Sing Along booking: ${targetBookingId}`);
      } catch (err: any) {
        this.logger.warn(
          `Could not auto-update booking ${targetBookingId}: ${err.message}`,
        );
      }
    }

    // If payment is linked to an AI Explorer Prebooking, auto-create / confirm it in MongoDB
    const isAiExplorerPrebooking =
      dto.purpose === 'AI_EXPLORER_PREBOOKING' ||
      dto.purpose === 'AI_EXPLORER_PRE_BOOKING' ||
      payment?.purpose === 'AI_EXPLORER_PREBOOKING' ||
      payment?.purpose === 'AI_EXPLORER_PRE_BOOKING' ||
      payment?.notes?.bookingType === 'AI_EXPLORER_PRE_BOOKING' ||
      payment?.notes?.purpose === 'AI_EXPLORER_PREBOOKING' ||
      (dto.metadata && dto.metadata.bookingType === 'AI_EXPLORER_PRE_BOOKING') ||
      targetBookingId?.startsWith('AIP');

    if (isAiExplorerPrebooking && this.aiExplorerPrebookingModel) {
      try {
        let prebooking = await this.aiExplorerPrebookingModel.findOne({
          $or: [
            { orderId: razorpayOrderId },
            ...(targetBookingId ? [{ prebookingId: targetBookingId }] : []),
          ],
        });

        if (prebooking) {
          prebooking.paymentStatus = AiPrebookingPaymentStatus.COMPLETED;
          prebooking.status = AiPrebookingStatus.CONFIRMED;
          prebooking.paymentId = razorpayPaymentId;
          prebooking.utr = razorpayPaymentId;
          prebooking.isActive = true;
          prebooking.adminNotes = `Paid via Razorpay: ${razorpayPaymentId} (Order: ${razorpayOrderId})`;
          await prebooking.save();
          this.logger.log(`Auto-confirmed existing AI Explorer prebooking: ${prebooking.prebookingId}`);
        } else {
          // Generate unique Prebooking ID
          let prebookingId = targetBookingId || '';
          if (!prebookingId && this.counterModel) {
            try {
              const counter = await this.counterModel.findOneAndUpdate(
                { id: 'ai_explorer_prebooking' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true, setDefaultsOnInsert: true },
              );
              const year = new Date().getFullYear().toString().slice(-2);
              prebookingId = `AIP${year}-${counter.seq}`;
            } catch {
              prebookingId = `AIP26-${Math.floor(1000 + Math.random() * 9000)}`;
            }
          }
          if (!prebookingId) {
            prebookingId = `AIP26-${Math.floor(1000 + Math.random() * 9000)}`;
          }

          const customer = payment?.customer || {};
          const notes = payment?.notes || {};
          const studentName = notes.students || customer.name || 'Student';
          const fatherPhone = notes.fatherPhone || customer.phone || '9999999999';
          const motherPhone = notes.motherPhone || '';
          const email = customer.email || 'student@wegrowbschool.in';
          const totalStudents = Number(notes.studentCount) || 1;
          const amount = payment?.amount || (dto as any).amount || 2;

          prebooking = await this.aiExplorerPrebookingModel.create({
            prebookingId,
            students: [
              {
                studentName,
                standard: notes.standard || 'AI Explorer',
                school: notes.school || 'WeGrow Skill Campus',
              },
            ],
            totalStudents,
            amountPerStudent: Math.round(amount / totalStudents),
            totalAmount: amount,
            email,
            fatherName: customer.name || 'Parent',
            motherName: '',
            fatherPhone,
            motherPhone,
            address: notes.address || 'Direct Web Pre-Booking',
            courseName: 'AI Explorer Pre-Booking',
            paymentMethod: 'Razorpay',
            paymentStatus: AiPrebookingPaymentStatus.COMPLETED,
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            utr: razorpayPaymentId,
            declarationAccepted: true,
            status: AiPrebookingStatus.CONFIRMED,
            adminNotes: `Paid via Razorpay: ${razorpayPaymentId} (Order: ${razorpayOrderId})`,
            isActive: true,
          });
          this.logger.log(`Auto-created confirmed AI Explorer prebooking: ${prebookingId}`);
        }
      } catch (aiErr: any) {
        this.logger.error(`Error saving AI Explorer prebooking: ${aiErr.message}`);
      }
    }

    return {
      success: true,
      verified: true,
      message: 'Payment verified successfully',
      order_id: razorpayOrderId,
      orderId: razorpayOrderId,
      payment_id: razorpayPaymentId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      amount: payment?.amountInPaise || payment?.amount,
      currency: payment?.currency || 'INR',
      status: 'PAID',
    };
  }

  // =========================================================================
  // GET ALL PAYMENTS (WITH PAGINATION & SEARCH)
  // =========================================================================
  async getAllPayments(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    purpose?: string;
  }) {
    if (!this.paymentModel) {
      throw new NotFoundException('Payment database not available');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status && query.status.trim()) {
      filter.status = query.status.trim().toUpperCase();
    }

    if (query.purpose && query.purpose.trim()) {
      filter.purpose = { $regex: query.purpose.trim(), $options: 'i' };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { orderId: { $regex: s, $options: 'i' } },
        { paymentId: { $regex: s, $options: 'i' } },
        { 'customer.name': { $regex: s, $options: 'i' } },
        { 'customer.email': { $regex: s, $options: 'i' } },
        { 'customer.phone': { $regex: s, $options: 'i' } },
        { receipt: { $regex: s, $options: 'i' } },
        { purpose: { $regex: s, $options: 'i' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.paymentModel.countDocuments(filter),
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // =========================================================================
  // GET PAYMENT BY ID OR ORDER ID
  // =========================================================================
  async getPayment(id: string) {
    if (!this.paymentModel) {
      throw new NotFoundException('Payment database not available');
    }

    const payment = await this.paymentModel
      .findOne({
        $or: [
          { orderId: id },
          { paymentId: id },
          ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
        ],
      })
      .select('-__v')
      .lean();

    if (!payment) {
      throw new NotFoundException(`Payment transaction "${id}" not found`);
    }

    return payment;
  }

  // =========================================================================
  // WEBHOOK HANDLER
  // =========================================================================
  async handleWebhook(body: any, signature: string) {
    this.logger.log(`Received Razorpay webhook event: ${body?.event}`);
    const event = body?.event;
    const paymentEntity = body?.payload?.payment?.entity;

    if (paymentEntity?.order_id && this.paymentModel) {
      if (event === 'payment.captured') {
        await this.paymentModel.findOneAndUpdate(
          { orderId: paymentEntity.order_id },
          {
            paymentId: paymentEntity.id,
            status: PaymentStatus.SUCCESS,
          },
        );
      } else if (event === 'payment.failed') {
        await this.paymentModel.findOneAndUpdate(
          { orderId: paymentEntity.order_id },
          {
            paymentId: paymentEntity.id,
            status: PaymentStatus.FAILED,
          },
        );
      }
    }

    return { received: true };
  }
}
