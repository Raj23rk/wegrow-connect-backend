import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiExplorerPrebookingPaymentDocument = AiExplorerPrebookingPayment & Document;

export enum AiExplorerPrebookingTxnStatus {
  INITIALIZED = 'INITIALIZED',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  USER_DROPPED = 'USER_DROPPED',
}

@Schema({ timestamps: true, collection: 'ai_explorer_prebooking_payments' })
export class AiExplorerPrebookingPayment {
  @Prop({ required: true, unique: true, index: true })
  orderId!: string;

  @Prop({ required: true, index: true })
  prebookingId!: string;

  @Prop({ default: '' })
  cfOrderId?: string;

  @Prop({ default: '' })
  cfPaymentId?: string;

  @Prop({ default: '' })
  paymentSessionId?: string;

  @Prop({ default: '' })
  bankReference?: string; // UTR or Bank Ref

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 1 })
  totalStudents!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({
    type: String,
    enum: AiExplorerPrebookingTxnStatus,
    default: AiExplorerPrebookingTxnStatus.INITIALIZED,
  })
  status!: AiExplorerPrebookingTxnStatus;

  @Prop({ default: '' })
  fatherName?: string;

  @Prop({ default: '' })
  phone!: string;

  @Prop({ default: '' })
  email!: string;

  @Prop({ type: Object, default: {} })
  rawGatewayResponse?: Record<string, any>;
}

export const AiExplorerPrebookingPaymentSchema =
  SchemaFactory.createForClass(AiExplorerPrebookingPayment);

AiExplorerPrebookingPaymentSchema.index({ orderId: 1 }, { unique: true });
AiExplorerPrebookingPaymentSchema.index({ prebookingId: 1 });
AiExplorerPrebookingPaymentSchema.index({ createdAt: -1 });
