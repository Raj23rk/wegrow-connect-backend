import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SingAlongBookingDocument = SingAlongBooking & Document;

export enum SingAlongBookingStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'sing_along_bookings' })
export class SingAlongBooking {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  bookingId!: string; // Format: SA26-XXXX

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string; // 10-digit WhatsApp / Mobile number

  @Prop({ default: '', trim: true, lowercase: true })
  email?: string;

  @Prop({ required: true, default: 1, min: 1, max: 10 })
  ticketQty!: number;

  @Prop({ required: true, default: 199 })
  unitPrice!: number;

  @Prop({ required: true, default: 199 })
  totalAmount!: number;

  @Prop({ default: '', trim: true })
  utr?: string; // UPI Reference / Transaction ID

  @Prop({ default: '', trim: true })
  orderId?: string; // Cashfree / Razorpay Order ID

  @Prop({ default: '', trim: true })
  paymentScreenshot?: string;

  @Prop({ default: 'wegrow@okaxis', trim: true })
  paymentMethod!: string;

  @Prop({
    type: String,
    enum: SingAlongBookingStatus,
    default: SingAlongBookingStatus.CONFIRMED,
  })
  status: SingAlongBookingStatus = SingAlongBookingStatus.CONFIRMED;

  @Prop({ default: 'SINGALONG-SEP-27-2026', trim: true })
  eventId: string = 'SINGALONG-SEP-27-2026';

  @Prop({ default: false })
  attended: boolean = false;

  @Prop({ type: Date, default: null })
  attendedAt?: Date;

  @Prop({ default: true })
  isActive: boolean = true;

  @Prop({ default: false })
  emailSent: boolean = false;

  @Prop({ default: '', trim: true })
  notes?: string;
}

export const SingAlongBookingSchema =
  SchemaFactory.createForClass(SingAlongBooking);

SingAlongBookingSchema.index({ bookingId: 1 }, { unique: true });
SingAlongBookingSchema.index({ bookingId: 1, isActive: 1 });
SingAlongBookingSchema.index({ orderId: 1, isActive: 1 });
SingAlongBookingSchema.index({ phone: 1 });
SingAlongBookingSchema.index({ eventId: 1, isActive: 1 });
SingAlongBookingSchema.index({ status: 1 });
SingAlongBookingSchema.index({ utr: 1 });
SingAlongBookingSchema.index({ orderId: 1 });
SingAlongBookingSchema.index({ isActive: 1, createdAt: -1 });
SingAlongBookingSchema.index({ isActive: 1, attended: 1 });

