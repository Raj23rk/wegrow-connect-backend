import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ArtParticipantDocument = ArtParticipant & Document;

export enum ArtParticipantStatus {
  CONFIRMED = 'CONFIRMED',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'art_competition_participants' })
export class ArtParticipant {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string; // WhatsApp / Mobile Number

  @Prop({ default: '', trim: true, lowercase: true })
  email?: string;

  @Prop({ required: true, trim: true })
  collegeName!: string;

  @Prop({ required: true, trim: true })
  degreeAndYear!: string;

  @Prop({ default: 'Color Pencils & Oil Pastels', trim: true })
  preferredArtMedium!: string;

  @Prop({ required: true, unique: true, trim: true })
  registrationNumber!: string;

  @Prop({
    type: String,
    enum: ArtParticipantStatus,
    default: ArtParticipantStatus.CONFIRMED,
  })
  status: ArtParticipantStatus = ArtParticipantStatus.CONFIRMED;

  @Prop({ default: false })
  attended: boolean = false;

  @Prop({ default: true })
  isActive: boolean = true;

  @Prop({ default: '', trim: true })
  notes?: string;
}

export const ArtParticipantSchema = SchemaFactory.createForClass(ArtParticipant);

ArtParticipantSchema.index({ phone: 1 });
ArtParticipantSchema.index(
  { phone: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'phone_isActive_unique',
  },
);
ArtParticipantSchema.index({ email: 1 });
ArtParticipantSchema.index({ collegeName: 1 });
ArtParticipantSchema.index({ registrationNumber: 1 }, { unique: true });
ArtParticipantSchema.index({ preferredArtMedium: 1 });
ArtParticipantSchema.index({ status: 1 });
ArtParticipantSchema.index({ createdAt: -1 });
