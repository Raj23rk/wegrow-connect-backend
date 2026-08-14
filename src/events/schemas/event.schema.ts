import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = Event & Document;

export enum EventType {
  STUDENT = 'STUDENT',
  BUSINESS = 'BUSINESS',
}

@Schema({
  timestamps: true,
})
export class Event {
  @Prop({
    required: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  description!: string;

  @Prop({
    enum: EventType,
    required: true,
  })
  type!: EventType;

  @Prop()
  image!: string;

  @Prop()
  location!: string;

  @Prop()
  date!: Date;

  @Prop()
  price!: number;

  @Prop({
    default: true,
  })
  isActive: boolean = false;
}

export const EventSchema = SchemaFactory.createForClass(Event);
