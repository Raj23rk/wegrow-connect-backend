import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SingAlongCounterDocument = SingAlongCounter & Document;

@Schema({ collection: 'sing_along_counters', timestamps: true })
export class SingAlongCounter {
  @Prop({ required: true, unique: true, index: true })
  name!: string;

  @Prop({ required: true, default: 0 })
  seq!: number;
}

export const SingAlongCounterSchema =
  SchemaFactory.createForClass(SingAlongCounter);
