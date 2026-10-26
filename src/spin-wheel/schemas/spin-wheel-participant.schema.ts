import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SpinWheelParticipantDocument = SpinWheelParticipant & Document;

@Schema({ timestamps: true, collection: 'spin_wheel_participants' })
export class SpinWheelParticipant {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true, trim: true })
  mobileNo!: string;

  @Prop({ required: true, trim: true })
  fatherMobile!: string;

  @Prop({ required: true, trim: true })
  motherMobile!: string;

  @Prop({ required: true, trim: true })
  courseInterested!: string;

  @Prop({ default: 'WeGrow B-School Main Campus', trim: true })
  campusPreference?: string;

  @Prop({ default: '', trim: true })
  emailOtp?: string;

  @Prop({ type: Date, default: null })
  otpExpiresAt?: Date | null;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop({ type: Date, default: null })
  otpVerifiedAt?: Date | null;

  @Prop({ default: false, index: true })
  hasSpun!: boolean;

  @Prop({ type: Date, default: null })
  spunAt?: Date | null;

  @Prop({ default: '', trim: true })
  rewardId?: string;

  @Prop({ default: '', trim: true })
  rewardTitle?: string;

  @Prop({ default: '', trim: true })
  rewardBadge?: string;

  @Prop({ default: '', trim: true })
  rewardDescription?: string;

  @Prop({ default: '', trim: true })
  rewardTerms?: string;

  @Prop({ default: '', trim: true, unique: true, sparse: true, index: true })
  voucherCode?: string;

  @Prop({ default: '', trim: true })
  qrCodeDataUrl?: string;

  @Prop({ default: false, index: true })
  isRedeemed!: boolean;

  @Prop({ type: Date, default: null })
  redeemedAt?: Date | null;

  @Prop({ default: '', trim: true })
  redeemedBy?: string;

  @Prop({ default: '', trim: true })
  ipAddress?: string;

  @Prop({ default: '', trim: true })
  userAgent?: string;
}

export const SpinWheelParticipantSchema =
  SchemaFactory.createForClass(SpinWheelParticipant);

