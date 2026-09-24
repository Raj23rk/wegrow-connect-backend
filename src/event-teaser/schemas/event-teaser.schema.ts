import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventTeaserDocument = EventTeaser & Document;

export enum TeaserSubmissionStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  CORRECT = 'CORRECT',
  WINNER = 'WINNER',
}

@Schema({ timestamps: true, collection: 'event_teasers' })
export class EventTeaser {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ default: '', trim: true, lowercase: true })
  email?: string;

  @Prop({ required: true, trim: true })
  guess!: string;

  @Prop({
    type: String,
    enum: TeaserSubmissionStatus,
    default: TeaserSubmissionStatus.PENDING,
  })
  status: TeaserSubmissionStatus = TeaserSubmissionStatus.PENDING;

  @Prop({
    type: String,
    trim: true,
    uppercase: true,
    default: 'MYSTERY-EVENT-2026',
  })
  eventId: string = 'MYSTERY-EVENT-2026';

  @Prop({ default: '' })
  notes?: string;
}

export const EventTeaserSchema = SchemaFactory.createForClass(EventTeaser);

EventTeaserSchema.index({ phone: 1 });
EventTeaserSchema.index({ email: 1 });
EventTeaserSchema.index({ eventId: 1 });
EventTeaserSchema.index({ status: 1 });
EventTeaserSchema.index({ createdAt: -1 });
