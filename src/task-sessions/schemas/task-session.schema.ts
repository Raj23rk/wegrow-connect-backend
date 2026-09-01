import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskSessionDocument = TaskSession & Document;

export enum SessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  EXPIRED = 'EXPIRED',
}

export class SuspiciousEvent {
  @Prop({ required: true })
  eventType!: string; // TAB_SWITCH, FULLSCREEN_EXIT, COPY_ATTEMPT, PASTE_ATTEMPT, SHORTCUT_ATTEMPT

  @Prop({ default: Date.now })
  timestamp: Date = new Date();

  @Prop()
  details?: string;
}

@Schema({ timestamps: true })
export class TaskSession {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Task', required: true })
  taskId!: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  startedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  submittedAt?: Date;

  @Prop({
    type: String,
    enum: SessionStatus,
    default: SessionStatus.IN_PROGRESS,
  })
  status: SessionStatus = SessionStatus.IN_PROGRESS;

  @Prop({ default: '' })
  latestAnswer!: string;

  // Anti-cheating metrics
  @Prop({ default: 0 })
  tabSwitchCount: number = 0;

  @Prop({ default: 0 })
  fullscreenExitCount: number = 0;

  @Prop({ default: 0 })
  copyAttemptCount: number = 0;

  @Prop({ default: 0 })
  pasteAttemptCount: number = 0;

  @Prop({ type: [SuspiciousEvent], default: [] })
  suspiciousActivity: SuspiciousEvent[] = [];
}

export const TaskSessionSchema = SchemaFactory.createForClass(TaskSession);
