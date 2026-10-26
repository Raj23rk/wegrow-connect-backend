import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SpinRewardBudgetDocument = SpinRewardBudget & Document;

@Schema({ timestamps: true, collection: 'spin_reward_budgets' })
export class SpinRewardBudget {
  @Prop({ required: true, unique: true, trim: true })
  rewardId!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  badge!: string;

  @Prop({ required: true, trim: true })
  category!: string; // 'bonus_class' | 'project_review' | 'workshop_pass' | 'discount' | 'mentorship'

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, trim: true })
  terms!: string;

  @Prop({ required: true, default: 50 })
  maxTotalBudget!: number;

  @Prop({ required: true, default: 0 })
  allocatedCount!: number;

  @Prop({ required: true, default: 10 })
  probabilityWeight!: number;

  @Prop({ required: true, trim: true })
  color!: string;

  @Prop({ required: true, trim: true })
  textColor!: string;

  @Prop({ required: true, trim: true })
  icon!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const SpinRewardBudgetSchema =
  SchemaFactory.createForClass(SpinRewardBudget);
