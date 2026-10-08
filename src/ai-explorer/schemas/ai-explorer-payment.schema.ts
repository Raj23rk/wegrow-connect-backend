import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiExplorerPaymentDocument = AiExplorerPayment & Document;

export enum AiExplorerPaymentTxnStatus {
  INITIALIZED = 'INITIALIZED',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  USER_DROPPED = 'USER_DROPPED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'ai_explorer_payments' })
export class AiExplorerPayment {
  @Prop({ required: true, unique: true, index: true, trim: true })
  orderId!: string;

  @Prop({ default: '', trim: true, index: true })
  enrollmentId!: string;

  @Prop({ default: '', trim: true })
  cfOrderId?: string;

  @Prop({ default: '', trim: true })
  paymentSessionId?: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'INR', uppercase: true })
  currency: string = 'INR';

  @Prop({
    type: String,
    enum: AiExplorerPaymentTxnStatus,
    default: AiExplorerPaymentTxnStatus.INITIALIZED,
    index: true,
  })
  status: AiExplorerPaymentTxnStatus = AiExplorerPaymentTxnStatus.INITIALIZED;

  @Prop({ default: '', trim: true })
  paymentMethod?: string;

  @Prop({ default: '', trim: true })
  cfPaymentId?: string;

  @Prop({ default: '', trim: true })
  bankReference?: string;

  @Prop({ default: '', trim: true })
  studentName?: string;

  @Prop({ default: '', trim: true })
  phone?: string;

  @Prop({ default: '', trim: true, lowercase: true })
  email?: string;

  @Prop({ default: '', trim: true })
  feePlan?: string;

  @Prop({ type: Object, default: {} })
  rawGatewayResponse?: Record<string, any>;

  @Prop({ default: '', trim: true })
  failureReason?: string;
}

export const AiExplorerPaymentSchema =
  SchemaFactory.createForClass(AiExplorerPayment);

AiExplorerPaymentSchema.index({ orderId: 1 }, { unique: true });
AiExplorerPaymentSchema.index({ enrollmentId: 1 });
AiExplorerPaymentSchema.index({ status: 1 });
