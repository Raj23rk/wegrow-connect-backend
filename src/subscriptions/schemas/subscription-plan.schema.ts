import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;

// ============================================================
// PLAN TYPE ENUM
// ============================================================

export enum PlanType {
  STUDENT = 'STUDENT',
  BUSINESS = 'BUSINESS',
}

// ============================================================
// SUBSCRIPTION PLAN SCHEMA
// ============================================================

@Schema({ timestamps: true })
export class SubscriptionPlan {
  // ============================================================
  // PLAN DETAILS
  // ============================================================

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: PlanType,
    required: true,
    default: PlanType.STUDENT,
    index: true,
  })
  type!: PlanType;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  features?: string[];

  // ============================================================
  // PRICING
  // ============================================================

  @Prop({ required: true })
  price!: number;

  @Prop({ default: 'INR' })
  currency!: string;

  // ============================================================
  // DURATION
  // ============================================================

  @Prop({ required: true })
  durationDays!: number;

  // ============================================================
  // STATUS
  // ============================================================

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);
