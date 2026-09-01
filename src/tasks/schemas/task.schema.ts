import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export enum TaskCategory {
  BUSINESS = 'Business',
  TECHNOLOGY = 'Technology',
  CREATIVITY = 'Creativity',
  DATA = 'Data',
  ENTREPRENEURSHIP = 'Entrepreneurship',
}

export enum TargetAudienceType {
  ALL = 'ALL',
  SCHOOL = 'SCHOOL',
  COLLEGE = 'COLLEGE',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  instructions!: string;

  @Prop({
    type: String,
    enum: TaskCategory,
    required: true,
  })
  category!: TaskCategory;

  @Prop({ default: 60 }) // Default 60 minutes
  duration: number = 60;

  @Prop({ default: 100 })
  maxMarks: number = 100;

  @Prop({
    type: String,
    enum: TargetAudienceType,
    default: TargetAudienceType.ALL,
  })
  targetType: TargetAudienceType = TargetAudienceType.ALL;

  @Prop({ trim: true })
  targetDepartment?: string;

  @Prop({ trim: true })
  targetYear?: string;

  @Prop({ trim: true })
  targetClass?: string;

  @Prop({ trim: true, uppercase: true })
  targetCampaignId?: string;

  @Prop({ default: true })
  isActive: boolean = true;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
