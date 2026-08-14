import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  NEW_EVENT = 'NEW_EVENT',
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  LOGIN = 'LOGIN',
  GENERAL = 'GENERAL',
  BOOKING = 'BOOKING',
  SYSTEM = 'SYSTEM',
}

@Schema({
  timestamps: true,
})
export class Notification {
  // ============================================================
  // USER
  // ============================================================

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  // ============================================================
  // TITLE
  // ============================================================

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  // ============================================================
  // MESSAGE
  // ============================================================

  @Prop({
    required: true,
    trim: true,
  })
  message!: string;

  // ============================================================
  // NOTIFICATION TYPE
  // ============================================================

  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.GENERAL,
  })
  type!: NotificationType;

  // ============================================================
  // OPTIONAL EVENT ID
  // ============================================================

  @Prop({
    type: Types.ObjectId,
    ref: 'Event',
    default: null,
  })
  eventId?: Types.ObjectId;

  // ============================================================
  // READ STATUS
  // ============================================================

  @Prop({
    default: false,
    index: true,
  })
  isRead!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
