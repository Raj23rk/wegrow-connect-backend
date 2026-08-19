import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

// ============================================================
// INVOICE STATUS
// ============================================================

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
}

// ============================================================
// LINE ITEM SUB-SCHEMA
// ============================================================

export class InvoiceItem {
  description!: string;
  quantity!: number;
  unitPrice!: number;
  amount!: number;
}

// ============================================================
// INVOICE SCHEMA
// ============================================================

@Schema({ timestamps: true })
export class Invoice {
  // ============================================================
  // RELATIONS
  // ============================================================

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', default: null })
  bookingId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', default: null })
  subscriptionId?: Types.ObjectId;

  // ============================================================
  // INVOICE DETAILS
  // ============================================================

  @Prop({ required: true, unique: true })
  invoiceNumber!: string;

  @Prop({
    type: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        amount: Number,
      },
    ],
    default: [],
  })
  items!: InvoiceItem[];

  // ============================================================
  // AMOUNTS
  // ============================================================

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ default: 0 })
  tax!: number;

  @Prop({ required: true })
  total!: number;

  @Prop({ default: 'INR' })
  currency!: string;

  // ============================================================
  // STATUS
  // ============================================================

  @Prop({
    type: String,
    enum: InvoiceStatus,
    default: InvoiceStatus.ISSUED,
  })
  status!: InvoiceStatus;

  // ============================================================
  // DATES
  // ============================================================

  @Prop({ required: true })
  issuedDate!: Date;

  @Prop()
  dueDate?: Date;

  // ============================================================
  // FILE
  // ============================================================

  @Prop()
  filePath?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
