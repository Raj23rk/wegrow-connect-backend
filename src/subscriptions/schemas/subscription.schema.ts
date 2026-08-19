import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

// ============================================================
// SUBSCRIPTION STATUS
// ============================================================

export enum SubscriptionPaymentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

// ============================================================
// SUBSCRIPTION SCHEMA
// ============================================================

@Schema({ timestamps: true })
export class Subscription {
  // ============================================================
  // RELATIONS
  // ============================================================

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  planId!: Types.ObjectId;

  // ============================================================
  // RAZORPAY
  // ============================================================

  @Prop({ required: true })
  razorpayOrderId!: string;

  @Prop()
  razorpayPaymentId?: string;

  @Prop()
  razorpaySignature?: string;

  // ============================================================
  // STATUS
  // ============================================================

  @Prop({
    type: String,
    enum: SubscriptionPaymentStatus,
    default: SubscriptionPaymentStatus.PENDING,
  })
  status!: SubscriptionPaymentStatus;

  // ============================================================
  // AMOUNT
  // ============================================================

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'INR' })
  currency!: string;

  // ============================================================
  // VALIDITY
  // ============================================================

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: true })
  isActive!: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
