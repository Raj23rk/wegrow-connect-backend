import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiExplorerCounterDocument = AiExplorerCounter & Document;

@Schema({ collection: 'ai_explorer_counters', timestamps: true })
export class AiExplorerCounter {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, default: 1000 })
  seq!: number;
}

export const AiExplorerCounterSchema =
  SchemaFactory.createForClass(AiExplorerCounter);
