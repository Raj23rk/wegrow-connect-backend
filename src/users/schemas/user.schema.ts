import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  STUDENT = 'STUDENT',
  BUSINESS = 'BUSINESS',
  ADMIN = 'ADMIN',
}

export enum SubscriptionStatus {
FREE_TRIAL = 'FREE_TRIAL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Schema({ timestamps: true })
export class User {
  // Basic Details
  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ unique: true, sparse: true })
  phone!: string;

  @Prop({
    type: String,
    enum: UserRole,
    required: true,
  })
  role!: UserRole;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop()
  profileImage?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  // ----------------------------
  // Student Fields
  // ----------------------------

  @Prop()
  college?: string;

  @Prop()
  course?: string;

  @Prop()
  department?: string;

  @Prop()
  year?: string;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  // ----------------------------
  // Business Fields
  // ----------------------------

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

  // ----------------------------
  // Subscription
  // ----------------------------

@Prop({
  type: String,
  enum: SubscriptionStatus,
  default: SubscriptionStatus.FREE_TRIAL,
})
subscriptionStatus: SubscriptionStatus = SubscriptionStatus.FREE_TRIAL;
  @Prop()
  subscriptionExpiry?: Date;

  // ----------------------------
  // Workshop
  // ----------------------------

  @Prop({ default: 0 })
  workshopsAttended!: number;
}

export const UserSchema = SchemaFactory.createForClass(User);