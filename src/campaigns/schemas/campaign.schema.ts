import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CampaignDocument = Campaign & Document;

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  source!: string; // e.g. Newspaper, Banner, Social Media

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  campaignId!: string; // e.g. NEWSPAPER01

  @Prop()
  qrCode?: string;

  @Prop({ default: true })
  isActive: boolean = true;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
