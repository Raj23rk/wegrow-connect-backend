import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessFounderDocument = BusinessFounder & Document;

export enum FounderRegistrationStatus {
  CONFIRMED = 'CONFIRMED',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'business_founders' })
export class BusinessFounder {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string; // WhatsApp / Mobile Number

  @Prop({ default: '', trim: true, lowercase: true })
  email?: string;

  @Prop({ default: '', trim: true })
  businessName?: string;

  @Prop({ default: '', trim: true })
  industry?: string;

  @Prop({ default: '', trim: true })
  yearsInBusiness?: string;

  @Prop({ default: '', trim: true })
  biggestPriority?: string;

  @Prop({ default: '', trim: true })
  growthBlocker?: string;

  @Prop({ default: '', trim: true })
  hasTeam?: string;

  @Prop({ default: '', trim: true })
  futureVision?: string;

  @Prop({ default: '', trim: true })
  growthChallenge?: string;

  @Prop({
    type: String,
    enum: FounderRegistrationStatus,
    default: FounderRegistrationStatus.CONFIRMED,
  })
  status: FounderRegistrationStatus = FounderRegistrationStatus.CONFIRMED;

  @Prop({ default: false })
  emailSent: boolean = false;

  @Prop({
    type: String,
    trim: true,
    uppercase: true,
    default: 'BUSINESS-SEP-16-2026',
  })
  eventId: string = 'BUSINESS-SEP-16-2026';

  @Prop({ default: '' })
  notes?: string;
}

export const BusinessFounderSchema = SchemaFactory.createForClass(BusinessFounder);

BusinessFounderSchema.index({ phone: 1 });
BusinessFounderSchema.index({ eventId: 1 });
BusinessFounderSchema.index({ phone: 1, eventId: 1 });
BusinessFounderSchema.index({ email: 1 });
BusinessFounderSchema.index({ email: 1, eventId: 1 });
BusinessFounderSchema.index({ businessName: 1 });
BusinessFounderSchema.index({ industry: 1 });
BusinessFounderSchema.index({ yearsInBusiness: 1 });
BusinessFounderSchema.index({ status: 1 });
BusinessFounderSchema.index({ createdAt: -1 });
