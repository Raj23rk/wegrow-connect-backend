import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  SingAlongPayment,
  SingAlongPaymentDocument,
  SingAlongPaymentStatus,
} from './schemas/sing-along-payment.schema';
import {
  SingAlongBooking,
  SingAlongBookingDocument,
  SingAlongBookingStatus,
} from './schemas/sing-along-booking.schema';
import {
  CreateSingPaymentOrderDto,
  SubmitSingUtrDto,
} from './dto/create-sing-payment-order.dto';

@Injectable()
export class SingPaymentService {
  private readonly logger = new Logger(SingPaymentService.name);

  constructor(
    @InjectModel(SingAlongPayment.name)
    private readonly paymentModel: Model<SingAlongPaymentDocument>,
    @InjectModel(SingAlongBooking.name)
    private readonly bookingModel: Model<SingAlongBookingDocument>,
    private readonly configService: ConfigService,
  ) {}

  // =========================================================================
  // PAYU CREDENTIAL HELPERS
  // =========================================================================
  private getPayuKey(): string {
    return (
      this.configService.get<string>('PAYU_MERCHANT_KEY') ||
      process.env.PAYU_MERCHANT_KEY ||
      'dBVOrW'
    ).trim();
  }

  private getPayuSalt(): string {
    return (
      this.configService.get<string>('PAYU_MERCHANT_SALT') ||
      process.env.PAYU_MERCHANT_SALT ||
      '12chTfEGligkVxqCSomXnbWvYx0ZPJl6'
    ).trim();
  }

  private getPayuEnv(): string {
    return (
      this.configService.get<string>('PAYU_ENV') ||
      process.env.PAYU_ENV ||
      'TEST'
    )
      .trim()
      .toUpperCase();
  }

  private getPayuPaymentUrl(): string {
    return this.getPayuEnv() === 'PROD'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment';
  }

  private getPayuPostServiceUrl(): string {
    return this.getPayuEnv() === 'PROD'
      ? 'https://info.payu.in/merchant/postservice?form=2'
      : 'https://test.payu.in/merchant/postservice?form=2';
  }

