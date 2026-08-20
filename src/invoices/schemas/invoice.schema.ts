import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

// ============================================================
// INVOICE STATUS
// ============================================================

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
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

  @Prop({ type: Types.ObjectId, ref: 'Event', default: null, index: true })
  eventId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', default: null, index: true })
  bookingId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', default: null })
  subscriptionId?: Types.ObjectId;

  // ============================================================
  // INVOICE DETAILS
  // ============================================================

  @Prop({ required: true, unique: true, index: true })
  invoiceNumber!: string;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  description?: string;

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
  // AMOUNTS & CALCULATIONS
  // ============================================================

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ default: 0 })
  taxPercent!: number;

  @Prop({ default: 0 })
  tax!: number;

  @Prop({ default: 0 })
  discount!: number;

  @Prop({ required: true })
  total!: number;

  @Prop({ default: 'INR' })
  currency!: string;

  // ============================================================
  // STATUS & PAYMENT
  // ============================================================

  @Prop({
    type: String,
    enum: InvoiceStatus,
    default: InvoiceStatus.PAID,
  })
  status!: InvoiceStatus;

  @Prop({ trim: true, default: 'ONLINE' })
  paymentMethod?: string;

  @Prop({ trim: true })
  notes?: string;

  // ============================================================
  // DATES
  // ============================================================

  @Prop({ required: true, default: Date.now })
  issuedDate!: Date;

  @Prop()
  dueDate?: Date;

  @Prop()
  paidAt?: Date;

  // ============================================================
  // FLAGS
  // ============================================================

  @Prop({ default: true })
  isActive!: boolean;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
