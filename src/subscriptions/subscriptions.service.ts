import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from './schemas/subscription-plan.schema';

import {
  Subscription,
  SubscriptionDocument,
  SubscriptionPaymentStatus,
} from './schemas/subscription.schema';

import {
  User,
  UserDocument,
  SubscriptionStatus,
} from '../users/schemas/user.schema';

import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  private readonly razorpay: Razorpay;

  constructor(
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,

    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }

  // ============================================================
  // ADMIN: CREATE PLAN
  // ============================================================

  async createPlan(dto: CreatePlanDto) {
    try {
      const plan = await this.planModel.create({
        name: dto.name,
        description: dto.description,
        features: dto.features || [],
        price: dto.price,
        currency: dto.currency || 'INR',
        durationDays: dto.durationDays,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });

      this.logger.log(`Subscription plan created: ${plan._id}`);

      return { success: true, plan };
    } catch (error) {
      this.logger.error(
        'Failed to create plan',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        'Failed to create subscription plan',
      );
    }
  }

  // ============================================================
  // ADMIN: UPDATE PLAN
  // ============================================================

  async updatePlan(planId: string, dto: Partial<CreatePlanDto>) {
    const plan = await this.planModel.findByIdAndUpdate(planId, dto, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return { success: true, plan };
  }

  // ============================================================
  // GET ALL PLANS (PUBLIC)
  // ============================================================

  async getAllPlans() {
    const plans = await this.planModel
      .find({ isActive: true })
      .sort({ price: 1 })
      .lean();

    return { success: true, plans };
  }

  // ============================================================
  // ADMIN: GET ALL SUBSCRIPTIONS
  // ============================================================

  async getAllSubscriptions(page = 1, limit = 10) {
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.subscriptionModel
        .find()
        .populate('userId', 'firstName lastName email phone')
        .populate('planId', 'name price currency durationDays')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.subscriptionModel.countDocuments(),
    ]);

    return {
      success: true,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // USER: CREATE RAZORPAY ORDER
  // ============================================================

  async createOrder(userId: string, dto: CreateOrderDto) {
    try {
      // --------------------------------------------------------
      // 1. FIND PLAN
      // --------------------------------------------------------

      if (!Types.ObjectId.isValid(dto.planId)) {
        throw new BadRequestException('Invalid plan ID');
      }

      const plan = await this.planModel.findById(dto.planId);

      if (!plan || !plan.isActive) {
        throw new NotFoundException('Subscription plan not found or inactive');
      }

      // --------------------------------------------------------
      // 2. CREATE RAZORPAY ORDER
      // --------------------------------------------------------

      const amountInPaise = Math.round(plan.price * 100); // Razorpay uses paise

      const razorpayOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: plan.currency || 'INR',
        receipt: `sub_${userId.slice(-6)}_${Date.now()}`,
        notes: {
          userId,
          planId: dto.planId,
          planName: plan.name,
        },
      });

      this.logger.log(`Razorpay order created: ${razorpayOrder.id}`);

      // --------------------------------------------------------
      // 3. SAVE SUBSCRIPTION RECORD (PENDING)
      // --------------------------------------------------------

      const subscription = await this.subscriptionModel.create({
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(dto.planId),
        razorpayOrderId: razorpayOrder.id,
        status: SubscriptionPaymentStatus.PENDING,
        amount: plan.price,
        currency: plan.currency || 'INR',
      });

      this.logger.log(
        `Subscription record created (PENDING): ${subscription._id}`,
      );

      // --------------------------------------------------------
      // 4. RETURN ORDER DETAILS FOR FRONTEND
      // --------------------------------------------------------

      return {
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
        plan: {
          id: plan._id,
          name: plan.name,
          price: plan.price,
          durationDays: plan.durationDays,
        },
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        'Failed to create Razorpay order',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  // ============================================================
  // USER: VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
  // ============================================================

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    try {
      // --------------------------------------------------------
      // 1. VERIFY RAZORPAY SIGNATURE
      // --------------------------------------------------------

      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== dto.razorpaySignature) {
        throw new BadRequestException(
          'Invalid payment signature. Payment verification failed.',
        );
      }

      // --------------------------------------------------------
      // 2. FIND SUBSCRIPTION RECORD
      // --------------------------------------------------------

      const subscription = await this.subscriptionModel.findOne({
        razorpayOrderId: dto.razorpayOrderId,
        userId: new Types.ObjectId(userId),
        status: SubscriptionPaymentStatus.PENDING,
      });

      if (!subscription) {
        throw new NotFoundException('Subscription order not found');
      }

      // --------------------------------------------------------
      // 3. FIND PLAN FOR DURATION
      // --------------------------------------------------------

      const plan = await this.planModel.findById(subscription.planId);

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // --------------------------------------------------------
      // 4. ACTIVATE SUBSCRIPTION
      // --------------------------------------------------------

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.durationDays);

      subscription.razorpayPaymentId = dto.razorpayPaymentId;
      subscription.razorpaySignature = dto.razorpaySignature;
      subscription.status = SubscriptionPaymentStatus.ACTIVE;
      subscription.startDate = startDate;
      subscription.endDate = endDate;

      await subscription.save();

      this.logger.log(`Subscription activated: ${subscription._id}`);

      // --------------------------------------------------------
      // 5. UPDATE USER SUBSCRIPTION STATUS
      // --------------------------------------------------------

      await this.userModel.findByIdAndUpdate(userId, {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionExpiry: endDate,
      });

      this.logger.log(`User ${userId} subscription activated until ${endDate}`);

      return {
        success: true,
        message: 'Payment verified and subscription activated successfully',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          plan: {
            name: plan.name,
            durationDays: plan.durationDays,
          },
        },
      };
    } catch (error) {
      // --------------------------------------------------------
      // MARK FAILED IF SIGNATURE ERROR
      // --------------------------------------------------------

      if (error instanceof BadRequestException) {
        await this.subscriptionModel.findOneAndUpdate(
          { razorpayOrderId: dto.razorpayOrderId },
          { status: SubscriptionPaymentStatus.FAILED },
        );

        throw error;
      }

      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        'Failed to verify payment',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  // ============================================================
  // USER: MY SUBSCRIPTIONS
  // ============================================================

  async getMySubscriptions(userId: string) {
    const subscriptions = await this.subscriptionModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('planId', 'name price currency durationDays features')
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, subscriptions };
  }

  // ============================================================
  // USER: CURRENT SUBSCRIPTION STATUS
  // ============================================================

  async getMyStatus(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('subscriptionStatus subscriptionExpiry firstName lastName email')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const isExpired = user.subscriptionExpiry && user.subscriptionExpiry < now;

    // Auto-expire if expired
    if (isExpired && user.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      await this.userModel.findByIdAndUpdate(userId, {
        subscriptionStatus: SubscriptionStatus.INACTIVE,
      });
    }

    const activeSubscription = await this.subscriptionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: SubscriptionPaymentStatus.ACTIVE,
        endDate: { $gte: now },
      })
      .populate('planId', 'name price currency durationDays features')
      .lean();

    return {
      success: true,
      subscriptionStatus: isExpired
        ? SubscriptionStatus.INACTIVE
        : user.subscriptionStatus,
      subscriptionExpiry: user.subscriptionExpiry,
      isActive: !!activeSubscription,
      activeSubscription,
    };
  }
}
