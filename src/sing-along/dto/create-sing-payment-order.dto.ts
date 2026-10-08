import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSingPaymentOrderDto {
  @ApiPropertyOptional({
    example: 'Raj Kumar',
    description: 'Full name of the attendee',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'Raj Kumar',
    description: 'Alias for fullName',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: '10-digit Indian mobile or WhatsApp number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Alias for phone',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    example: 'raj@example.com',
    description: 'Optional email address of attendee',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({
    example: 'raj@example.com',
    description: 'Alias for email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  customerEmail?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of tickets to book (1-10)',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Ticket quantity must be an integer' })
  @Min(1, { message: 'At least 1 ticket must be booked' })
  @Max(10, { message: 'Maximum 10 tickets per booking allowed' })
  @Type(() => Number)
  ticketQty: number = 1;

  @ApiPropertyOptional({
    example: 'SINGALONG-SEP-13-2026',
    description: 'Event ID reference',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    example: 254,
    description: 'Amount in INR (default 254)',
  })
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    example: 254,
    description: 'Alias for amount',
  })
  @IsOptional()
  @Type(() => Number)
  orderAmount?: number;

  @ApiPropertyOptional({
    example: 'Seating preference or notes',
    description: 'Additional notes or remarks',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: 'AI Explorer Enrollment',
    description: 'Alias for notes',
  })
  @IsOptional()
  @IsString()
  orderNote?: string;
}

export class VerifySingPaymentDto {
  @ApiProperty({
    example: 'order_SA26_4821_1726300000',
    description: 'Order ID to verify',
  })
  @IsString()
  @IsNotEmpty({ message: 'Order ID is required' })
  orderId!: string;
}

export class SubmitSingUtrDto {
  @ApiProperty({
    example: '423819284712',
    description: '12-digit UPI Reference / UTR Number',
  })
  @IsString()
  @IsNotEmpty({ message: 'UPI UTR / Transaction ID is required' })
  utr!: string;

  @ApiPropertyOptional({
    example: 'order_SA26_1726300000_123',
    description: 'Optional Order ID if order was already initialized',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    example: 'SA26-4821',
    description: 'Optional Booking ID if booking was already created',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    example: 'Raj Kumar',
    description: 'Attendee full name',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: '10-digit mobile number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'raj@example.com',
    description: 'Email address',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Ticket quantity',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  ticketQty?: number;

  @ApiPropertyOptional({
    example: 254,
    description: 'Amount paid in INR (default 254)',
  })
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    example: '',
    description: 'Payment screenshot URL or base64',
  })
  @IsOptional()
  @IsString()
  paymentScreenshot?: string;

  @ApiPropertyOptional({
    example: 'kumarrk23dev-1@okaxis',
    description: 'UPI ID or payment method used',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

