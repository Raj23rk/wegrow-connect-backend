import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CertificateDocument = HydratedDocument<Certificate>;

// ============================================================
// CERTIFICATE SCHEMA
// ============================================================

@Schema({ timestamps: true })
export class Certificate {
  // ============================================================
  // RELATIONS
  // ============================================================

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  bookingId!: Types.ObjectId;

  // ============================================================
  // CERTIFICATE DETAILS
  // ============================================================

  @Prop({ required: true, unique: true })
  certificateNumber!: string;

  @Prop({ required: true, trim: true })
  recipientName!: string;

  @Prop({ required: true, trim: true })
  eventTitle!: string;

  @Prop({ required: true })
  eventDate!: Date;

  @Prop({ required: true })
  issuedDate!: Date;

  // ============================================================
  // FILE
  // ============================================================

  @Prop()
  filePath?: string;

  // ============================================================
  // STATUS
  // ============================================================

  @Prop({ default: false })
  isDownloaded!: boolean;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
