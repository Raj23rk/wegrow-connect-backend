import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessMeetupFeedbackDocument = BusinessMeetupFeedback & Document;

export enum MeetupExperienceLevel {
  EXCELLENT = 'Excellent',
  GOOD = 'Good',
  AVERAGE = 'Average',
  NEEDS_IMPROVEMENT = 'Needs Improvement',
}

export enum MeetupWillingToGrow {
  YES = 'Yes',
  NO = 'No',
  MAYBE = 'Maybe',
}

export enum MeetupCanRefer {
  YES = 'Yes',
  NO = 'No',
}

export enum MeetupFeedbackStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  CONTACTED = 'contacted',
  ARCHIVED = 'archived',
}

@Schema({
  timestamps: true,
  collection: 'business_meetup_feedbacks',
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: any) => {
      ret.id = ret._id?.toString();
      return ret;
    },
  },
})
export class BusinessMeetupFeedback {
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    enum: Object.values(MeetupExperienceLevel),
    index: true,
  })
  experience!: string;

  @Prop({ trim: true, default: '' })
  likedMost?: string;

  @Prop({ trim: true, default: '' })
  suggestions?: string;

  @Prop({
    required: true,
    trim: true,
    enum: Object.values(MeetupWillingToGrow),
    index: true,
  })
  willingToGrow!: string;

  @Prop({
    required: true,
    trim: true,
    enum: Object.values(MeetupCanRefer),
    index: true,
  })
  canRefer!: string;

  // Referral Fields (populated if canRefer === 'Yes')
  @Prop({ trim: true, default: '' })
  referralName?: string;

  @Prop({ trim: true, default: '' })
  referralBusiness?: string;

  @Prop({ trim: true, default: '', index: true })
  referralMobile?: string;

  @Prop({ trim: true, default: '' })
  keyTakeaways?: string;

  @Prop({ trim: true, default: 'Business Transformation Meetup', index: true })
  eventTitle!: string;

  @Prop({
    type: String,
    enum: Object.values(MeetupFeedbackStatus),
    default: MeetupFeedbackStatus.NEW,
    index: true,
  })
  status: MeetupFeedbackStatus = MeetupFeedbackStatus.NEW;

  @Prop({ trim: true, default: '' })
  notes?: string;

  @Prop({ type: Date, default: Date.now, index: true })
  submittedAt: Date = new Date();
}

export const BusinessMeetupFeedbackSchema = SchemaFactory.createForClass(
  BusinessMeetupFeedback,
);

BusinessMeetupFeedbackSchema.index({ createdAt: -1 });
BusinessMeetupFeedbackSchema.index({ experience: 1, willingToGrow: 1 });
BusinessMeetupFeedbackSchema.index({ canRefer: 1, referralMobile: 1 });
