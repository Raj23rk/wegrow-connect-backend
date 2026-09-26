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
import { SingAlongService } from './sing-along.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SingPaymentService {
  private readonly logger = new Logger(SingPaymentService.name);

  // Short-term in-memory cache for polling getPaymentStatus to protect DB & Gateway
  private statusPollingCache = new Map<
    string,
    { data: any; expiresAt: number }
  >();

  constructor(
    @InjectModel(SingAlongPayment.name)
    private readonly paymentModel: Model<SingAlongPaymentDocument>,
    @InjectModel(SingAlongBooking.name)
    private readonly bookingModel: Model<SingAlongBookingDocument>,
    private readonly configService: ConfigService,
    private readonly singAlongService: SingAlongService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper method to dispatch Sing Along ticket email asynchronously
   */
  async sendTicketEmailAsync(booking: any, force = false): Promise<boolean> {
    if (!booking || !booking.email) {
      this.logger.warn(
        `Cannot send ticket email: no email address for booking ${booking?.bookingId || 'UNKNOWN'}`,
      );
      return false;
    }

    if (booking.emailSent && !force) {
      this.logger.log(
        `Ticket email already sent previously for booking ${booking.bookingId}. (Set force=true to resend)`,
      );
      return true;
    }

    try {
      this.logger.log(
        `Dispatching Sing Along ticket email to ${booking.email} for booking ${booking.bookingId}`,
      );

      const success = await this.notificationsService.sendSingAlongTicketEmail({
        email: booking.email,
        fullName: booking.fullName || 'Guest Attendee',
        phone: booking.phone || '',
        bookingId: booking.bookingId,
        ticketQty: booking.ticketQty || 1,
        unitPrice: booking.unitPrice || 199,
        totalAmount: booking.totalAmount || 199,
        paymentMethod: booking.paymentMethod || 'CASHFREE',
        utr: booking.utr || '',
        orderId: booking.orderId || '',
        eventId: booking.eventId || 'SINGALONG-SEP-27-2026',
        verificationToken: `SINGALONG-VERIFY:${booking.bookingId}`,
      });

      if (success) {
        await this.bookingModel.updateOne(
          { bookingId: booking.bookingId },
          { $set: { emailSent: true } },
        );
        this.logger.log(
          `Ticket email successfully sent and recorded for booking ${booking.bookingId}`,
        );
      } else {
        this.logger.warn(
          `NotificationsService failed to send ticket email to ${booking.email}`,
        );
      }

      return success;
    } catch (err: any) {
      this.logger.error(
        `Failed to send ticket email for booking ${booking.bookingId}: ${err?.message}`,
        err?.stack,
      );
      return false;
    }
  }

  // =========================================================================
  // CASHFREE CREDENTIAL & CONFIG HELPERS
  // =========================================================================
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

  // =========================================================================
  // PAYU CREDENTIAL HELPERS (Legacy Fallback)
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

    return calculatedHash.toLowerCase() === (body.hash || '').toLowerCase();
  }

  // =========================================================================
  // 1. CREATE PAYMENT ORDER (Cashfree PG Order API)
  // Frontend receives paymentSessionId and opens Cashfree Checkout SDK
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
    const totalAmount =
      dto.amount && Number(dto.amount) > 0
        ? Number(dto.amount)
        : ticketQty * 254;
    const unitPrice = Math.round(totalAmount / ticketQty);
    const email = dto.email ? dto.email.toLowerCase().trim() : 'guest@wegrowbschool.in';
    const eventId = (dto.eventId || 'SINGALONG-SEP-27-2026').trim();


    // 1. High-speed atomic booking ID generation
    const bookingId = await this.singAlongService.generateBookingId();
    const orderId = `order_SA26_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    // 2. Pre-create booking in DB with PENDING_VERIFICATION status
    const bookingPromise = this.bookingModel.create({
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
      notes: dto.notes || `Pending Cashfree payment for ${orderId}`,
    });

    // 3. Callback URLs
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://www.wegrowbschool.in';

    const returnUrl = `${frontendUrl}/sing-along?order_id={order_id}`;
    const notifyUrl = 'https://wegrow-connect-backend-1.onrender.com/api/v1/sing-payment/webhook';

    // 4. Create Order on Cashfree with timeout signal
    const appId = this.getCashfreeAppId();
    const secretKey = this.getCashfreeSecretKey();
    const apiVersion = this.getCashfreeApiVersion();
    const baseUrl = this.getCashfreeBaseUrl();

    let cfOrder: any = null;
    try {
      this.logger.log(`Creating Cashfree order ${orderId} for ₹${totalAmount} (${phone})`);
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': apiVersion,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: totalAmount,
          order_currency: 'INR',
          customer_details: {
            customer_id: `cust_${phone.replace(/\D/g, '')}`,
            customer_name: fullName,
            customer_email: email,
            customer_phone: phone,
          },
          order_meta: {
            return_url: returnUrl,
            notify_url: notifyUrl,
          },
          order_note: `Sing Along ${ticketQty} Pass (${bookingId})`,
        }),
        signal: AbortSignal.timeout(8000), // 8s timeout to prevent hanging connections
      });

      if (!response.ok) {
        const errJson = await response.json();
        this.logger.error('Cashfree order creation error response:', errJson);
        throw new InternalServerErrorException(
          errJson?.message || 'Failed to create order on Cashfree',
        );
      }

      cfOrder = await response.json();
      this.logger.log(`Cashfree order created: ${cfOrder.order_id}, cfOrderId: ${cfOrder.cf_order_id}`);
    } catch (err: any) {
      this.logger.error('Failed to communicate with Cashfree PG:', err?.message || err);
      throw new InternalServerErrorException(
        err?.message || 'Unable to connect to Cashfree payment gateway',
      );
    }

    // 5. Ensure booking is created and save payment record in DB
    await Promise.all([
      bookingPromise,
      this.paymentModel.create({
        orderId,
        cfOrderId: cfOrder?.cf_order_id ? String(cfOrder.cf_order_id) : '',
        paymentSessionId: cfOrder?.payment_session_id || '',
        bookingId,
        amount: totalAmount,
        currency: 'INR',
        status: SingAlongPaymentStatus.PENDING,
        customer: { name: fullName, phone, email },
        metadata: {
          eventId,
          ticketQty,
          cfOrderId: cfOrder?.cf_order_id,
          paymentSessionId: cfOrder?.payment_session_id,
        },
      }),
    ]);

    const isProd = this.getCashfreeEnv() === 'PROD';

    return {
      orderId,
      txnid: orderId,
      bookingId,
      amount: totalAmount,
      currency: 'INR',
      paymentSessionId: cfOrder?.payment_session_id,
      cfOrderId: cfOrder?.cf_order_id,
      orderStatus: cfOrder?.order_status,
      environment: isProd ? 'production' : 'sandbox',
      paymentLink: `https://payments.cashfree.com/order/#${cfOrder?.payment_session_id}`,
      customer: { name: fullName, phone, email },
    };
  }

  // =========================================================================
  // 2. CASHFREE WEBHOOK HANDLER
  // Handles POST /api/v1/sing-payment AND POST /api/v1/sing-payment/webhook
  // Parallelized database updates for minimum latency
  // =========================================================================
  async handleCashfreeWebhook(
    body: Record<string, any>,
    signature?: string,
    timestamp?: string,
    rawReq?: any,
  ) {
    this.logger.log(`Cashfree Webhook received: ${JSON.stringify(body || {})}`);

    // If it's a test ping from Cashfree Dashboard
    if (
      !body ||
      Object.keys(body).length === 0 ||
      body.type === 'TEST_WEBHOOK' ||
      (!body.type && !body.data)
    ) {
      this.logger.log('Cashfree Test Webhook received and acknowledged successfully');
      return {
        status: 'SUCCESS',
        message: 'Cashfree test webhook received and acknowledged successfully',
      };
    }

    // Fallback: If payload looks like a legacy PayU callback
    if (body.txnid && !body.type && !body.data) {
      return this.handlePayuCallback(body);
    }

    // Cashfree Signature Verification (HMAC-SHA256)
    const secretKey = this.getCashfreeSecretKey();
    if (signature && timestamp && secretKey) {
      try {
        const rawPayload = timestamp + (rawReq?.rawBody || JSON.stringify(body));
        const expectedSignature = crypto
          .createHmac('sha256', secretKey)
          .update(rawPayload)
          .digest('base64');
        if (expectedSignature !== signature) {
          this.logger.warn(
            `Cashfree signature mismatch. Expected: ${expectedSignature}, Received: ${signature}`,
          );
        } else {
          this.logger.log('Cashfree signature verified successfully');
        }
      } catch (err: any) {
        this.logger.warn(`Failed to verify Cashfree signature: ${err?.message}`);
      }
    }

    const eventType = body.type || '';
    const orderData = body.data?.order || {};
    const paymentData = body.data?.payment || {};
    const orderId = orderData.order_id || '';
    const paymentStatus = paymentData.payment_status || '';
    const cfPaymentId = paymentData.cf_payment_id || '';
    const bankRef = paymentData.bank_reference || cfPaymentId;
    const paymentGroup = paymentData.payment_group || 'CASHFREE';
    const customerDetails = body.data?.customer_details || body.customer_details || {};
    const customerEmail = (customerDetails.customer_email || body.email || '').trim();
    const customerName = (customerDetails.customer_name || body.name || '').trim();
    const customerPhone = (customerDetails.customer_phone || body.phone || '').trim();

    if (!orderId) {
      this.logger.warn('Cashfree webhook received without order_id');
      return { status: 'IGNORED', message: 'No order_id in webhook payload' };
    }

    // Invalidate polling cache for this order
    this.statusPollingCache.delete(orderId);

    if (
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      paymentStatus.toUpperCase() === 'SUCCESS'
    ) {
      this.logger.log(`Cashfree Payment SUCCESS for order: ${orderId}`);

      // Parallelize payment and booking updates
      const [updatedPayment, booking] = await Promise.all([
        this.paymentModel.findOneAndUpdate(
          {
            $or: [
              { orderId },
              { bookingId: orderId },
              { cfOrderId: orderId },
              ...(orderId ? [{ 'customer.phone': orderId }] : []),
            ],
          },
          {
            status: SingAlongPaymentStatus.SUCCESS,
            cfPaymentId: String(cfPaymentId || ''),
            utr: String(bankRef || ''),
            paymentMethod: `CASHFREE (${paymentGroup})`,
            webhookPayload: body,
          },
          { new: true },
        ),
        this.bookingModel.findOneAndUpdate(
          { $or: [{ orderId }, { bookingId: orderId }] },
          {
            status: SingAlongBookingStatus.CONFIRMED,
            utr: String(bankRef || ''),
            paymentMethod: `CASHFREE (${paymentGroup})`,
            notes: `Confirmed via Cashfree Webhook (CF Payment ID: ${cfPaymentId}, Ref: ${bankRef})`,
            ...(customerEmail ? { email: customerEmail.toLowerCase().trim() } : {}),
            ...(customerName ? { fullName: customerName } : {}),
            ...(customerPhone ? { phone: customerPhone } : {}),
          },
          { new: true },
        ).lean(),
      ]);

      let confirmedBooking: any = booking;
      if (!confirmedBooking && updatedPayment?.bookingId) {
        confirmedBooking = await this.bookingModel.findOneAndUpdate(
          { bookingId: updatedPayment.bookingId },
          {
            status: SingAlongBookingStatus.CONFIRMED,
            utr: String(bankRef || ''),
            paymentMethod: `CASHFREE (${paymentGroup})`,
            notes: `Confirmed via Cashfree Webhook (CF Payment ID: ${cfPaymentId}, Ref: ${bankRef})`,
            ...(customerEmail ? { email: customerEmail.toLowerCase().trim() } : {}),
          },
          { new: true },
        ).lean();
      }

      // If booking was not found, auto-upsert booking record so no ticket is lost
      if (!confirmedBooking) {
        const bId =
          updatedPayment?.bookingId ||
          (orderId.startsWith('SA26-')
            ? orderId
            : await this.singAlongService.generateBookingId());

        const finalEmail = (
          customerEmail ||
          updatedPayment?.customer?.email ||
          ''
        )
          .toLowerCase()
          .trim();

        confirmedBooking = await this.bookingModel.findOneAndUpdate(
          { bookingId: bId },
          {
            $setOnInsert: {
              bookingId: bId,
              fullName:
                customerName || updatedPayment?.customer?.name || 'Guest Attendee',
              phone: customerPhone || updatedPayment?.customer?.phone || '',
              ticketQty: updatedPayment?.metadata?.ticketQty || 1,
              unitPrice: 199,
              totalAmount: Number(
                body?.data?.order?.order_amount || updatedPayment?.amount || 199,
              ),
              orderId: updatedPayment?.orderId || orderId,
              eventId: 'SINGALONG-SEP-27-2026',
              attended: false,
              isActive: true,
              emailSent: false,
            },
            $set: {
              status: SingAlongBookingStatus.CONFIRMED,
              utr: String(bankRef || ''),
              paymentMethod: `CASHFREE (${paymentGroup})`,
              notes: `Confirmed via Cashfree Webhook (CF Payment ID: ${cfPaymentId}, Ref: ${bankRef})`,
              ...(finalEmail ? { email: finalEmail } : {}),
            },
          },
          { new: true, upsert: true },
        ).lean();
      }

      // Generate & send ticket email asynchronously upon payment confirmation
      const shouldForceEmail = Boolean(body?.forceEmail || body?.resend);
      if (confirmedBooking?.email) {
        this.sendTicketEmailAsync(confirmedBooking, shouldForceEmail).catch((err) =>
          this.logger.error(`Error sending ticket email: ${err?.message}`),
        );
      } else {
        this.logger.warn(`No email found for confirmed booking ${confirmedBooking?.bookingId}`);
      }

      return {
        status: 'SUCCESS',
        orderId,
        bookingId: confirmedBooking?.bookingId,
        customerName: confirmedBooking?.fullName,
        customerEmail: confirmedBooking?.email,
        ticketQty: confirmedBooking?.ticketQty,
        totalAmount: confirmedBooking?.totalAmount,
        message: 'Payment confirmed and ticket activated successfully',
      };
    } else if (
      eventType === 'PAYMENT_FAILED_WEBHOOK' ||
      paymentStatus.toUpperCase() === 'FAILED'
    ) {
      this.logger.warn(`Cashfree Payment FAILED for order: ${orderId}`);

      await this.paymentModel.findOneAndUpdate(
        { orderId },
        {
          status: SingAlongPaymentStatus.FAILED,
          cfPaymentId: String(cfPaymentId || ''),
          webhookPayload: body,
        },
      );

      return {
        status: 'FAILED',
        orderId,
        message: `Cashfree payment failed: ${paymentData.payment_message || 'Payment not completed'}`,
      };
    } else if (eventType === 'USER_DROPPED_WEBHOOK') {
      this.logger.log(`Cashfree user dropped for order: ${orderId}`);
      await this.paymentModel.findOneAndUpdate(
        { orderId },
        {
          status: SingAlongPaymentStatus.USER_DROPPED,
          webhookPayload: body,
        },
      );
      return { status: 'USER_DROPPED', orderId };
    }

    return {
      status: 'PROCESSED',
      eventType,
      orderId,
    };
  }

  // =========================================================================
  // 3. PAYU WEBHOOK & CALLBACK HANDLER (Legacy Fallback)
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

    this.statusPollingCache.delete(txnid);

    const isHashValid = this.verifyPayuResponseHash(body);
    if (!isHashValid) {
      this.logger.warn(`Invalid PayU hash for txnid: ${txnid}`);
    }

    if (status.toLowerCase() === 'success') {
      this.logger.log(`PayU Payment SUCCESS for txnid: ${txnid}`);

      const bookingQuery = bookingId ? { bookingId } : { orderId: txnid };

      // Parallel updates
      const [, booking] = await Promise.all([
        this.paymentModel.findOneAndUpdate(
          { orderId: txnid },
          {
            status: SingAlongPaymentStatus.SUCCESS,
            cfPaymentId: mihpayid,
            utr: bankRefNum,
            paymentMethod: `PAYU (${mode})`,
            webhookPayload: body,
          },
        ),
        this.bookingModel.findOneAndUpdate(
          bookingQuery,
          {
            status: SingAlongBookingStatus.CONFIRMED,
            utr: bankRefNum,
            paymentMethod: `PAYU (${mode})`,
            notes: `Confirmed via PayU (PayU ID: ${mihpayid}, Ref: ${bankRefNum})`,
          },
          { new: true },
        ).lean(),
      ]);

      if (booking?.email && !booking.emailSent) {
        this.sendTicketEmailAsync(booking).catch((err) =>
          this.logger.error(`Error sending ticket email: ${err?.message}`),
        );
      }

      return {
        status: 'SUCCESS',
        txnid,
        bookingId: booking?.bookingId,
        message: 'Payment confirmed and ticket activated successfully',
      };
    } else {
      this.logger.warn(
        `PayU Payment FAILED for txnid: ${txnid} (Status: ${status})`,
      );

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
  // 4. CHECK PAYMENT STATUS / REAL-TIME VERIFY
  // Target: GET /api/v1/sing-payment/status/:orderId
  // Target: POST /api/v1/sing-payment/verify
  // Parallel lean lookups + short-term polling cache (sub-5ms when checked)
  // =========================================================================
  async getPaymentStatus(orderId: string) {
    if (!orderId) {
      throw new BadRequestException('Order ID / Transaction ID is required');
    }

    const now = Date.now();
    const cached = this.statusPollingCache.get(orderId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // 1. Parallel lean lookups in MongoDB
    let [payment, booking] = await Promise.all([
      this.paymentModel.findOne({ orderId }).lean(),
      this.bookingModel.findOne({ orderId }).lean(),
    ]);

    if (!booking && payment?.bookingId) {
      booking = await this.bookingModel
        .findOne({ bookingId: payment.bookingId })
        .lean();
    }

    if (!payment && !booking) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    // 2. If already marked SUCCESS, cache & return confirmed result immediately
    if (
      payment?.status === SingAlongPaymentStatus.SUCCESS ||
      booking?.status === SingAlongBookingStatus.CONFIRMED
    ) {
      const successResult = {
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
      this.statusPollingCache.set(orderId, {
        data: successResult,
        expiresAt: now + 60000, // Cache final success for 60s
      });
      return successResult;
    }

    // 3. Query Cashfree Orders API for real-time payment status
    const appId = this.getCashfreeAppId();
    const secretKey = this.getCashfreeSecretKey();
    const apiVersion = this.getCashfreeApiVersion();
    const baseUrl = this.getCashfreeBaseUrl();

    if (appId && secretKey) {
      try {
        const cfOrderRes = await fetch(`${baseUrl}/orders/${orderId}`, {
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': apiVersion,
          },
          signal: AbortSignal.timeout(6000), // 6s timeout
        });

        if (cfOrderRes.ok) {
          const cfOrder = await cfOrderRes.json();
          this.logger.log(`Cashfree order ${orderId} status: ${cfOrder?.order_status}`);

          if (cfOrder?.order_status === 'PAID') {
            let cfPaymentId = '';
            let bankRef = '';
            let paymentGroup = 'CASHFREE';

            try {
              const cfPayRes = await fetch(`${baseUrl}/orders/${orderId}/payments`, {
                headers: {
                  'x-client-id': appId,
                  'x-client-secret': secretKey,
                  'x-api-version': apiVersion,
                },
                signal: AbortSignal.timeout(5000),
              });
              if (cfPayRes.ok) {
                const payments = await cfPayRes.json();
                const successPay = Array.isArray(payments)
                  ? payments.find((p: any) => p.payment_status === 'SUCCESS')
                  : null;
                if (successPay) {
                  cfPaymentId = String(successPay.cf_payment_id || '');
                  bankRef = String(successPay.bank_reference || cfPaymentId);
                  paymentGroup = successPay.payment_group || 'CASHFREE';
                }
              }
            } catch (pErr) {
              this.logger.warn(`Failed to fetch payments for order ${orderId}`, pErr);
            }

            // Parallel updates to Payment and Booking
            const [, updatedBooking] = await Promise.all([
              this.paymentModel.findOneAndUpdate(
                { orderId },
                {
                  status: SingAlongPaymentStatus.SUCCESS,
                  cfPaymentId,
                  utr: bankRef,
                  paymentMethod: `CASHFREE (${paymentGroup})`,
                },
                { new: true },
              ).lean(),
              this.bookingModel.findOneAndUpdate(
                payment ? { bookingId: payment.bookingId } : { orderId },
                {
                  status: SingAlongBookingStatus.CONFIRMED,
                  utr: bankRef,
                  paymentMethod: `CASHFREE (${paymentGroup})`,
                  notes: `Confirmed via Cashfree Real-Time Status Check (CF Payment ID: ${cfPaymentId}, Ref: ${bankRef})`,
                },
                { new: true },
              ).lean(),
            ]);

            const confirmedResult = {
              success: true,
              isPaid: true,
              status: 'SUCCESS',
              orderId,
              booking: {
                id: updatedBooking?._id,
                bookingId: updatedBooking?.bookingId,
                fullName: updatedBooking?.fullName,
                phone: updatedBooking?.phone,
                email: updatedBooking?.email,
                ticketQty: updatedBooking?.ticketQty,
                totalAmount: updatedBooking?.totalAmount,
                status: updatedBooking?.status,
                utr: updatedBooking?.utr,
                verificationToken: updatedBooking
                  ? `SINGALONG-VERIFY:${updatedBooking.bookingId}`
                  : '',
              },
            };

            if (updatedBooking?.email && !updatedBooking.emailSent) {
              this.sendTicketEmailAsync(updatedBooking).catch((err) =>
                this.logger.error(`Error sending ticket email: ${err?.message}`),
              );
            }

            this.statusPollingCache.set(orderId, {
              data: confirmedResult,
              expiresAt: now + 60000,
            });
            return confirmedResult;
          } else if (cfOrder?.order_status === 'EXPIRED') {
            await this.paymentModel.findOneAndUpdate(
              { orderId },
              { status: SingAlongPaymentStatus.FAILED },
            );
          }
        }
      } catch (err) {
        this.logger.warn(`Cashfree real-time check error for ${orderId}:`, err);
      }
    }

    const pendingResult = {
      success: true,
      isPaid: false,
      status: payment?.status || 'PENDING',
      orderId,
    };

    // Cache pending response for 2 seconds to absorb burst polling from frontend
    this.statusPollingCache.set(orderId, {
      data: pendingResult,
      expiresAt: now + 2000,
    });

    return pendingResult;
  }

  // =========================================================================
  // 5. SUBMIT MANUAL UPI UTR / TRANSACTION ID
  // Target: POST /api/v1/sing-payment/submit-utr
  // Parallel updates & atomic ID creation
  // =========================================================================
  async submitUtr(dto: SubmitSingUtrDto) {
    const utr = (dto.utr || '').trim();
    if (!utr) {
      throw new BadRequestException(
        'UPI Transaction ID / UTR number is required.',
      );
    }

    // 1. If existing orderId or bookingId is passed, update in parallel
    if (dto.orderId || dto.bookingId) {
      const query = dto.orderId
        ? { orderId: dto.orderId }
        : { bookingId: dto.bookingId };

      const [booking] = await Promise.all([
        this.bookingModel.findOneAndUpdate(
          query,
          {
            utr,
            paymentScreenshot: dto.paymentScreenshot || '',
            paymentMethod: dto.paymentMethod || 'Scan GPay QR (Manual UTR)',
            status: SingAlongBookingStatus.CONFIRMED,
            notes: `Manual UPI UTR submitted: ${utr}`,
          },
          { new: true },
        ).lean(),
        dto.orderId
          ? this.paymentModel.findOneAndUpdate(
              { orderId: dto.orderId },
              {
                utr,
                status: SingAlongPaymentStatus.SUCCESS,
                paymentMethod: 'UPI_MANUAL_QR',
              },
            ).lean()
          : Promise.resolve(null),
      ]);

      if (booking) {
        if (booking.email && !booking.emailSent) {
          this.sendTicketEmailAsync(booking).catch((err) =>
            this.logger.error(`Error sending ticket email: ${err?.message}`),
          );
        }

        return {
          success: true,
          message: 'UPI Transaction ID / UTR submitted successfully',
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

    // 2. Otherwise create fresh booking with UTR using atomic sequential ID
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

    const email = dto.email ? dto.email.trim().toLowerCase() : '';

    const bookingId = await this.singAlongService.generateBookingId();

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
      eventId: 'SINGALONG-SEP-27-2026',
      attended: false,
      isActive: true,
      notes: `Manual GPay QR payment verified with UTR: ${utr}`,
    });

    if (booking.email) {
      this.sendTicketEmailAsync(booking).catch((err) =>
        this.logger.error(`Error sending ticket email: ${err?.message}`),
      );
    }

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
