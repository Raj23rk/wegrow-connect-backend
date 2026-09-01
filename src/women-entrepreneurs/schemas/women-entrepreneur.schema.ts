import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WomenEntrepreneurDocument = WomenEntrepreneur & Document;

export enum BusinessStage {
  PLANNING = 'planning',
  JUST_STARTED = 'just_started',
  RUNNING = 'running',
  ESTABLISHED = 'established',
}

export enum BusinessCategory {
  RETAIL_BOUTIQUE = 'retail_boutique',
  FOOD_BAKING = 'food_baking',
  BEAUTY_WELLNESS = 'beauty_wellness',
  MANUFACTURING_CRAFTS = 'manufacturing_crafts',
  DIGITAL_SERVICES = 'digital_services',
  OTHER = 'other',
}

export enum RegistrationStatus {
  CONFIRMED = 'CONFIRMED',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'women_entrepreneurs' })
export class WomenEntrepreneur {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string; // WhatsApp mobile number

  @Prop({ trim: true, lowercase: true, default: '' })
  email?: string;

  @Prop({
    type: String,
    enum: BusinessStage,
    required: true,
  })
  businessStage!: BusinessStage;

  @Prop({
    type: String,
    enum: BusinessCategory,
    required: true,
  })
  category!: BusinessCategory;

  @Prop({
    type: String,
    enum: RegistrationStatus,
    default: RegistrationStatus.CONFIRMED,
  })
  status: RegistrationStatus = RegistrationStatus.CONFIRMED;

  @Prop({ default: false })
  emailSent: boolean = false;

  @Prop({ default: '' })
  notes?: string;
}

export const WomenEntrepreneurSchema = SchemaFactory.createForClass(WomenEntrepreneur);

WomenEntrepreneurSchema.index({ phone: 1 });
WomenEntrepreneurSchema.index({ email: 1 });
WomenEntrepreneurSchema.index({ businessStage: 1 });
WomenEntrepreneurSchema.index({ category: 1 });
WomenEntrepreneurSchema.index({ createdAt: -1 });
