import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DiwaliChallengeDocument = DiwaliChallenge & Document;

@Schema({ timestamps: true, collection: 'diwali_challenge_submissions' })
export class DiwaliChallenge {
  @Prop({ required: true, trim: true })
  studentName!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true, trim: true })
  mobileNo!: string;

  @Prop({ default: '', trim: true })
  collegeOrSchool?: string;

  @Prop({ required: true, trim: true })
  courseInterested!: string;

  @Prop({ default: 'Campus Diwali Poster QR', trim: true })
  referralSource?: string;

  @Prop({ type: Array, default: [] })
  answers?: Array<{
    questionId: number;
    questionText: string;
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
  }>;

  @Prop({ default: 0 })
  correctCount!: number;

  @Prop({ default: 0, index: true })
  score!: number; // correctCount * 5 (Max 100)

  @Prop({ default: 20 })
  totalQuestions!: number;

  @Prop({ default: 100 })
  maxScore!: number;

  @Prop({ default: false, index: true })
  isQualifiedForDemo!: boolean; // true if score >= 80

  @Prop({ default: '', trim: true, unique: true, sparse: true, index: true })
  demoTicketCode?: string; // e.g. WGW-DEMO-73921

  @Prop({ default: '', trim: true })
  qrCodeDataUrl?: string;

  @Prop({ default: '1-Week Free Live Demo Batch + ₹5,000 Course Scholarship' })
  benefitTitle?: string;

  @Prop({ default: false, index: true })
  isRedeemed!: boolean;

  @Prop({ type: Date, default: null })
  redeemedAt?: Date | null;

  @Prop({ default: '', trim: true })
  redeemedBy?: string;

  @Prop({ type: Date, default: null })
  submittedAt?: Date | null;
}

export const DiwaliChallengeSchema =
  SchemaFactory.createForClass(DiwaliChallenge);
