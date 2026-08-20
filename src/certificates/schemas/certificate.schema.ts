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

  @Prop({ type: Types.ObjectId, ref: 'Booking', default: null, index: true })
  bookingId?: Types.ObjectId;

  // ============================================================
  // CERTIFICATE DETAILS
  // ============================================================

  @Prop({ required: true, unique: true, index: true })
  certificateNumber!: string;

  @Prop({ required: true, trim: true })
  recipientName!: string;

  @Prop({ required: true, trim: true })
  eventTitle!: string;

  @Prop()
  description?: string;

  @Prop({ default: 'A+' })
  grade?: string;

  @Prop({ default: '2026' })
  startYear?: string;

  @Prop({ default: '2026' })
  endYear?: string;

  @Prop({ required: true, default: Date.now })
  eventDate!: Date;

  @Prop({ required: true, default: Date.now })
  issuedDate!: Date;

  // ============================================================
  // FILE & STATUS
  // ============================================================

  @Prop()
  filePath?: string;

  @Prop({ default: false })
  isDownloaded!: boolean;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
