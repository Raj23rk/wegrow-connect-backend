import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiExplorerEnrollmentDocument = AiExplorerEnrollment & Document;

export enum AiFeePlan {
  FULL = 'full',
  HALF = 'half',
  TERM = 'term',
}

export enum AiPaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum AiEnrollmentStatus {
  ENROLLED = 'ENROLLED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'ai_explorer_enrollments' })
export class AiExplorerEnrollment {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  enrollmentId!: string; // e.g. AIE26-1001

  @Prop({ required: true, trim: true })
  studentName!: string;

  @Prop({ type: Array, default: [] })
  students?: Array<{
    name?: string;
    studentName?: string;
    standard?: string;
    school?: string;
    gender?: string;
    dob?: string;
  }>;

  @Prop({ default: 1 })
  studentCount?: number;

  @Prop({ default: 1 })
  totalStudents?: number;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ default: '', trim: true })
  standard: string = ''; // 5th Standard, 6th Standard, etc.

  @Prop({ default: '', trim: true })
  school: string = '';

  @Prop({ default: '', trim: true })
  fatherName: string = '';

  @Prop({ default: '', trim: true })
  motherName: string = '';

  @Prop({ default: '', trim: true })
  fatherPhone: string = '';

  @Prop({ default: '', trim: true })
  motherPhone: string = '';

  @Prop({ default: '', trim: true })
  address: string = '';

  @Prop({ default: 'AI Explorer', trim: true })
  courseName: string = 'AI Explorer';

  @Prop({
    type: String,
    enum: AiFeePlan,
    default: AiFeePlan.FULL,
  })
  feePlan: AiFeePlan = AiFeePlan.FULL;

  @Prop({ default: 'Full Payment', trim: true })
  planName: string = 'Full Payment';

  @Prop({ default: '', trim: true })
  selectedTerm?: string;

  @Prop({ required: true, default: 43000 })
  amount!: number; // Current paid/payable amount

  @Prop({ required: true, default: 43000 })
  totalCourseFee!: number; // Total fee for course (e.g. 43000 or 45000)

  @Prop({ default: 0 })
  totalFee?: number;

  @Prop({ default: 'UPI', trim: true })
  paymentMethod: string = 'UPI';

  @Prop({
    type: String,
    enum: AiPaymentStatus,
    default: AiPaymentStatus.COMPLETED,
  })
  paymentStatus: AiPaymentStatus = AiPaymentStatus.COMPLETED;

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
    enum: AiEnrollmentStatus,
    default: AiEnrollmentStatus.ENROLLED,
  })
  status: AiEnrollmentStatus = AiEnrollmentStatus.ENROLLED;

  @Prop({ default: false })
  emailSent: boolean = false;

  @Prop({ type: Date, default: null })
  emailSentAt?: Date;

  @Prop({ default: '', trim: true })
  adminNotes?: string;

  @Prop({ default: true })
  isActive: boolean = true;
}

export const AiExplorerEnrollmentSchema =
  SchemaFactory.createForClass(AiExplorerEnrollment);

AiExplorerEnrollmentSchema.index({ enrollmentId: 1 }, { unique: true });
AiExplorerEnrollmentSchema.index({ email: 1, isActive: 1 });
AiExplorerEnrollmentSchema.index({ fatherPhone: 1, isActive: 1 });
AiExplorerEnrollmentSchema.index({ orderId: 1 });
AiExplorerEnrollmentSchema.index({ createdAt: -1 });
