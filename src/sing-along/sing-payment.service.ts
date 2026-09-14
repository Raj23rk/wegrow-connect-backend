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

  private getAppId(): string {
    return (
      this.configService.get<string>('CASHFREE_APP_ID') ||
      process.env.CASHFREE_APP_ID ||
      ''
    ).trim();
  }

  private getSecretKey(): string {
    return (
      this.configService.get<string>('CASHFREE_SECRET_KEY') ||
      process.env.CASHFREE_SECRET_KEY ||
      ''
    ).trim();
  }

  private getApiVersion(): string {
    return (
      this.configService.get<string>('CASHFREE_API_VERSION') ||
      process.env.CASHFREE_API_VERSION ||
      '2023-08-01'
    ).trim();
  }

  private getBaseUrl(): string {
    const env = (
      this.configService.get<string>('CASHFREE_ENV') ||
      process.env.CASHFREE_ENV ||
      'TEST'
    )
      .trim()
      .toUpperCase();
    return env === 'PROD'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  /**
   * Generate an 8-character booking ID like SA26-4821
   */
  private generateBookingId(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `SA26-${randomNum}`;
  }

  // =========================================================================
  // 1. CREATE PAYMENT ORDER (Frontend calls this on "Pay Now")
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
    const unitPrice = 199;
    const totalAmount = ticketQty * unitPrice;
    const email = dto.email ? dto.email.toLowerCase().trim() : '';
    const eventId = (dto.eventId || 'SINGALONG-SEP-13-2026').trim();

    // 1. Generate unique booking reference and order ID
    const bookingId = this.generateBookingId();
    const orderId = `order_SA26_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    // 2. Pre-create booking in DB with PENDING_VERIFICATION status
    const booking = await this.bookingModel.create({
      bookingId,
      fullName,
      phone,
      email,
      ticketQty,
      unitPrice,
      totalAmount,
      orderId,
      status: SingAlongBookingStatus.PENDING_VERIFICATION,
      eventId,
      attended: false,
      isActive: true,
      paymentMethod: 'CASHFREE',
      notes: dto.notes || `Pending Cashfree payment for order ${orderId}`,
    });

    // 3. Call Cashfree Orders API
    const appId = this.getAppId();
    const secretKey = this.getSecretKey();

    if (!appId || !secretKey) {
      this.logger.warn(
        'CASHFREE_APP_ID or CASHFREE_SECRET_KEY is not configured in .env. Creating pending order in local DB.',
      );

      // Save local pending payment record so test flows still function
      await this.paymentModel.create({
        orderId,
        bookingId,
        amount: totalAmount,
        currency: 'INR',
        status: SingAlongPaymentStatus.PENDING,
        customer: { name: fullName, phone, email },
        metadata: { eventId, ticketQty },
      });

      return {
        orderId,
        paymentSessionId: `mock_session_${Date.now()}`,
        bookingId,
        amount: totalAmount,
        currency: 'INR',
        customer: { name: fullName, phone, email },
        mock: true,
        message:
          'Cashfree credentials not configured. Please set CASHFREE_APP_ID & CASHFREE_SECRET_KEY in .env.',
      };
    }

    const baseUrl = this.getBaseUrl();
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://www.wegrowbschool.in';

    const orderPayload = {
      order_id: orderId,
      order_amount: totalAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: `cust_${phone}`,
        customer_name: fullName,
        customer_phone: phone,
        customer_email: email || 'bookings@wegrowbschool.in',
      },
      order_meta: {
        return_url: `${frontendUrl}/sing-along?order_id={order_id}`,
        notify_url:
          'https://wegrow-connect-backend-1.onrender.com/api/v1/sing-payment/webhook',
      },
      order_note: `Sing Along - ${ticketQty} Ticket(s) (${bookingId})`,
    };

    try {
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': this.getApiVersion(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const cfData = await response.json();

      if (!response.ok) {
        this.logger.error('Cashfree Create Order Error:', cfData);
        throw new BadRequestException(
          cfData.message || 'Failed to initialize Cashfree payment order',
        );
      }

      // 4. Save Payment Record in DB
      await this.paymentModel.create({
        orderId,
        cfOrderId: cfData.cf_order_id ? String(cfData.cf_order_id) : '',
        paymentSessionId: cfData.payment_session_id,
        bookingId,
        amount: totalAmount,
        currency: 'INR',
        status: SingAlongPaymentStatus.PENDING,
        customer: { name: fullName, phone, email },
        metadata: { eventId, ticketQty, cfResponse: cfData },
      });

      return {
        orderId,
        cfOrderId: cfData.cf_order_id,
        paymentSessionId: cfData.payment_session_id,
        bookingId,
        amount: totalAmount,
        currency: 'INR',
        customer: { name: fullName, phone, email },
      };
    } catch (err: any) {
      this.logger.error('Error creating Cashfree order:', err);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Could not communicate with Cashfree PG',
      );
    }
  }

  // =========================================================================
  // 2. VERIFY CASHFREE WEBHOOK SIGNATURE
  // =========================================================================
  verifySignature(
    rawBody: string | Buffer,
    timestamp: string,
    signature: string,
  ): boolean {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      this.logger.warn(
        'CASHFREE_SECRET_KEY not set. Skipping webhook signature verification.',
      );
      return true;
    }

    if (!timestamp || !signature) {
      return false;
    }

    try {
      const bodyStr = Buffer.isBuffer(rawBody)
        ? rawBody.toString('utf8')
        : typeof rawBody === 'string'
          ? rawBody
          : JSON.stringify(rawBody);

      const generatedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(timestamp + bodyStr)
        .digest('base64');

      return (
        crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(generatedSignature),
        ) || signature === generatedSignature
      );
    } catch (err: any) {
      this.logger.error('Error verifying webhook signature:', err);
      return false;
    }
  }

  // =========================================================================
  // 3. CASHFREE WEBHOOK HANDLER
  // Target: POST /api/v1/sing-payment/webhook
  // =========================================================================
  async handleWebhook(
    body: any,
    rawBody: any,
    headers: Record<string, string | undefined>,
  ) {
    this.logger.log('Cashfree Webhook received:', JSON.stringify(body));

    const timestamp =
      headers['x-webhook-timestamp'] ||
      headers['x-webhook-timestamp'.toLowerCase()] ||
      '';
    const signature =
      headers['x-webhook-signature'] ||
      headers['x-webhook-signature'.toLowerCase()] ||
      '';

    if (rawBody && timestamp && signature) {
      const isValid = this.verifySignature(rawBody, timestamp, signature);
      if (!isValid) {
        this.logger.warn('Invalid Cashfree Webhook Signature detected');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const data = body?.data;
    const eventType = body?.type || '';

    // Extract Order ID & Status
    const orderId =
      data?.order?.order_id ||
      data?.order_id ||
      body?.order_id ||
      '';

    if (!orderId) {
      this.logger.warn('No orderId found in Cashfree Webhook payload');
      return { status: 'IGNORED', message: 'No orderId provided' };
    }

    const paymentData = data?.payment || {};
    const paymentStatus =
      paymentData.payment_status ||
      data?.order?.order_status ||
      (eventType.includes('SUCCESS') || eventType.includes('PAID')
        ? 'SUCCESS'
        : 'PENDING');

    const cfPaymentId = String(paymentData.cf_payment_id || '');
    const utr =
      paymentData.bank_reference ||
      paymentData.payment_utr ||
      cfPaymentId;
    const paymentMethod =
      paymentData.payment_group ||
      (paymentData.payment_method?.upi ? 'UPI' : 'CASHFREE');

    if (
      paymentStatus === 'SUCCESS' ||
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventType === 'ORDER_PAID_WEBHOOK'
    ) {
      this.logger.log(`Payment SUCCESS for order: ${orderId}`);

      // 1. Update Payment record to SUCCESS
      const payment = await this.paymentModel.findOneAndUpdate(
        { orderId },
        {
          status: SingAlongPaymentStatus.SUCCESS,
          cfPaymentId,
          utr,
          paymentMethod,
          webhookPayload: body,
        },
        { new: true },
      );

      // 2. Update linked Booking record to CONFIRMED
      const bookingQuery = payment
        ? { bookingId: payment.bookingId }
        : { orderId };

      const booking = await this.bookingModel.findOneAndUpdate(
        bookingQuery,
        {
          status: SingAlongBookingStatus.CONFIRMED,
          utr,
          paymentMethod: `CASHFREE (${paymentMethod.toUpperCase()})`,
          notes: `Confirmed via Cashfree Webhook (UTR: ${utr})`,
        },
        { new: true },
      );

      return {
        status: 'SUCCESS',
        orderId,
        bookingId: booking?.bookingId,
        message: 'Payment confirmed and ticket activated successfully',
      };
    } else if (
      paymentStatus === 'FAILED' ||
      eventType === 'PAYMENT_FAILED_WEBHOOK'
    ) {
      this.logger.warn(`Payment FAILED for order: ${orderId}`);

      await this.paymentModel.findOneAndUpdate(
        { orderId },
        {
          status: SingAlongPaymentStatus.FAILED,
          cfPaymentId,
          webhookPayload: body,
        },
      );

      return {
        status: 'FAILED',
        orderId,
        message: 'Payment marked as failed',
      };
    }

    return {
      status: 'RECEIVED',
      orderId,
      message: `Webhook received with event: ${eventType}`,
    };
  }

  // =========================================================================
  // 4. CHECK PAYMENT STATUS / VERIFY (Used by frontend polling & check)
  // Target: GET /api/v1/sing-payment/status/:orderId
  // Target: POST /api/v1/sing-payment/verify
  // =========================================================================
  async getPaymentStatus(orderId: string) {
    if (!orderId) {
      throw new BadRequestException('Order ID is required');
    }

    // 1. Check local Payment record
    let payment = await this.paymentModel.findOne({ orderId });
    let booking = payment
      ? await this.bookingModel.findOne({ bookingId: payment.bookingId })
      : await this.bookingModel.findOne({ orderId });

    if (!payment && !booking) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    // 2. If already marked SUCCESS, return confirmed result
    if (payment?.status === SingAlongPaymentStatus.SUCCESS) {
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

    // 3. If still pending, directly query Cashfree API to verify real-time status
    const appId = this.getAppId();
    const secretKey = this.getSecretKey();

    if (appId && secretKey) {
      try {
        const baseUrl = this.getBaseUrl();
        const response = await fetch(`${baseUrl}/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': this.getApiVersion(),
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const cfOrder = await response.json();

          if (cfOrder.order_status === 'PAID') {
            this.logger.log(
              `Direct Cashfree check confirmed PAID for order: ${orderId}`,
            );

            // Fetch payment details to grab bank UTR if available
            let utr = '';
            let paymentGroup = 'UPI';
            let cfPaymentId = '';

            try {
              const paymentsRes = await fetch(
                `${baseUrl}/orders/${orderId}/payments`,
                {
                  method: 'GET',
                  headers: {
                    'x-client-id': appId,
                    'x-client-secret': secretKey,
                    'x-api-version': this.getApiVersion(),
                  },
                },
              );
              if (paymentsRes.ok) {
                const payments = await paymentsRes.json();
                const successPayment = Array.isArray(payments)
                  ? payments.find((p) => p.payment_status === 'SUCCESS')
                  : null;
                if (successPayment) {
                  cfPaymentId = String(successPayment.cf_payment_id || '');
                  utr =
                    successPayment.bank_reference ||
                    successPayment.payment_utr ||
                    cfPaymentId;
                  paymentGroup =
                    successPayment.payment_group ||
                    (successPayment.payment_method?.upi ? 'UPI' : 'CASHFREE');
                }
              }
            } catch (pErr) {
              this.logger.warn('Could not fetch Cashfree payments list:', pErr);
            }

            payment = await this.paymentModel.findOneAndUpdate(
              { orderId },
              {
                status: SingAlongPaymentStatus.SUCCESS,
                cfPaymentId,
                utr,
                paymentMethod: paymentGroup,
              },
              { new: true },
            );

            booking = await this.bookingModel.findOneAndUpdate(
              payment ? { bookingId: payment.bookingId } : { orderId },
              {
                status: SingAlongBookingStatus.CONFIRMED,
                utr,
                paymentMethod: `CASHFREE (${paymentGroup.toUpperCase()})`,
                notes: `Confirmed via direct status check (UTR: ${utr})`,
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
          } else if (cfOrder.order_status === 'EXPIRED') {
            await this.paymentModel.findOneAndUpdate(
              { orderId },
              { status: SingAlongPaymentStatus.CANCELLED },
            );
            return {
              success: true,
              isPaid: false,
              status: 'EXPIRED',
              orderId,
            };
          }
        }
      } catch (checkErr) {
        this.logger.warn(
          `Cashfree status check failed for ${orderId}:`,
          checkErr,
        );
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
  // 5. SUBMIT MANUAL UPI UTR / TRANSACTION ID
  // Target: POST /api/v1/sing-payment/submit-utr
  // Used when user scans GPay QR and enters 12-digit UTR manually
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
    const unitPrice = 199;
    const totalAmount = ticketQty * unitPrice;
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
      paymentMethod: dto.paymentMethod || 'kumarrk23dev-1@okaxis',
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