  /**
   * Generate PayU Request Hash (SHA-512)
   * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
   */
  generatePayuHash(
    txnid: string,
    amount: string,
    productinfo: string,
    firstname: string,
    email: string,
    udf1: string = '',
    udf2: string = '',
  ): string {
    const key = this.getPayuKey();
    const salt = this.getPayuSalt();
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|||||||||${salt}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Verify PayU Response Hash (SHA-512)
   * Formula: sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
   */
  verifyPayuResponseHash(body: Record<string, any>): boolean {
    const key = this.getPayuKey();
    const salt = this.getPayuSalt();
    const status = body.status || '';
    const txnid = body.txnid || '';
    const amount = body.amount || '';
    const productinfo = body.productinfo || '';
    const firstname = body.firstname || '';
    const email = body.email || '';
    const udf1 = body.udf1 || '';
    const udf2 = body.udf2 || '';
    const udf3 = body.udf3 || '';
    const udf4 = body.udf4 || '';
    const udf5 = body.udf5 || '';
    const additionalCharges = body.additionalCharges;

    let hashSequence = '';
    if (additionalCharges) {
      hashSequence = `${additionalCharges}|${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    } else {
      hashSequence = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    }

    const calculatedHash = crypto
      .createHash('sha512')
      .update(hashSequence)
      .digest('hex');

    return (
      calculatedHash.toLowerCase() === (body.hash || '').toLowerCase()
    );
  }

  /**
   * Generate an 8-character booking ID like SA26-4821
   */
  private generateBookingId(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `SA26-${randomNum}`;
  }

  // =========================================================================
  // 1. CREATE PAYMENT ORDER (Frontend calls this on "Pay ₹254 Now")
  // =========================================================================
  async createOrder(dto: CreateSingPaymentOrderDto) {
    const fullName = (dto.fullName || '').trim();
    if (!fullName) {
      throw new BadRequestException('Full name is required.');
    }

    const phone = (dto.phone || '').trim();
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      throw new BadRequestException(
        'A valid 10-digit Indian mobile number is required.',
      );
    }

    const ticketQty = Math.max(1, Math.min(10, Number(dto.ticketQty) || 1));
    // Default to ₹254 (or custom amount if passed)
    const totalAmount =
      dto.amount && Number(dto.amount) > 0
        ? Number(dto.amount)
        : ticketQty * 254;
    const unitPrice = Math.round(totalAmount / ticketQty);
    const amountStr = totalAmount.toFixed(2);
    const email = dto.email ? dto.email.toLowerCase().trim() : 'guest@wegrowbschool.in';
    const eventId = (dto.eventId || 'SINGALONG-SEP-13-2026').trim();

    // 1. Generate unique booking reference and PayU Transaction ID (txnid)
    const bookingId = this.generateBookingId();
    const txnid = `SA26_${Date.now()}`;
    const productinfo = `Sing Along ${ticketQty} Pass`;

    // 2. Pre-create booking in DB with PENDING_VERIFICATION status
    await this.bookingModel.create({
      bookingId,
      fullName,
      phone,
      email,
      ticketQty,
      unitPrice,
      totalAmount,
      orderId: txnid,
      status: SingAlongBookingStatus.PENDING_VERIFICATION,
      eventId,
      attended: false,
      isActive: true,
      paymentMethod: 'PAYU',
      notes: dto.notes || `Pending PayU payment for ${txnid}`,
    });

    // 3. Callback URLs
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://www.wegrowbschool.in';

    const surl = 'https://wegrow-connect-backend-1.onrender.com/api/v1/sing-payment/payu-callback';
    const furl = 'https://wegrow-connect-backend-1.onrender.com/api/v1/sing-payment/payu-callback';

    // 4. Generate PayU Hash
    const key = this.getPayuKey();
    const hash = this.generatePayuHash(
      txnid,
      amountStr,
      productinfo,
      fullName,
      email,
      bookingId,
      String(ticketQty),
    );

    // 5. Save payment record in DB
    await this.paymentModel.create({
      orderId: txnid,
      bookingId,
      amount: totalAmount,
      currency: 'INR',
      status: SingAlongPaymentStatus.PENDING,
      customer: { name: fullName, phone, email },
      metadata: {
        eventId,
        ticketQty,
        productinfo,
        payuKey: key,
      },
    });

    const actionUrl = this.getPayuPaymentUrl();

    return {
      orderId: txnid,
      txnid,
      bookingId,
      amount: totalAmount,
      currency: 'INR',
      action: actionUrl,
      params: {
        key,
        txnid,
        amount: amountStr,
        productinfo,
        firstname: fullName,
        email,
        phone,
        surl,
        furl,
        hash,
        udf1: bookingId,
        udf2: String(ticketQty),
      },
      customer: { name: fullName, phone, email },
    };
  }

  // =========================================================================
  // 2. PAYU WEBHOOK & CALLBACK HANDLER
  // Target: POST /api/v1/sing-payment/webhook
  // Target: POST /api/v1/sing-payment/payu-callback
  // =========================================================================
  async handlePayuCallback(body: Record<string, any>) {
    this.logger.log('PayU Callback/Webhook received:', JSON.stringify(body));

    const txnid = body.txnid || '';
    const status = body.status || '';
    const mihpayid = body.mihpayid || '';
    const bankRefNum = body.bank_ref_num || mihpayid;
    const mode = body.mode || 'PAYU';
    const bookingId = body.udf1 || '';

    if (!txnid) {
      return { status: 'IGNORED', message: 'No txnid provided' };
    }

    const isHashValid = this.verifyPayuResponseHash(body);
    if (!isHashValid) {
      this.logger.warn(`Invalid PayU hash for txnid: ${txnid}`);
    }

    if (status.toLowerCase() === 'success') {
      this.logger.log(`PayU Payment SUCCESS for txnid: ${txnid}`);

      // 1. Update Payment status to SUCCESS
      await this.paymentModel.findOneAndUpdate(
        { orderId: txnid },
        {
          status: SingAlongPaymentStatus.SUCCESS,
          cfPaymentId: mihpayid,
          utr: bankRefNum,
          paymentMethod: `PAYU (${mode})`,
          webhookPayload: body,
        },
      );

      // 2. Update Booking status to CONFIRMED
      const bookingQuery = bookingId
        ? { bookingId }
        : { orderId: txnid };

      const booking = await this.bookingModel.findOneAndUpdate(
        bookingQuery,
        {
          status: SingAlongBookingStatus.CONFIRMED,
          utr: bankRefNum,
          paymentMethod: `PAYU (${mode})`,
          notes: `Confirmed via PayU (PayU ID: ${mihpayid}, Ref: ${bankRefNum})`,
        },
        { new: true },
      );

      return {
        status: 'SUCCESS',
        txnid,
        bookingId: booking?.bookingId,
        message: 'Payment confirmed and ticket activated successfully',
      };
    } else {
      this.logger.warn(`PayU Payment FAILED for txnid: ${txnid} (Status: ${status})`);

      await this.paymentModel.findOneAndUpdate(
        { orderId: txnid },
        {
          status: SingAlongPaymentStatus.FAILED,
          cfPaymentId: mihpayid,
          webhookPayload: body,
        },
      );

      return {
        status: 'FAILED',
        txnid,
        message: `PayU payment status: ${status}`,
      };
    }
  }

  // =========================================================================
  // 3. CHECK PAYMENT STATUS / REAL-TIME VERIFY
  // Target: GET /api/v1/sing-payment/status/:orderId
  // Target: POST /api/v1/sing-payment/verify
  // =========================================================================
  async getPaymentStatus(orderId: string) {
    if (!orderId) {
      throw new BadRequestException('Order ID / Transaction ID is required');
    }

    // 1. Check local Payment & Booking records
    let payment = await this.paymentModel.findOne({ orderId });
    let booking = payment
      ? await this.bookingModel.findOne({ bookingId: payment.bookingId })
      : await this.bookingModel.findOne({ orderId });

    if (!payment && !booking) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    // 2. If already marked SUCCESS, return confirmed result immediately
    if (
      payment?.status === SingAlongPaymentStatus.SUCCESS ||
      booking?.status === SingAlongBookingStatus.CONFIRMED
    ) {
      return {
        success: true,
        isPaid: true,
        status: 'SUCCESS',
        orderId,
        booking: {
          id: booking?._id,
          bookingId: booking?.bookingId,
          fullName: booking?.fullName,
          phone: booking?.phone,
          email: booking?.email,
          ticketQty: booking?.ticketQty,
          totalAmount: booking?.totalAmount,
          status: booking?.status,
          utr: booking?.utr,
          verificationToken: booking
            ? `SINGALONG-VERIFY:${booking.bookingId}`
            : '',
        },
      };
    }

    // 3. If still pending, call PayU verify_payment Server-to-Server API
    const key = this.getPayuKey();
    const salt = this.getPayuSalt();

    if (key && salt) {
      try {
        const command = 'verify_payment';
        const hashStr = `${key}|${command}|${orderId}|${salt}`;
        const hash = crypto.createHash('sha512').update(hashStr).digest('hex');

        const params = new URLSearchParams({
          key,
          command,
          var1: orderId,
          hash,
        });

        const postServiceUrl = this.getPayuPostServiceUrl();
        const response = await fetch(postServiceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        if (response.ok) {
          const data = await response.json();
          const txnDetails = data?.transaction_details?.[orderId];

          if (txnDetails && txnDetails.status?.toLowerCase() === 'success') {
            this.logger.log(`PayU verify_payment confirmed SUCCESS for ${orderId}`);

            const mihpayid = txnDetails.mihpayid || '';
            const bankRefNum = txnDetails.bank_ref_num || mihpayid;
            const mode = txnDetails.mode || 'PAYU';

            payment = await this.paymentModel.findOneAndUpdate(
              { orderId },
              {
                status: SingAlongPaymentStatus.SUCCESS,
                cfPaymentId: mihpayid,
                utr: bankRefNum,
                paymentMethod: `PAYU (${mode})`,
              },
              { new: true },
            );

            booking = await this.bookingModel.findOneAndUpdate(
              payment ? { bookingId: payment.bookingId } : { orderId },
              {
                status: SingAlongBookingStatus.CONFIRMED,
                utr: bankRefNum,
                paymentMethod: `PAYU (${mode})`,
                notes: `Confirmed via PayU Real-Time Check (Ref: ${bankRefNum})`,
              },
              { new: true },
            );

            return {
              success: true,
              isPaid: true,
              status: 'SUCCESS',
              orderId,
              booking: {
                id: booking?._id,
                bookingId: booking?.bookingId,
                fullName: booking?.fullName,
                phone: booking?.phone,
                email: booking?.email,
                ticketQty: booking?.ticketQty,
                totalAmount: booking?.totalAmount,
                status: booking?.status,
                utr: booking?.utr,
                verificationToken: booking
                  ? `SINGALONG-VERIFY:${booking.bookingId}`
                  : '',
              },
            };
          }
        }
      } catch (err) {
        this.logger.warn(`PayU verify_payment check failed for ${orderId}:`, err);
      }
    }

    return {
      success: true,
      isPaid: false,
      status: payment?.status || 'PENDING',
      orderId,
    };
  }

  // =========================================================================
  // 4. SUBMIT MANUAL UPI UTR / TRANSACTION ID (From Image 1: GPay QR)
  // Target: POST /api/v1/sing-payment/submit-utr
  // =========================================================================
  async submitUtr(dto: SubmitSingUtrDto) {
    const utr = (dto.utr || '').trim();
    if (!utr) {
      throw new BadRequestException(
        'UPI Transaction ID / UTR number is required.',
      );
    }

    // 1. If existing orderId or bookingId is passed, update that record
    if (dto.orderId || dto.bookingId) {
      const query = dto.orderId
        ? { orderId: dto.orderId }
        : { bookingId: dto.bookingId };

      let booking = await this.bookingModel.findOne(query);

      if (booking) {
        booking = await this.bookingModel.findOneAndUpdate(
          { _id: booking._id },
          {
            utr,
            paymentScreenshot: dto.paymentScreenshot || booking.paymentScreenshot,
            paymentMethod: dto.paymentMethod || 'Scan GPay QR (Manual UTR)',
            status: SingAlongBookingStatus.CONFIRMED,
            notes: `Manual UPI UTR submitted: ${utr}`,
          },
          { new: true },
        );

        if (dto.orderId) {
          await this.paymentModel.findOneAndUpdate(
            { orderId: dto.orderId },
            {
              utr,
              status: SingAlongPaymentStatus.SUCCESS,
              paymentMethod: 'UPI_MANUAL_QR',
            },
          );
        }

        return {
          success: true,
          message: 'UPI Transaction ID / UTR submitted successfully',
          booking: {
            id: booking?._id,
            bookingId: booking?.bookingId,
            fullName: booking?.fullName,
            phone: booking?.phone,
            email: booking?.email,
            ticketQty: booking?.ticketQty,
            totalAmount: booking?.totalAmount,
            status: booking?.status,
            utr: booking?.utr,
            verificationToken: `SINGALONG-VERIFY:${booking?.bookingId}`,
          },
        };
      }
    }

    // 2. Otherwise create fresh booking with UTR
    const fullName = (dto.fullName || '').trim();
    const phone = (dto.phone || '').trim();

    if (!fullName || !phone) {
      throw new BadRequestException(
        'Full name and 10-digit mobile number are required along with UTR.',
      );
    }

    const ticketQty = Math.max(1, Math.min(10, Number(dto.ticketQty) || 1));
    const totalAmount =
      dto.amount && Number(dto.amount) > 0
        ? Number(dto.amount)
        : ticketQty * 254;
    const unitPrice = Math.round(totalAmount / ticketQty);
    const bookingId = this.generateBookingId();

    const booking = await this.bookingModel.create({
      bookingId,
      fullName,
      phone,
      email: dto.email ? dto.email.trim().toLowerCase() : '',
      ticketQty,
      unitPrice,
      totalAmount,
      utr,
      paymentScreenshot: dto.paymentScreenshot || '',
      paymentMethod: dto.paymentMethod || 'ashokbcasvk45@oksbi',
      status: SingAlongBookingStatus.CONFIRMED,
      eventId: 'SINGALONG-SEP-13-2026',
      attended: false,
      isActive: true,
      notes: `Manual GPay QR payment verified with UTR: ${utr}`,
    });

    return {
      success: true,
      message: 'Tickets booked and UPI Transaction ID recorded successfully',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        fullName: booking.fullName,
        phone: booking.phone,
        email: booking.email,
        ticketQty: booking.ticketQty,
        totalAmount: booking.totalAmount,
        status: booking.status,
        utr: booking.utr,
        verificationToken: `SINGALONG-VERIFY:${booking.bookingId}`,
      },
    };
  }
}
