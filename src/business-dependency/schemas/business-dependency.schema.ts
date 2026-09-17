import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessDependencyDocument = BusinessDependency & Document;

export enum BusinessDependencyType {
  TEST = 'test',
  DIAGNOSTIC = 'diagnostic',
}

export enum BusinessDependencyStatus {
  PENDING = 'pending',
  CONTACTED = 'contacted',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true, collection: 'business_dependencies' })
export class BusinessDependency {
  @Prop({
    type: String,
    enum: BusinessDependencyType,
    default: BusinessDependencyType.TEST,
    index: true,
  })
  type: BusinessDependencyType = BusinessDependencyType.TEST;

  // Name fields: Test has "Your name", Diagnostic has "Full name"
  @Prop({ required: true, trim: true })
  fullName!: string;

  // Company / Business Name: Test has "Business name", Diagnostic has "Company"
  @Prop({ required: true, trim: true })
  company!: string;

  // Phone / WhatsApp Mobile number (e.g. 06380629995)
  @Prop({ required: true, trim: true })
  phone!: string;

  // Score from test or diagnostic (e.g. 72 or 72/100)
  @Prop({ type: Number, default: 0 })
  score?: number;

  @Prop({ trim: true, default: '' })
  scoreDisplay?: string; // e.g. "72/100"

  @Prop({ trim: true, default: '' })
  scoreSummary?: string; // e.g. "Partially Systemized"

  // Diagnostic specific fields
  @Prop({ trim: true, default: '' })
  designation?: string; // e.g. "Founder, CEO"

  @Prop({ trim: true, default: '' })
  industry?: string; // dropdown selection option

  @Prop({ trim: true, lowercase: true, default: '' })
  email?: string;

  @Prop({ trim: true, default: '' })
  businessSize?: string; // dropdown select (team size)

  @Prop({ trim: true, default: '' })
  biggestChallenge?: string; // dropdown select (closest fit)

  @Prop({ trim: true, default: '' })
  challengeDetails?: string; // textarea: "Anything else about this challenge? (optional)"

  // Submission tracking
  @Prop({
    type: String,
    enum: BusinessDependencyStatus,
    default: BusinessDependencyStatus.PENDING,
    index: true,
  })
  status: BusinessDependencyStatus = BusinessDependencyStatus.PENDING;

  @Prop({ type: Object, default: {} })
  testAnswers?: Record<string, any>; // Optional question/answer responses

  @Prop({ trim: true, default: '' })
  notes?: string;
}

export const BusinessDependencySchema =
  SchemaFactory.createForClass(BusinessDependency);

BusinessDependencySchema.index({ type: 1, createdAt: -1 });
BusinessDependencySchema.index({ phone: 1 });
BusinessDependencySchema.index({ email: 1 });
BusinessDependencySchema.index({ company: 1 });
BusinessDependencySchema.index({ fullName: 1 });
BusinessDependencySchema.index({ status: 1 });
BusinessDependencySchema.index({ createdAt: -1 });
