import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum QueryAbout {
  BUSINESS = 'BUSINESS',
  COURSE = 'COURSE',
}

@Schema({
  timestamps: true,
})
export class Contact extends Document {
  @Prop({
    required: true,
    trim: true,
  })
  fullName!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    trim: true,
  })
  mobileNumber!: string;

  @Prop({
    type: [String],
    enum: Object.values(QueryAbout),
    required: true,
  })
  queryAbout!: QueryAbout[];

  @Prop({
    required: true,
    trim: true,
  })
  query!: string;

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop({
    default: false,
  })
  isResolved!: boolean;
}

export const ContactSchema =
  SchemaFactory.createForClass(Contact);