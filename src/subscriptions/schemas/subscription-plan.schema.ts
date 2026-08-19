import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;

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

  @Prop({ default: true })
  isActive!: boolean;
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);
