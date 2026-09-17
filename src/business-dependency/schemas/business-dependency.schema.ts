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

@Schema({
  timestamps: true,
  collection: 'business_dependencies',
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: any) => {
      ret.id = ret.customId || ret._id?.toString();
      ret.name = ret.fullName;
      ret.business = ret.company;
      ret.size = ret.businessSize;
      ret.challengeSelect = ret.biggestChallenge;
      ret.challengeNote = ret.challengeDetails;
      return ret;
    },
  },
})
export class BusinessDependency {
  // Client-generated unique ID (e.g. bdt_test_1789646397482_6hohm)
  @Prop({ trim: true, index: true, default: '' })
  customId?: string;

  @Prop({
    type: String,
    enum: BusinessDependencyType,
    default: BusinessDependencyType.TEST,
    index: true,
  })
  type: BusinessDependencyType = BusinessDependencyType.TEST;

  // Name fields: Test has "Your name", Diagnostic has "Full name", frontend passes "name"
  @Prop({ required: true, trim: true })
  fullName!: string;

  // Company / Business Name: Test has "Business name", Diagnostic has "Company", frontend passes "business"
  @Prop({ required: true, trim: true })
  company!: string;

  // Phone / WhatsApp Mobile number
  @Prop({ required: true, trim: true })
  phone!: string;

  // Score from test or diagnostic (e.g. 78 or 78/100)
  @Prop({ type: Number, default: 0 })
  score?: number;

  @Prop({ trim: true, default: '' })
  scoreDisplay?: string; // e.g. "78/100"

  @Prop({ trim: true, default: '' })
  scoreSummary?: string; // e.g. "Self-Running Business" or "Partially Systemized"

  @Prop({ trim: true, default: '' })
  category?: string; // alias for scoreSummary ("Self-Running Business")

  // Diagnostic specific fields
  @Prop({ trim: true, default: '' })
  designation?: string; // e.g. "Founder, CEO"

  @Prop({ trim: true, default: '' })
  industry?: string; // dropdown selection option

  @Prop({ trim: true, lowercase: true, default: '' })
  email?: string;

  @Prop({ trim: true, default: '' })
  businessSize?: string; // team size (e.g. "2-10 employees")

  @Prop({ trim: true, default: '' })
  biggestChallenge?: string; // dropdown select ("Everything depends on...")

  @Prop({ trim: true, default: '' })
  challengeDetails?: string; // textarea / challengeNote

  // Lead / test tracking
  @Prop({ trim: true, default: '' })
  stage?: string; // "Test Completed" or "Diagnostic Booked"

  @Prop({ type: Date, default: Date.now })
  submittedAt?: Date;

  @Prop({ trim: true, default: '' })
  originalTestName?: string;

  @Prop({ trim: true, default: '' })
  originalBusiness?: string;

  @Prop({
    type: String,
    enum: BusinessDependencyStatus,
    default: BusinessDependencyStatus.PENDING,
    index: true,
  })
  status: BusinessDependencyStatus = BusinessDependencyStatus.PENDING;

  @Prop({ type: Array, default: [] })
  answers?: any[];

  @Prop({ type: Object, default: {} })
  testAnswers?: Record<string, any>;

  @Prop({ trim: true, default: '' })
  notes?: string;
}

export const BusinessDependencySchema =
  SchemaFactory.createForClass(BusinessDependency);

BusinessDependencySchema.virtual('id').get(function () {
  return this.customId || (this._id as any)?.toString();
});

BusinessDependencySchema.index({ type: 1, createdAt: -1 });
BusinessDependencySchema.index({ customId: 1 });
BusinessDependencySchema.index({ phone: 1 });
BusinessDependencySchema.index({ email: 1 });
BusinessDependencySchema.index({ company: 1 });
BusinessDependencySchema.index({ fullName: 1 });
BusinessDependencySchema.index({ status: 1 });
BusinessDependencySchema.index({ createdAt: -1 });
BusinessDependencySchema.index({ submittedAt: -1 });
