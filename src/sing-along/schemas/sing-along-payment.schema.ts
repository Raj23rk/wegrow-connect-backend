import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SingAlongPaymentDocument = SingAlongPayment & Document;

export enum SingAlongPaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  USER_DROPPED = 'USER_DROPPED',
}

@Schema({ timestamps: true, collection: 'sing_along_payments' })
export class SingAlongPayment {
  @Prop({ required: true, unique: true, trim: true })
  orderId!: string; // Internal Order ID e.g. order_SA26_1234_xxx

  @Prop({ default: '', trim: true })
  cfOrderId?: string; // Cashfree order ID

  @Prop({ default: '', trim: true })
  paymentSessionId?: string; // Cashfree payment_session_id

  @Prop({ required: true, trim: true })
  bookingId!: string; // Linked SingAlongBooking ID e.g. SA26-4821

  @Prop({ required: true })
  amount!: number; // Order amount in INR

  @Prop({ default: 'INR', uppercase: true, trim: true })
  currency: string = 'INR';

  @Prop({
    type: String,
    enum: SingAlongPaymentStatus,
    default: SingAlongPaymentStatus.PENDING,
  })
  status: SingAlongPaymentStatus = SingAlongPaymentStatus.PENDING;

  @Prop({ default: '', trim: true })
  paymentMethod?: string; // upi, card, netbanking, qr, etc.

  @Prop({ default: '', trim: true })
  cfPaymentId?: string;

  @Prop({ default: '', trim: true })
  utr?: string; // Bank UTR or UPI reference

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
  webhookPayload?: Record<string, any>;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const SingAlongPaymentSchema =
  SchemaFactory.createForClass(SingAlongPayment);

SingAlongPaymentSchema.index({ orderId: 1 }, { unique: true });
SingAlongPaymentSchema.index({ cfOrderId: 1 });
SingAlongPaymentSchema.index({ bookingId: 1 });
SingAlongPaymentSchema.index({ status: 1 });
SingAlongPaymentSchema.index({ 'customer.phone': 1 });
SingAlongPaymentSchema.index({ createdAt: -1 });
