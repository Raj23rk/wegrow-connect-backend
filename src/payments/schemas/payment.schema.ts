import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  CREATED = 'CREATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ required: true, unique: true, trim: true })
  orderId!: string; // Razorpay Order ID (e.g. order_OPs4...)

  @Prop({ default: '', trim: true })
  paymentId?: string; // Razorpay Payment ID (e.g. pay_OPs5...)

  @Prop({ default: '', trim: true })
  signature?: string;

  @Prop({ required: true })
  amount!: number; // Amount in Rupees

  @Prop({ required: true })
  amountInPaise!: number; // Amount in Paise (amount * 100)

  @Prop({ default: 'INR', uppercase: true, trim: true })
  currency: string = 'INR';

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.CREATED,
  })
  status: PaymentStatus = PaymentStatus.CREATED;

  @Prop({ default: 'GENERAL', trim: true })
  purpose!: string; // e.g. SING_ALONG_TICKET, SUBSCRIPTION, WORKSHOP

  @Prop({ default: '', trim: true })
  receipt?: string;

  @Prop({
    type: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    _id: false,
  })
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  @Prop({ type: Object, default: {} })
  notes?: Record<string, any>;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ paymentId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ purpose: 1 });
PaymentSchema.index({ 'customer.phone': 1 });
PaymentSchema.index({ createdAt: -1 });
