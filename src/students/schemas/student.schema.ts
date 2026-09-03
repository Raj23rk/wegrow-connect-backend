import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentDocument = Student & Document;

export enum StudentType {
  SCHOOL = 'SCHOOL',
  COLLEGE = 'COLLEGE',
}

@Schema({ timestamps: true })
export class Student {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  studentId!: string; // e.g. WG2026000123

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true, trim: true })
  mobile!: string;

  @Prop({ required: true, trim: true })
  whatsapp!: string;

  @Prop({
    type: String,
    enum: StudentType,
    required: true,
  })
  studentType!: StudentType;

  // School Student Details
  @Prop({ trim: true })
  schoolName?: string;

  @Prop({ trim: true })
  class?: string; // 6th to 12th

  // College Student Details
  @Prop({ trim: true })
  collegeName?: string;

  @Prop({ trim: true })
  department?: string;

  @Prop({ trim: true })
  year?: string; // I, II, III, IV

  @Prop({ trim: true, uppercase: true })
  campaignId?: string;

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  assignedTaskId?: Types.ObjectId;

  @Prop({ default: false })
  taskEmailSent?: boolean;

  @Prop()
  taskEmailSentAt?: Date;
}

export const StudentSchema = SchemaFactory.createForClass(Student);

StudentSchema.index({ mobile: 1 });
StudentSchema.index({ email: 1 });
StudentSchema.index({ studentId: 1 }, { unique: true });
