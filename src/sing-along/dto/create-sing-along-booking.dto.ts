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
    description: '10-digit Indian WhatsApp or mobile number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please provide a valid 10-digit Indian mobile number',
  })
  phone!: string;

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

