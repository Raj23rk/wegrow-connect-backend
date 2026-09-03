import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskSubmissionDocument = TaskSubmission & Document;

export enum EvaluationStatus {
  PENDING = 'PENDING',
  EVALUATED = 'EVALUATED',
}

@Schema({ timestamps: true })
export class TaskSubmission {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  submissionId!: string; // e.g. SUB20260001

  @Prop({ type: Types.ObjectId, ref: 'TaskSession', required: true })
  sessionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Task', required: true })
  taskId!: Types.ObjectId;

  @Prop({ required: true })
  answer!: string;

  @Prop({ required: true, default: Date.now })
  submittedAt!: Date;

  @Prop({ type: Number, default: null })
  score?: number;

  @Prop({ default: '' })
  feedback?: string;

  @Prop({ default: '' })
  remarks?: string;

  @Prop({ default: false })
  isWinner?: boolean;

  @Prop({ default: false })
  selectedForOffer?: boolean;

  @Prop({ default: false })
  offerEmailSent?: boolean;

  @Prop()
  offerEmailSentAt?: Date;

  @Prop({
    type: String,
    enum: EvaluationStatus,
    default: EvaluationStatus.PENDING,
  })
  evaluationStatus: EvaluationStatus = EvaluationStatus.PENDING;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  evaluatedBy?: Types.ObjectId;

  @Prop()
  evaluatedAt?: Date;
}

export const TaskSubmissionSchema = SchemaFactory.createForClass(TaskSubmission);
