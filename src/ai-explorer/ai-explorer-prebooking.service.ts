import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  AiExplorerPrebooking,
  AiExplorerPrebookingDocument,
  AiPrebookingPaymentStatus,
  AiPrebookingStatus,
  PrebookingStudentItem,
} from './schemas/ai-explorer-prebooking.schema';
import {
  AiExplorerPrebookingPayment,
  AiExplorerPrebookingPaymentDocument,
  AiExplorerPrebookingTxnStatus,
} from './schemas/ai-explorer-prebooking-payment.schema';
import {
  AiExplorerCounter,
  AiExplorerCounterDocument,
} from './schemas/ai-explorer-counter.schema';
import {
  CreateAiExplorerPrebookingDto,
  StudentItemDto,
} from './dto/create-ai-explorer-prebooking.dto';
import {
  CreateAiPrebookingOrderDto,
  SubmitAiPrebookingUtrDto,
} from './dto/create-ai-prebooking-order.dto';
import { QueryAiExplorerPrebookingDto } from './dto/query-ai-explorer-prebooking.dto';
import { UpdateAiExplorerPrebookingDto } from './dto/update-ai-explorer-prebooking.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AiExplorerPrebookingService {
  private readonly logger = new Logger(AiExplorerPrebookingService.name);

  constructor(
    @InjectModel(AiExplorerPrebooking.name)
    private readonly prebookingModel: Model<AiExplorerPrebookingDocument>,
    @InjectModel(AiExplorerPrebookingPayment.name)
    private readonly prebookingPaymentModel: Model<AiExplorerPrebookingPaymentDocument>,
    @InjectModel(AiExplorerCounter.name)
    private readonly counterModel: Model<AiExplorerCounterDocument>,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getCashfreeAppId(): string {
    return (
      this.configService.get<string>('CASHFREE_APP_ID') ||
      process.env.CASHFREE_APP_ID ||
      ''
    ).trim();
  }

  private getCashfreeSecretKey(): string {
    return (
      this.configService.get<string>('CASHFREE_SECRET_KEY') ||
      process.env.CASHFREE_SECRET_KEY ||
      ''
    ).trim();
  }

  private getCashfreeEnv(): string {
    return (
      this.configService.get<string>('CASHFREE_ENV') ||
      process.env.CASHFREE_ENV ||
      'PROD'
    )
      .trim()
      .toUpperCase();
  }

  private getCashfreeApiVersion(): string {
    return (
      this.configService.get<string>('CASHFREE_API_VERSION') ||
      process.env.CASHFREE_API_VERSION ||
      '2023-08-01'
    ).trim();
  }

  private getCashfreeBaseUrl(): string {
    return this.getCashfreeEnv() === 'PROD'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  /**
   * Generates sequential unique prebooking IDs like AIP26-1001
   */
  async generatePrebookingId(): Promise<string> {
    try {
      const counter = await this.counterModel.findOneAndUpdate(
        { id: 'ai_explorer_prebooking' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      const year = new Date().getFullYear().toString().slice(-2);
      return `AIP${year}-${counter.seq}`;
    } catch (error) {
      this.logger.error('Failed to generate sequential prebooking ID, using random fallback', error);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `AIP26-${rand}`;
    }
  }

  /**
   * Helper: Normalize student array from DTO
   */
  private normalizeStudents(dto: {
    students?: StudentItemDto[];
    studentName?: string;
    name?: string;
    customerName?: string;
    standard?: string;
    school?: string;
  }): PrebookingStudentItem[] {
    const list: PrebookingStudentItem[] = [];

    if (Array.isArray(dto.students) && dto.students.length > 0) {
      for (const s of dto.students) {
        const studentName = (s.studentName || s.name || '').trim();
        const standard = (s.standard || '').trim();
        const school = (s.school || '').trim();
        if (studentName) {
          list.push({
            name: studentName,
            studentName,
            standard: standard || 'School Student',
            school: school || 'School',
            preferredBatch: (s.preferredBatch || s.batch || '').trim(),
            batch: (s.batch || '').trim(),
            timeSlot: (s.timeSlot || '').trim(),
            gender: (s.gender || '').trim(),
            dob: (s.dob || '').trim(),
            age: s.age ? String(s.age).trim() : '',
            remarks: (s.remarks || '').trim(),
          });
        }
      }
    }

    // Fallback if single student provided directly
    if (list.length === 0) {
      const singleName = (dto.studentName || dto.name || dto.customerName || '').trim();
      if (singleName) {
        list.push({
          name: singleName,
          studentName: singleName,
          standard: (dto.standard || 'School Student').trim(),
          school: (dto.school || 'School').trim(),
        });
      }
    }

    return list;
  }

  // =========================================================================
  // 1. CREATE PAYMENT ORDER (Cashfree PG Order API - ₹1000/student)
  // =========================================================================
  async createOrder(dto: CreateAiPrebookingOrderDto) {
    const students = this.normalizeStudents(dto);
    if (students.length === 0) {
      throw new BadRequestException('At least one student details (name, standard, school) must be provided.');
    }

    const email = (dto.email || dto.customerEmail || dto.mailId || '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Parent email address is required.');
    }

    const rawFatherPhone = (dto.fatherPhone || dto.phone || dto.customerPhone || '').trim().replace(/\D/g, '').slice(-10);
    const rawMotherPhone = (dto.motherPhone || '').trim().replace(/\D/g, '').slice(-10);

    if (rawFatherPhone && rawMotherPhone && rawFatherPhone === rawMotherPhone) {
      throw new BadRequestException("Father's phone number and Mother's phone number cannot be the same. Please provide an alternate contact number.");
    }

    const fatherPhone = rawFatherPhone || rawMotherPhone;

    if (!fatherPhone || !/^[6-9]\d{9}$/.test(fatherPhone)) {
      throw new BadRequestException('A valid 10-digit mobile number is required.');
    }

    const totalStudents = students.length;
    const amountPerStudent = 1000;
    const totalAmount = dto.amount && dto.amount > 0 ? dto.amount : totalStudents * amountPerStudent;

    const prebookingId = await this.generatePrebookingId();
    const orderId = `order_AIP26_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://www.wegrowbschool.in';

    const returnUrl = `${frontendUrl}/ai-explorer-prebooking.html?order_id={order_id}`;
    const notifyUrl = 'https://wegrow-connect-backend-1.onrender.com/api/v1/ai-explorer/prebooking/webhook';

    const appId = this.getCashfreeAppId();
    const secretKey = this.getCashfreeSecretKey();
    const apiVersion = this.getCashfreeApiVersion();
    const baseUrl = this.getCashfreeBaseUrl();

    if (!appId || !secretKey) {
      throw new BadRequestException('Cashfree API credentials are not configured on server.');
    }

    const firstStudentName = students[0]?.studentName || students[0]?.name || 'Student';
    const customerDisplayName = (
      dto.fatherName ||
      dto.motherName ||
      dto.customerName ||
      firstStudentName
    ).replace(/[^a-zA-Z0-9\s.-]/g, ' ').trim().slice(0, 80) || 'Parent';

    let cfOrder: any = null;
    try {
      this.logger.log(`Creating Cashfree Prebooking order ${orderId} for ₹${totalAmount} (${fatherPhone})`);
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': apiVersion,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: totalAmount,
          order_currency: 'INR',
          customer_details: {
            customer_id: `cust_${fatherPhone.replace(/\D/g, '')}`,
            customer_name: customerDisplayName,
            customer_email: email,
            customer_phone: fatherPhone,
          },
          order_meta: {
            return_url: returnUrl,
            notify_url: notifyUrl,
          },
          order_note: (dto.orderNote || `AI Explorer Pre-Booking (${totalStudents} Student(s) - ${prebookingId})`).slice(0, 150),
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const errJson = await response.json();
        this.logger.error('Cashfree prebooking order creation error response:', errJson);
        throw new InternalServerErrorException(
          errJson?.message || 'Failed to create order on Cashfree',
        );
      }

      cfOrder = await response.json();
      this.logger.log(`Cashfree prebooking order created: ${cfOrder.order_id}, cfOrderId: ${cfOrder.cf_order_id}`);
    } catch (err: any) {
      this.logger.error('Failed to communicate with Cashfree PG for prebooking:', err?.message || err);
      throw new InternalServerErrorException(
        err?.message || 'Unable to connect to Cashfree payment gateway',
      );
    }

    const paymentSessionId = cfOrder.payment_session_id;
    const cfOrderId = cfOrder.cf_order_id ? String(cfOrder.cf_order_id) : '';

    // Parallel DB writes
    await Promise.all([
      this.prebookingModel.create({
        prebookingId,
        students,
        totalStudents,
        amountPerStudent,
        totalAmount,
        email,
        fatherName: (dto.fatherName || 'Parent').trim(),
        motherName: (dto.motherName || '').trim(),
        fatherPhone,
        motherPhone: rawMotherPhone || fatherPhone,
        address: (dto.address || '').trim(),
        courseName: 'AI Explorer Pre-Booking',
        paymentMethod: dto.paymentMethod || 'Cashfree',
        paymentStatus: AiPrebookingPaymentStatus.PENDING,
        orderId,
        paymentSessionId,
        cfOrderId,
        status: AiPrebookingStatus.PENDING_PAYMENT,
        adminNotes: dto.notes || dto.orderNote || `Pending payment order: ${orderId}`,
        isActive: true,
      }),
      this.prebookingPaymentModel.create({
        orderId,
        prebookingId,
        cfOrderId,
        paymentSessionId,
        amount: totalAmount,
        totalStudents,
        currency: 'INR',
        status: AiExplorerPrebookingTxnStatus.INITIALIZED,
        fatherName: customerDisplayName,
        phone: fatherPhone,
        email,
      }),
    ]);

    return {
      orderId,
      txnid: orderId,
      cfOrderId,
      paymentSessionId,
      prebookingId,
      totalStudents,
      amountPerStudent,
      amount: totalAmount,
      currency: 'INR',
      students,
      email,
      phone: fatherPhone,
      environment: this.getCashfreeEnv(),
      paymentLink: `https://payments.cashfree.com/order/#${paymentSessionId}`,
      customer: {
        name: customerDisplayName,
        phone: fatherPhone,
        email,
      },
    };
  }

  // =========================================================================
  // 2. CASHFREE WEBHOOK LISTENER
  // =========================================================================
  async handleCashfreeWebhook(
    body: any,
    signature?: string,
    timestamp?: string,
    req?: any,
  ) {
    this.logger.log('Received AI Explorer Pre-booking Cashfree webhook payload:', JSON.stringify(body));

    const order = body?.data?.order;
    const payment = body?.data?.payment;
    const orderId = order?.order_id || body?.orderId;
    const paymentStatus = payment?.payment_status || body?.txStatus || 'SUCCESS';

    if (!orderId) {
      return { status: 'IGNORED', message: 'No order_id in webhook' };
    }

    if (paymentStatus === 'SUCCESS') {
      const prebooking = await this.prebookingModel.findOne({ orderId });
      if (prebooking) {
        prebooking.paymentStatus = AiPrebookingPaymentStatus.COMPLETED;
        prebooking.status = AiPrebookingStatus.CONFIRMED;
        prebooking.paymentId = payment?.cf_payment_id || '';
        prebooking.utr = payment?.bank_reference || '';
        await prebooking.save();

        await this.prebookingPaymentModel.updateOne(
          { orderId },
          {
            $set: {
              status: AiExplorerPrebookingTxnStatus.SUCCESS,
              cfPaymentId: payment?.cf_payment_id,
              bankReference: payment?.bank_reference,
              rawGatewayResponse: body,
            },
          },
        );

        // Send confirmation emails
        this.sendNotificationEmails(prebooking).catch((e) =>
          this.logger.error('Error sending confirmation email after prebooking webhook:', e),
        );
      }
    }

    return { status: 'OK', message: 'Pre-booking webhook processed successfully' };
  }

  // =========================================================================
  // 3. GET REAL-TIME PAYMENT STATUS
  // =========================================================================
  async getPaymentStatus(orderId: string) {
    const cleanOrderId = (orderId || '').trim();
    let prebooking = await this.prebookingModel.findOne({
      $or: [
        { orderId: cleanOrderId },
        { prebookingId: cleanOrderId.toUpperCase() },
        { cfOrderId: cleanOrderId },
      ],
    });
    if (!prebooking) {
      throw new NotFoundException(`No pre-booking found for order ID: ${cleanOrderId}`);
    }

    // If still pending, query Cashfree in real-time
    if (prebooking.paymentStatus !== AiPrebookingPaymentStatus.COMPLETED && prebooking.orderId) {
      const appId = this.getCashfreeAppId();
      const secretKey = this.getCashfreeSecretKey();
      const apiVersion = this.getCashfreeApiVersion();
      const baseUrl = this.getCashfreeBaseUrl();

      if (appId && secretKey) {
        try {
          const cfOrderRes = await fetch(`${baseUrl}/orders/${prebooking.orderId}`, {
            headers: {
              'x-client-id': appId,
              'x-client-secret': secretKey,
              'x-api-version': apiVersion,
            },
            signal: AbortSignal.timeout(5000),
          });

          if (cfOrderRes.ok) {
            const cfOrder = await cfOrderRes.json();
            if (cfOrder?.order_status === 'PAID') {
              this.logger.log(`Cashfree Prebooking Order ${prebooking.orderId} verified as PAID via status check`);
              let cfPaymentId = '';
              let bankRef = '';

              try {
                const cfPayRes = await fetch(`${baseUrl}/orders/${prebooking.orderId}/payments`, {
                  headers: {
                    'x-client-id': appId,
                    'x-client-secret': secretKey,
                    'x-api-version': apiVersion,
                  },
                  signal: AbortSignal.timeout(4000),
                });
                if (cfPayRes.ok) {
                  const payments = await cfPayRes.json();
                  const successPay = Array.isArray(payments)
                    ? payments.find((p: any) => p.payment_status === 'SUCCESS')
                    : null;
                  if (successPay) {
                    cfPaymentId = String(successPay.cf_payment_id || '');
                    bankRef = String(successPay.bank_reference || cfPaymentId);
                  }
                }
              } catch (pErr) {
                this.logger.warn(`Could not fetch prebooking payment details: ${pErr}`);
              }

              prebooking.paymentStatus = AiPrebookingPaymentStatus.COMPLETED;
              prebooking.status = AiPrebookingStatus.CONFIRMED;
              prebooking.paymentId = cfPaymentId;
              prebooking.utr = bankRef;
              await prebooking.save();

              await this.prebookingPaymentModel.updateOne(
                { orderId: prebooking.orderId },
                {
                  $set: {
                    status: AiExplorerPrebookingTxnStatus.SUCCESS,
                    cfPaymentId,
                    bankReference: bankRef,
                  },
                },
              );

              this.sendNotificationEmails(prebooking).catch((err) =>
                this.logger.error('Error dispatching confirmation emails after prebooking status verification:', err),
              );
            }
          }
        } catch (err: any) {
          this.logger.warn(`Failed to query Cashfree status for prebooking order ${prebooking.orderId}: ${err?.message}`);
        }
      }
    }

    return {
      success: true,
      orderId: cleanOrderId,
      prebookingId: prebooking.prebookingId,
      totalStudents: prebooking.totalStudents,
      students: prebooking.students,
      email: prebooking.email,
      totalAmount: prebooking.totalAmount,
      paymentStatus: prebooking.paymentStatus,
      status: prebooking.status,
      utr: prebooking.utr,
    };
  }

  // =========================================================================
  // 4. SUBMIT MANUAL UPI UTR / TRANSACTION ID
  // =========================================================================
  async submitUtr(dto: SubmitAiPrebookingUtrDto) {
    const orderId = (dto.orderId || dto.prebookingId || '').trim();
    const utr = (dto.utr || '').trim();

    if (!orderId || !utr) {
      throw new BadRequestException('Order ID and UTR reference number are required');
    }

    const prebooking = await this.prebookingModel.findOne({
      $or: [{ orderId }, { prebookingId: orderId }],
    });

    if (!prebooking) {
      throw new NotFoundException(`Pre-booking with ID ${orderId} not found`);
    }

    prebooking.utr = utr;
    prebooking.paymentStatus = AiPrebookingPaymentStatus.COMPLETED;
    prebooking.status = AiPrebookingStatus.CONFIRMED;
    prebooking.paymentMethod = 'UPI';
    const saved = await prebooking.save();

    await this.prebookingPaymentModel.updateOne(
      { orderId: prebooking.orderId || orderId },
      {
        $set: {
          status: AiExplorerPrebookingTxnStatus.SUCCESS,
          bankReference: utr,
        },
      },
    );

    // Send confirmation emails
    this.sendNotificationEmails(saved).catch((err) =>
      this.logger.error('Error dispatching confirmation emails after prebooking UTR submission:', err),
    );

    return {
      success: true,
      message: 'Payment reference recorded and pre-booking confirmed!',
      data: saved,
    };
  }

  // =========================================================================
  // 5. PUBLIC DIRECT PRE-BOOKING ENROLLMENT / REGISTRATION
  // =========================================================================
  async enrollPrebooking(dto: CreateAiExplorerPrebookingDto) {
    const students = this.normalizeStudents(dto);
    if (students.length === 0) {
      throw new BadRequestException('At least one student details (name, standard, school) are required');
    }

    const email = (dto.email || '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Parent email address is required');
    }

    const fatherName = (dto.fatherName || '').trim();
    const rawFatherPhone = (dto.fatherPhone || '').trim().replace(/\D/g, '').slice(-10);
    const rawMotherPhone = (dto.motherPhone || '').trim().replace(/\D/g, '').slice(-10);

    if (rawFatherPhone && rawMotherPhone && rawFatherPhone === rawMotherPhone) {
      throw new BadRequestException("Father's phone number and Mother's phone number cannot be the same. Please provide an alternate contact number.");
    }

    const fatherPhone = rawFatherPhone || rawMotherPhone;
    const motherPhone = rawMotherPhone || '';
    const address = (dto.address || '').trim();

    if (!fatherName || !fatherPhone || !address) {
      throw new BadRequestException('Parent name, phone number, and address are required');
    }

    const totalStudents = students.length;
    const amountPerStudent = dto.amountPerStudent || 1000;
    const totalAmount = dto.totalAmount || dto.amount || totalStudents * amountPerStudent;
    const prebookingId = await this.generatePrebookingId();

    let paymentStatus = AiPrebookingPaymentStatus.COMPLETED;
    if (dto.paymentStatus) {
      const ps = dto.paymentStatus.toUpperCase().trim();
      if (ps.includes('PENDING')) paymentStatus = AiPrebookingPaymentStatus.PENDING;
      else if (ps.includes('FAIL')) paymentStatus = AiPrebookingPaymentStatus.FAILED;
      else if (ps.includes('REFUND')) paymentStatus = AiPrebookingPaymentStatus.REFUNDED;
      else paymentStatus = AiPrebookingPaymentStatus.COMPLETED;
    }

    const status =
      dto.status === 'PENDING_PAYMENT'
        ? AiPrebookingStatus.PENDING_PAYMENT
        : AiPrebookingStatus.CONFIRMED;

    const prebooking = new this.prebookingModel({
      prebookingId,
      students,
      totalStudents,
      amountPerStudent,
      totalAmount,
      email,
      fatherName,
      motherName: (dto.motherName || '').trim(),
      fatherPhone,
      motherPhone,
      address,
      courseName: 'AI Explorer Pre-Booking',
      paymentMethod: dto.paymentMethod || 'UPI',
      paymentStatus,
      orderId: dto.orderId || dto.transactionId || '',
      paymentId: dto.paymentId || dto.transactionId || '',
      utr: dto.utr || dto.transactionId || '',
      declarationAccepted: dto.declarationAccepted !== false,
      status,
      adminNotes: dto.adminNotes || '',
      isActive: true,
    });

    const saved = await prebooking.save();

    // Async email notifications
    this.sendNotificationEmails(saved).catch((err) =>
      this.logger.error(`Error sending pre-booking email notifications for ${prebookingId}:`, err),
    );

    return saved;
  }

  // =========================================================================
  // 6. DISPATCH CONFIRMATION & ADMIN ALERT EMAILS
  // =========================================================================
  async sendNotificationEmails(prebooking: AiExplorerPrebookingDocument) {
    if (!prebooking.email) return;

    // Only send confirmation email if payment is COMPLETED
    if (prebooking.paymentStatus !== AiPrebookingPaymentStatus.COMPLETED) {
      this.logger.log(
        `Skipping pre-booking confirmation email for ${prebooking.prebookingId} because paymentStatus is ${prebooking.paymentStatus}. Email will be dispatched once payment succeeds.`,
      );
      return;
    }

    try {
      // 1. Send Parent / Family Confirmation Email
      const emailSuccess = await this.notificationsService.sendAiExplorerPrebookingConfirmationEmail({
        email: prebooking.email,
        prebookingId: prebooking.prebookingId,
        students: prebooking.students,
        totalStudents: prebooking.totalStudents,
        amountPerStudent: prebooking.amountPerStudent,
        totalAmount: prebooking.totalAmount,
        fatherName: prebooking.fatherName,
        motherName: prebooking.motherName,
        fatherPhone: prebooking.fatherPhone,
        motherPhone: prebooking.motherPhone,
        address: prebooking.address,
        paymentMethod: prebooking.paymentMethod,
        paymentStatus: prebooking.paymentStatus,
        utr: prebooking.utr,
        orderId: prebooking.orderId,
        createdAt: (prebooking as any).createdAt,
      });

      if (emailSuccess) {
        await this.prebookingModel.updateOne(
          { _id: prebooking._id },
          { $set: { emailSent: true, emailSentAt: new Date() } },
        );
        this.logger.log(`Pre-booking confirmation email sent to ${prebooking.email} for ${prebooking.prebookingId}`);
      }

      // 2. Send Admin Alert Email
      await this.notificationsService.sendAiExplorerPrebookingAdminAlertEmail({
        prebookingId: prebooking.prebookingId,
        students: prebooking.students,
        totalStudents: prebooking.totalStudents,
        totalAmount: prebooking.totalAmount,
        email: prebooking.email,
        fatherName: prebooking.fatherName,
        motherName: prebooking.motherName,
        fatherPhone: prebooking.fatherPhone,
        motherPhone: prebooking.motherPhone,
        address: prebooking.address,
        paymentMethod: prebooking.paymentMethod,
        paymentStatus: prebooking.paymentStatus,
        orderId: prebooking.orderId,
        utr: prebooking.utr,
        createdAt: (prebooking as any).createdAt,
      });
    } catch (err) {
      this.logger.error('Failed to send prebooking notification emails:', err);
    }
  }

  // =========================================================================
  // 7. PUBLIC VERIFICATION BY ID
  // =========================================================================
  async verifyPrebooking(id: string) {
    const cleanId = (id || '').trim();
    let prebooking: AiExplorerPrebookingDocument | null = null;

    if (Types.ObjectId.isValid(cleanId)) {
      prebooking = await this.prebookingModel.findById(cleanId);
    }
    if (!prebooking) {
      prebooking = await this.prebookingModel.findOne({
        $or: [
          { prebookingId: cleanId.toUpperCase() },
          { orderId: cleanId },
          { utr: cleanId },
        ],
        isActive: true,
      });
    }

    if (!prebooking) {
      throw new NotFoundException(`Pre-booking not found with ID: ${cleanId}`);
    }

    return {
      success: true,
      data: prebooking,
    };
  }

  // =========================================================================
  // 8. ADMIN: STATS & ANALYTICS
  // =========================================================================
  async getStats() {
    const [
      totalPrebookings,
      confirmedPrebookings,
      pendingPrebookings,
      revenueResult,
      studentCountResult,
      recentPrebookings,
    ] = await Promise.all([
      this.prebookingModel.countDocuments({ isActive: true }),
      this.prebookingModel.countDocuments({
        isActive: true,
        paymentStatus: AiPrebookingPaymentStatus.COMPLETED,
      }),
      this.prebookingModel.countDocuments({
        isActive: true,
        paymentStatus: AiPrebookingPaymentStatus.PENDING,
      }),
      this.prebookingModel.aggregate([
        {
          $match: {
            isActive: true,
            paymentStatus: AiPrebookingPaymentStatus.COMPLETED,
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.prebookingModel.aggregate([
        {
          $match: {
            isActive: true,
            paymentStatus: AiPrebookingPaymentStatus.COMPLETED,
          },
        },
        { $group: { _id: null, totalStudentsCount: { $sum: '$totalStudents' } } },
      ]),
      this.prebookingModel
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalCollected = revenueResult[0]?.total || 0;
    const totalStudentsRegistered = studentCountResult[0]?.totalStudentsCount || 0;

    return {
      success: true,
      data: {
        totalPrebookings,
        confirmedPrebookings,
        pendingPrebookings,
        totalCollected,
        totalStudentsRegistered,
        averageAmount: totalPrebookings > 0 ? Math.round(totalCollected / totalPrebookings) : 0,
        recentPrebookings,
      },
    };
  }

  // =========================================================================
  // 9. ADMIN: CSV EXPORT
  // =========================================================================
  async exportCsv(): Promise<string> {
    const list = await this.prebookingModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Prebooking ID',
      'Total Students',
      'Student Names',
      'Standards',
      'Schools',
      'Father Name',
      'Mother Name',
      'Father Phone',
      'Mother Phone',
      'Email',
      'Address',
      'Amount Per Student (INR)',
      'Total Amount (INR)',
      'Payment Method',
      'Payment Status',
      'Order ID',
      'UTR Reference',
      'Booking Status',
      'Email Sent',
      'Created Date',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = list.map((item: any) => {
      const studentNames = (item.students || []).map((s: any) => s.studentName).join('; ');
      const standards = (item.students || []).map((s: any) => s.standard).join('; ');
      const schools = (item.students || []).map((s: any) => s.school).join('; ');

      return [
        escapeCsv(item.prebookingId),
        item.totalStudents || 1,
        escapeCsv(studentNames),
        escapeCsv(standards),
        escapeCsv(schools),
        escapeCsv(item.fatherName),
        escapeCsv(item.motherName || ''),
        escapeCsv(item.fatherPhone),
        escapeCsv(item.motherPhone || ''),
        escapeCsv(item.email),
        escapeCsv(item.address),
        item.amountPerStudent || 1000,
        item.totalAmount || 1000,
        escapeCsv(item.paymentMethod),
        escapeCsv(item.paymentStatus),
        escapeCsv(item.orderId || ''),
        escapeCsv(item.utr || ''),
        escapeCsv(item.status),
        item.emailSent ? 'Yes' : 'No',
        escapeCsv(item.createdAt ? new Date(item.createdAt).toISOString() : ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // =========================================================================
  // 10. ADMIN: FIND ALL WITH PAGINATION, SEARCH & FILTERS
  // =========================================================================
  async findAll(query: QueryAiExplorerPrebookingDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isActive: true };

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { 'students.studentName': { $regex: s, $options: 'i' } },
        { prebookingId: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { 'students.school': { $regex: s, $options: 'i' } },
        { fatherName: { $regex: s, $options: 'i' } },
        { motherName: { $regex: s, $options: 'i' } },
        { fatherPhone: { $regex: s, $options: 'i' } },
        { motherPhone: { $regex: s, $options: 'i' } },
        { orderId: { $regex: s, $options: 'i' } },
        { utr: { $regex: s, $options: 'i' } },
      ];
    }

    if (query.standard && query.standard.trim()) {
      filter['students.standard'] = { $regex: query.standard.trim(), $options: 'i' };
    }

    if (query.paymentStatus && query.paymentStatus.trim()) {
      filter.paymentStatus = query.paymentStatus.trim().toUpperCase();
    }

    if (query.status && query.status.trim()) {
      filter.status = query.status.trim().toUpperCase();
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [total, items] = await Promise.all([
      this.prebookingModel.countDocuments(filter),
      this.prebookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
  // 11. ADMIN: FIND ONE BY ID
  // =========================================================================
  async findOne(id: string) {
    const cleanId = (id || '').trim();
    let prebooking: AiExplorerPrebookingDocument | null = null;

    if (Types.ObjectId.isValid(cleanId)) {
      prebooking = await this.prebookingModel.findById(cleanId);
    }
    if (!prebooking) {
      prebooking = await this.prebookingModel.findOne({
        $or: [{ prebookingId: cleanId.toUpperCase() }, { orderId: cleanId }],
      });
    }

    if (!prebooking) {
      throw new NotFoundException(`Pre-booking not found for identifier: ${cleanId}`);
    }

    return {
      success: true,
      data: prebooking,
    };
  }

  // =========================================================================
  // 12. ADMIN: UPDATE PRE-BOOKING
  // =========================================================================
  async update(id: string, dto: UpdateAiExplorerPrebookingDto) {
    const cleanId = (id || '').trim();
    let prebooking: AiExplorerPrebookingDocument | null = null;

    if (Types.ObjectId.isValid(cleanId)) {
      prebooking = await this.prebookingModel.findById(cleanId);
    }
    if (!prebooking) {
      prebooking = await this.prebookingModel.findOne({ prebookingId: cleanId.toUpperCase() });
    }

    if (!prebooking) {
      throw new NotFoundException(`Pre-booking not found with ID: ${cleanId}`);
    }

    if (dto.paymentStatus) {
      prebooking.paymentStatus = dto.paymentStatus.toUpperCase() as AiPrebookingPaymentStatus;
    }
    if (dto.status) {
      prebooking.status = dto.status.toUpperCase() as AiPrebookingStatus;
    }
    if (dto.adminNotes !== undefined) {
      prebooking.adminNotes = dto.adminNotes;
    }
    if (dto.utr) {
      prebooking.utr = dto.utr;
    }
    if (dto.paymentMethod) {
      prebooking.paymentMethod = dto.paymentMethod;
    }
    if (dto.totalAmount !== undefined) {
      prebooking.totalAmount = dto.totalAmount;
    }
    if (dto.fatherPhone) {
      prebooking.fatherPhone = dto.fatherPhone;
    }
    if (dto.motherPhone) {
      prebooking.motherPhone = dto.motherPhone;
    }
    if (dto.email) {
      prebooking.email = dto.email.toLowerCase().trim();
    }
    if (dto.address) {
      prebooking.address = dto.address;
    }
    if (dto.isActive !== undefined) {
      prebooking.isActive = dto.isActive;
    }

    const updated = await prebooking.save();
    return {
      success: true,
      message: 'Pre-booking updated successfully',
      data: updated,
    };
  }

  // =========================================================================
  // 13. ADMIN: REMOVE / DELETE PRE-BOOKING
  // =========================================================================
  async remove(id: string) {
    const cleanId = (id || '').trim();
    let prebooking: AiExplorerPrebookingDocument | null = null;

    if (Types.ObjectId.isValid(cleanId)) {
      prebooking = await this.prebookingModel.findById(cleanId);
    }
    if (!prebooking) {
      prebooking = await this.prebookingModel.findOne({ prebookingId: cleanId.toUpperCase() });
    }

    if (!prebooking) {
      throw new NotFoundException(`Pre-booking not found with ID: ${cleanId}`);
    }

    prebooking.isActive = false;
    await prebooking.save();

    return {
      success: true,
      message: 'Pre-booking removed successfully',
    };
  }

  // =========================================================================
  // 14. ADMIN: RESEND CONFIRMATION EMAIL
  // =========================================================================
  async resendConfirmationEmail(id: string, overrideEmail?: string) {
    const result = await this.findOne(id);
    const prebooking = result.data;

    const targetEmail = (overrideEmail || prebooking.email || '').trim().toLowerCase();
    if (!targetEmail) {
      throw new BadRequestException('No valid email address found to dispatch confirmation email');
    }

    const sent = await this.notificationsService.sendAiExplorerPrebookingConfirmationEmail({
      email: targetEmail,
      prebookingId: prebooking.prebookingId,
      students: prebooking.students,
      totalStudents: prebooking.totalStudents,
      amountPerStudent: prebooking.amountPerStudent,
      totalAmount: prebooking.totalAmount,
      fatherName: prebooking.fatherName,
      motherName: prebooking.motherName,
      fatherPhone: prebooking.fatherPhone,
      motherPhone: prebooking.motherPhone,
      address: prebooking.address,
      paymentMethod: prebooking.paymentMethod,
      paymentStatus: prebooking.paymentStatus,
      utr: prebooking.utr,
      orderId: prebooking.orderId,
      createdAt: (prebooking as any).createdAt,
    });

    if (sent) {
      await this.prebookingModel.updateOne(
        { _id: prebooking._id },
        { $set: { emailSent: true, emailSentAt: new Date() } },
      );
    }

    return {
      success: sent,
      message: sent
        ? `Confirmation email successfully sent to ${targetEmail}`
        : `Failed to deliver email to ${targetEmail}`,
    };
  }
}
