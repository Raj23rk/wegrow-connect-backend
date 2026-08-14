import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

// ============================================================
// USER ROLE
// ============================================================

export enum UserRole {
  STUDENT = 'STUDENT',
  BUSINESS = 'BUSINESS',
  ADMIN = 'ADMIN',
}

// ============================================================
// USER STATUS
// ============================================================

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  INACTIVE = 'INACTIVE',
}

// ============================================================
// SUBSCRIPTION STATUS
// ============================================================

export enum SubscriptionStatus {
  FREE_TRIAL = 'FREE_TRIAL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// ============================================================
// USER SCHEMA
// ============================================================

@Schema({ timestamps: true })
export class User {
  // ============================================================
  // BASIC DETAILS
  // ============================================================

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({
    unique: true,
    sparse: true,
  })
  phone!: string;

  @Prop({
    type: String,
    enum: UserRole,
    required: true,
  })
  role!: UserRole;

  // ============================================================
  // USER STATUS
  // ============================================================

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  // ============================================================
  // ORGANIZATION
  // ============================================================

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  organization?: string;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop()
  profileImage?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  // ============================================================
  // STUDENT FIELDS
  // ============================================================

  @Prop()
  college?: string;

  @Prop()
  course?: string;

  @Prop()
  department?: string;

  @Prop()
  year?: string;

  @Prop({
    type: [String],
    default: [],
  })
  skills?: string[];

  @Prop()
  idCardUrl?: string;

  // ============================================================
  // BUSINESS FIELDS
  // ============================================================

  @Prop()
  companyName?: string;

  @Prop()
  businessType?: string;

  @Prop()
  designation?: string;

  @Prop()
  experience?: number;

  @Prop()
  website?: string;

  @Prop()
  visitingCardUrl?: string;

  // ============================================================
  // SUBSCRIPTION
  // ============================================================

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.FREE_TRIAL,
  })
  subscriptionStatus: SubscriptionStatus = SubscriptionStatus.FREE_TRIAL;

  @Prop()
  subscriptionExpiry?: Date;

  // ============================================================
  // WORKSHOP
  // ============================================================

  @Prop({ default: 0 })
  workshopsAttended!: number;

  @Prop({ default: true })
  isActive!: boolean;

  // ============================================================
  // PASSWORD RESET
  // ============================================================

  @Prop({
    type: String,
    default: null,
  })
  resetPasswordToken?: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  resetPasswordExpires?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
