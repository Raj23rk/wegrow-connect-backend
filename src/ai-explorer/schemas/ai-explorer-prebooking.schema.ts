import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiExplorerPrebookingDocument = AiExplorerPrebooking & Document;

export enum AiPrebookingPaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum AiPrebookingStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CANCELLED = 'CANCELLED',
}

@Schema({ _id: false })
export class PrebookingStudentItem {
  @Prop({ required: true, trim: true })
  studentName!: string;

  @Prop({ required: true, trim: true })
  standard!: string; // 5th Standard, 6th Standard, etc.

  @Prop({ required: true, trim: true })
  school!: string;

  @Prop({ default: '', trim: true })
  gender?: string;

  @Prop({ default: '', trim: true })
  dob?: string;
}

export const PrebookingStudentItemSchema =
  SchemaFactory.createForClass(PrebookingStudentItem);

@Schema({ timestamps: true, collection: 'ai_explorer_prebookings' })
export class AiExplorerPrebooking {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  prebookingId!: string; // e.g. AIP26-1001

  @Prop({ type: [PrebookingStudentItemSchema], required: true, default: [] })
  students!: PrebookingStudentItem[];

  @Prop({ required: true, default: 1 })
  totalStudents!: number; // Number of children enrolled

  @Prop({ required: true, default: 1000 })
  amountPerStudent!: number; // 1000 Rs per student

  @Prop({ required: true, default: 1000 })
  totalAmount!: number; // totalStudents * 1000

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  fatherName!: string;

  @Prop({ required: true, trim: true })
  motherName!: string;

  @Prop({ required: true, trim: true })
  fatherPhone!: string;

  @Prop({ required: true, trim: true })
  motherPhone!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ default: 'AI Explorer Pre-Booking', trim: true })
  courseName: string = 'AI Explorer Pre-Booking';

  @Prop({ default: 'UPI', trim: true })
  paymentMethod: string = 'UPI';

  @Prop({
    type: String,
    enum: AiPrebookingPaymentStatus,
    default: AiPrebookingPaymentStatus.COMPLETED,
  })
  paymentStatus: AiPrebookingPaymentStatus = AiPrebookingPaymentStatus.COMPLETED;

  @Prop({ default: '', trim: true })
  orderId?: string; // Gateway / Cashfree Order ID

  @Prop({ default: '', trim: true })
  cfOrderId?: string;

  @Prop({ default: '', trim: true })
  paymentSessionId?: string;

  @Prop({ default: '', trim: true })
  paymentId?: string;

  @Prop({ default: '', trim: true })
  utr?: string; // UPI Reference ID

  @Prop({ default: true })
  declarationAccepted: boolean = true;

  @Prop({
    type: String,
    enum: AiPrebookingStatus,
    default: AiPrebookingStatus.CONFIRMED,
  })
  status: AiPrebookingStatus = AiPrebookingStatus.CONFIRMED;

  @Prop({ default: false })
  emailSent: boolean = false;

  @Prop({ type: Date, default: null })
  emailSentAt?: Date;

  @Prop({ default: '', trim: true })
  adminNotes?: string;

  @Prop({ default: true })
  isActive: boolean = true;
}

export const AiExplorerPrebookingSchema =
  SchemaFactory.createForClass(AiExplorerPrebooking);

AiExplorerPrebookingSchema.index({ prebookingId: 1 }, { unique: true });
AiExplorerPrebookingSchema.index({ email: 1, isActive: 1 });
AiExplorerPrebookingSchema.index({ fatherPhone: 1, isActive: 1 });
AiExplorerPrebookingSchema.index({ orderId: 1 });
AiExplorerPrebookingSchema.index({ paymentStatus: 1 });
AiExplorerPrebookingSchema.index({ status: 1 });
AiExplorerPrebookingSchema.index({ createdAt: -1 });
