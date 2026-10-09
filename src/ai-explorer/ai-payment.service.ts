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
import {
  AiExplorerPayment,
  AiExplorerPaymentDocument,
  AiExplorerPaymentTxnStatus,
} from './schemas/ai-explorer-payment.schema';
import {
  AiEnrollmentStatus,
  AiExplorerEnrollment,
  AiExplorerEnrollmentDocument,
  AiFeePlan,
  AiPaymentStatus,
} from './schemas/ai-explorer-enrollment.schema';
import {
  CreateAiPaymentOrderDto,
  SubmitAiUtrDto,
  VerifyAiPaymentDto,
} from './dto/create-ai-payment-order.dto';
import { AiExplorerService } from './ai-explorer.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AiPaymentService {
  private readonly logger = new Logger(AiPaymentService.name);

  constructor(
    @InjectModel(AiExplorerPayment.name)
    private readonly paymentModel: Model<AiExplorerPaymentDocument>,
    @InjectModel(AiExplorerEnrollment.name)
    private readonly enrollmentModel: Model<AiExplorerEnrollmentDocument>,
    private readonly configService: ConfigService,
    private readonly aiExplorerService: AiExplorerService,
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

  private resolveFeePlan(planRaw?: string, inputAmount?: number) {
    const p = (planRaw || 'full').toLowerCase().trim();
    if (p.includes('half')) {
      return {
        feePlan: AiFeePlan.HALF,
        planName: 'Half-Yearly',
        amount: inputAmount && inputAmount > 0 ? inputAmount : 22500,
        totalCourseFee: 45000,
      };
    }
    if (p.includes('term')) {
      return {
        feePlan: AiFeePlan.TERM,
        planName: 'Term Wise Payment',
        amount: inputAmount && inputAmount > 0 ? inputAmount : 15000,
        totalCourseFee: 45000,
      };
    }
    return {
      feePlan: AiFeePlan.FULL,
      planName: 'Full Payment',
      amount: inputAmount && inputAmount > 0 ? inputAmount : 43000,
      totalCourseFee: 43000,
    };
  }

  /**
   * 1. CREATE PAYMENT ORDER (Cashfree PG Order API)
   */
  /**
   * 1. CREATE PAYMENT ORDER (Cashfree PG Order API) - Ultra-Fast Optimized
   */
  async createOrder(dto: CreateAiPaymentOrderDto) {
    let studentName = (
      dto.studentName ||
      dto.name ||
      dto.fullName ||
      dto.customerName ||
      ''
    ).trim();

    let standard = (dto.standard || '').trim();
    let school = (dto.school || '').trim();

    const students = Array.isArray(dto.students) ? dto.students : [];
    if (students.length > 0) {
      if (!studentName) {
        studentName = students
          .map((s) => (s.name || s.studentName || '').trim())
          .filter(Boolean)
          .join(', ');
      }
      if (!standard) {
        standard = students
          .map((s) => (s.standard || '').trim())
          .filter(Boolean)
          .join(', ');
      }
      if (!school) {
        school = students
          .map((s) => (s.school || '').trim())
          .filter(Boolean)
          .join(', ');
      }
    }

    if (!studentName) throw new BadRequestException('Student name is required.');

    const email = (
      dto.email ||
      dto.mailId ||
      dto.customerEmail ||
      ''
    ).trim().toLowerCase();
    if (!email) throw new BadRequestException('Email address is required.');

    const rawFatherPhone = (dto.fatherPhone || dto.phone || dto.customerPhone || '').trim().replace(/\D/g, '').slice(-10);
    const rawMotherPhone = (dto.motherPhone || '').trim().replace(/\D/g, '').slice(-10);

    if (rawFatherPhone && rawMotherPhone && rawFatherPhone === rawMotherPhone) {
      throw new BadRequestException("Father's phone number and Mother's phone number cannot be the same. Please provide an alternate contact number.");
    }

    const phone = rawFatherPhone || rawMotherPhone;

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      throw new BadRequestException('A valid 10-digit mobile number is required.');
    }

    const planInfo = this.resolveFeePlan(dto.feePlan || dto.plan, dto.amount || dto.orderAmount);
    const totalStudents = dto.totalStudents || dto.studentCount || (students.length > 0 ? students.length : 1);
    const totalAmount = dto.amount && dto.amount > 0 ? dto.amount : planInfo.amount;
    const finalTotalFee = dto.totalFee || dto.totalCourseFee || planInfo.totalCourseFee;
    const finalPlanName = dto.planName || planInfo.planName;

    const enrollmentId = await this.aiExplorerService.generateEnrollmentId();
    const orderId = `order_AIE26_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://www.wegrowbschool.in';

    const returnUrl = `${frontendUrl}/ai-explorer-enrollment.html?order_id={order_id}`;
    const notifyUrl = 'https://wegrow-connect-backend-1.onrender.com/api/v1/ai-explorer/webhook';

    const appId = this.getCashfreeAppId();
    const secretKey = this.getCashfreeSecretKey();
    const apiVersion = this.getCashfreeApiVersion();
    const baseUrl = this.getCashfreeBaseUrl();

    let cfOrder: any = null;

    if (appId && secretKey) {
      try {
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
              customer_id: `cust_${phone}`,
              customer_name: studentName,
              customer_email: email,
              customer_phone: phone,
            },
            order_meta: {
              return_url: returnUrl,
              notify_url: notifyUrl,
            },
            order_note: `AI Explorer Enrollment (${enrollmentId})`,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          cfOrder = await response.json();
        } else {
          const errJson = await response.json();
          this.logger.error('Cashfree order creation error:', errJson);
        }
      } catch (err) {
        this.logger.error('Cashfree PG connection error:', err);
      }
    }

    const paymentSessionId = cfOrder?.payment_session_id || `sim_session_${Date.now()}`;
    const cfOrderId = cfOrder?.cf_order_id ? String(cfOrder.cf_order_id) : '';

    // Parallel DB writes in background / single pass
    await Promise.all([
      this.enrollmentModel.create({
        enrollmentId,
        studentName,
        students,
        studentCount: totalStudents,
        totalStudents,
        email,
        standard,
        school,
        fatherName: (dto.fatherName || 'Parent').trim(),
        motherName: (dto.motherName || dto.fatherName || '').trim(),
        fatherPhone: phone,
        motherPhone: rawMotherPhone || phone,
        address: (dto.address || '').trim(),
        courseName: 'AI Explorer',
        feePlan: planInfo.feePlan,
        planName: finalPlanName,
        selectedTerm: dto.selectedTerm || '',
        amount: totalAmount,
        totalCourseFee: finalTotalFee,
        totalFee: finalTotalFee,
        paymentMethod: dto.paymentMethod || 'Cashfree',
        paymentStatus: AiPaymentStatus.PENDING,
        orderId,
        paymentSessionId,
        cfOrderId,
        status: AiEnrollmentStatus.PENDING_PAYMENT,
        adminNotes: dto.notes || dto.orderNote || `Pending payment order: ${orderId}`,
        isActive: true,
      }),
      this.paymentModel.create({
        orderId,
        enrollmentId,
        cfOrderId,
        paymentSessionId,
        amount: totalAmount,
        currency: 'INR',
        status: AiExplorerPaymentTxnStatus.INITIALIZED,
        studentName,
        phone,
        email,
        feePlan: planInfo.feePlan,
      }),
    ]);

    return {
      orderId,
      txnid: orderId,
      cfOrderId,
      paymentSessionId,
      enrollmentId,
      amount: totalAmount,
      currency: 'INR',
      studentName,
      email,
      phone,
      feePlan: planInfo.feePlan,
      planName: planInfo.planName,
      environment: this.getCashfreeEnv(),
      paymentLink: `https://payments.cashfree.com/order/#${paymentSessionId}`,
      customer: {
        name: studentName,
        phone,
        email,
      },
    };
  }

  /**
   * 2. HANDLE CASHFREE WEBHOOK
   */
  async handleCashfreeWebhook(
    body: any,
    signature?: string,
    timestamp?: string,
    req?: any,
  ) {
    this.logger.log('Received AI Explorer Cashfree webhook payload:', JSON.stringify(body));

    const order = body?.data?.order;
    const payment = body?.data?.payment;
    const orderId = order?.order_id || body?.orderId;
    const paymentStatus = payment?.payment_status || body?.txStatus || 'SUCCESS';

    if (!orderId) {
      return { status: 'IGNORED', message: 'No order_id in webhook' };
    }

    if (paymentStatus === 'SUCCESS') {
      const enrollment = await this.enrollmentModel.findOne({ orderId });
      if (enrollment) {
        enrollment.paymentStatus = AiPaymentStatus.COMPLETED;
        enrollment.status = AiEnrollmentStatus.ENROLLED;
        enrollment.paymentId = payment?.cf_payment_id || '';
        enrollment.utr = payment?.bank_reference || '';
        await enrollment.save();

        await this.paymentModel.updateOne(
          { orderId },
          {
            $set: {
              status: AiExplorerPaymentTxnStatus.SUCCESS,
              cfPaymentId: payment?.cf_payment_id,
              bankReference: payment?.bank_reference,
              rawGatewayResponse: body,
            },
          },
        );

        // Send confirmation email
        this.aiExplorerService.sendNotificationEmails(enrollment).catch((e) =>
          this.logger.error('Error sending confirmation email after webhook:', e),
        );
      }
    }

    return { status: 'OK', message: 'Webhook processed successfully' };
  }

  /**
   * 3. GET REAL-TIME PAYMENT STATUS
   */
  async getPaymentStatus(orderId: string) {
    const cleanOrderId = (orderId || '').trim();
    const enrollment = await this.enrollmentModel.findOne({ orderId: cleanOrderId });
    if (!enrollment) {
      throw new NotFoundException(`No enrollment found for order ID: ${cleanOrderId}`);
    }

    return {
      success: true,
      orderId: cleanOrderId,
      enrollmentId: enrollment.enrollmentId,
      studentName: enrollment.studentName,
      email: enrollment.email,
      amount: enrollment.amount,
      planName: enrollment.planName,
      paymentStatus: enrollment.paymentStatus,
      status: enrollment.status,
      utr: enrollment.utr,
    };
  }

  /**
   * 4. SUBMIT MANUAL UPI UTR / TRANSACTION ID
   */
  async submitUtr(dto: SubmitAiUtrDto) {
    const orderId = (dto.orderId || '').trim();
    const utr = (dto.utr || '').trim();

    if (!orderId || !utr) {
      throw new BadRequestException('Order ID and UTR reference number are required');
    }

    let enrollment = await this.enrollmentModel.findOne({
      $or: [{ orderId }, { enrollmentId: orderId }],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with order ID ${orderId} not found`);
    }

    enrollment.utr = utr;
    enrollment.paymentStatus = AiPaymentStatus.COMPLETED;
    enrollment.status = AiEnrollmentStatus.ENROLLED;
    enrollment.paymentMethod = 'UPI';
    const saved = await enrollment.save();

    await this.paymentModel.updateOne(
      { orderId },
      {
        $set: {
          status: AiExplorerPaymentTxnStatus.SUCCESS,
          bankReference: utr,
        },
      },
    );

    // Send confirmation emails
    this.aiExplorerService.sendNotificationEmails(saved).catch((err) =>
      this.logger.error('Error dispatching confirmation emails after UTR submission:', err),
    );

    return {
      success: true,
      message: 'Payment reference recorded and enrollment confirmed!',
      data: saved,
    };
  }
}
