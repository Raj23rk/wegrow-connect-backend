import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StudentFounderDocument = StudentFounder & Document;

export enum YearOfStudy {
  FIRST_YEAR = '1st Year',
  SECOND_YEAR = '2nd Year',
  THIRD_YEAR = '3rd Year',
  FOURTH_YEAR = '4th Year',
  POST_GRADUATE = 'Post Graduate',
  RECENT_GRADUATE = 'Recent Graduate',
}

export enum FounderRegistrationStatus {
  CONFIRMED = 'CONFIRMED',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'student_founders' })
export class StudentFounder {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string; // WhatsApp Number

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  collegeName!: string;

  @Prop({
    type: String,
    enum: YearOfStudy,
    required: true,
  })
  yearOfStudy!: YearOfStudy;

  @Prop({ required: true, trim: true })
  course!: string;

  @Prop({ required: true, type: Number })
  courseStartYear!: number;

  @Prop({ required: true, type: Number })
  courseEndYear!: number;

  @Prop({ default: '', trim: true })
  readiness?: string;

  @Prop({ default: '', trim: true })
  hasIdea?: string;

  @Prop({ default: '', trim: true })
  seriousness?: string;

  @Prop({ default: '', trim: true })
  lookingForFunding?: string;

  @Prop({ default: '', trim: true })
  readyToLearn?: string;

  @Prop({ default: '', trim: true })
  industryNiche?: string;

  @Prop({
    type: String,
    enum: FounderRegistrationStatus,
    default: FounderRegistrationStatus.CONFIRMED,
  })
  status: FounderRegistrationStatus = FounderRegistrationStatus.CONFIRMED;

  @Prop({ default: false })
  emailSent: boolean = false;

  @Prop({ default: '' })
  notes?: string;
}

export const StudentFounderSchema = SchemaFactory.createForClass(StudentFounder);

StudentFounderSchema.index({ phone: 1 });
StudentFounderSchema.index({ email: 1 });
StudentFounderSchema.index({ collegeName: 1 });
StudentFounderSchema.index({ yearOfStudy: 1 });
StudentFounderSchema.index({ industryNiche: 1 });
StudentFounderSchema.index({ createdAt: -1 });
