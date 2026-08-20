import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../schemas/invoice.schema';

export class InvoiceItemDto {
  @ApiProperty({ example: 'Python Full Stack Bootcamp Ticket' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 999 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 999 })
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    example: '6a7322a6d509bcbf2d7a7575',
    description: 'User ID to bill',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({
    example: '6a7327f64cb492d534684949',
    description: 'Event ID (optional)',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    example: '6a8455d8fb3236dde9a5c2e6',
    description: 'Booking ID (optional)',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    example: '64f1b2c3d4e5f6g7h8i9j0k3',
    description: 'Subscription ID (optional)',
  })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiPropertyOptional({
    example: 'Python Full Stack Bootcamp - Event Registration',
    description: 'Invoice title / subject',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Registration fee for Python Full Stack Bootcamp at Bangalore',
    description: 'Invoice description / note',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 999,
    description: 'Direct amount (used if items array is omitted)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ type: [InvoiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];

  @ApiPropertyOptional({
    example: 999,
    description: 'Subtotal amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiPropertyOptional({
    example: 18,
    description: 'Tax percentage (e.g. 18 for 18% GST)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Tax amount in currency',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Discount amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: 999,
    description: 'Total final amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    enum: InvoiceStatus,
    example: InvoiceStatus.PAID,
    default: InvoiceStatus.PAID,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ example: 'ONLINE', default: 'ONLINE' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'Payment received via Razorpay / Card' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-08-19T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  issuedDate?: string;

  @ApiPropertyOptional({ example: '2026-08-26T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  dueDate?: string;
}
