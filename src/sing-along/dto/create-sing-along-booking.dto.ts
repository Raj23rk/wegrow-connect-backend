import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SingAlongBookingStatus } from '../schemas/sing-along-booking.schema';

export class CreateSingAlongBookingDto {
  @ApiProperty({
    example: 'Raj Kumar',
    description: 'Full name of the attendee / primary booker',
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @ApiProperty({
    example: '9876543210',
    description: '10-digit Indian WhatsApp or mobile number (with optional +91 prefix)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^(?:\+?91[\s-]?)?[6-9]\d{9}$/, {
    message: 'Please provide a valid Indian mobile number',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: 'SA26-SP-ABC123',
    description: 'Explicit booking ID (e.g. from Sponsor/Promo pass)',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    example: 'TKT-SA26-SP-ABC123',
    description: 'Ticket ID reference',
  })
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiPropertyOptional({
    example: 'raj@example.com',
    description: 'Optional email address',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiProperty({
    example: 2,
    description: 'Number of tickets booked (1 - 10)',
    default: 1,
  })
  @IsInt({ message: 'Ticket quantity must be an integer' })
  @Min(1, { message: 'At least 1 ticket must be booked' })
  @Max(10, { message: 'Maximum 10 tickets per booking allowed' })
  @Type(() => Number)
  ticketQty: number = 1;

  @ApiPropertyOptional({
    example: 0,
    description: 'Total amount (0 for complimentary/sponsor/promo pass)',
  })
  @IsOptional()
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Amount alias',
  })
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    example: 199,
    description: 'Unit price per ticket',
  })
  @IsOptional()
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional({
    example: 'WeGrow Inc.',
    description: 'Company or organization name for sponsor/partner pass',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    example: 'Sivakasi',
    description: 'City or location of attendee',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'VIP_SPONSOR',
    description: 'Pass type classification: VIP_SPONSOR, PROMO, REGULAR',
  })
  @IsOptional()
  @IsString()
  passType?: string;

  @ApiPropertyOptional({
    example: 'SA26_SP01',
    description: 'Promo or Sponsor code applied',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    example: 'SA26_SP01',
    description: 'Sponsor code alias',
  })
  @IsOptional()
  @IsString()
  sponsorCode?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Flag indicating 100% complimentary pass',
  })
  @IsOptional()
  isFree?: boolean;

  @ApiPropertyOptional({
    example: '123456789012',
    description: 'UPI 12-digit transaction ID / UTR reference',
  })
  @IsOptional()
  @IsString()
  utr?: string;

  @ApiPropertyOptional({
    example: 'SINGALONG-SEP-13-2026',
    description: 'Event ID reference',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Payment screenshot URL or base64 data',
  })
  @IsOptional()
  @IsString()
  paymentScreenshot?: string;

  @ApiPropertyOptional({
    example: 'Special seating note',
    description: 'Additional notes or remarks',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: 'kumarrk23dev-1@okaxis',
    description: 'Payment method or UPI ID used (e.g. RAZORPAY or kumarrk23dev-1@okaxis)',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    enum: SingAlongBookingStatus,
    example: SingAlongBookingStatus.CONFIRMED,
    description: 'Booking payment status',
  })
  @IsOptional()
  @IsEnum(SingAlongBookingStatus)
  status?: SingAlongBookingStatus;
}

