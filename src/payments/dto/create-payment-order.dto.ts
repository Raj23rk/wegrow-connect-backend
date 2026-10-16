import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerDetailsDto {
  @ApiPropertyOptional({ example: 'Raj Kumar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'raj@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreatePaymentOrderDto {
  @ApiProperty({
    example: 50000,
    description: 'Amount in paise (e.g. 50000 paise = ₹500). Minimum 100 paise (₹1).',
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(100, { message: 'Amount must be at least 100 paise' })
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Explicit amount in paise',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amountInPaise?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Flag if input amount was in Rupees and needs conversion',
  })
  @IsOptional()
  @IsBoolean()
  inRupees?: boolean;

  @ApiPropertyOptional({
    example: 'INR',
    default: 'INR',
    description: 'Currency code',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiPropertyOptional({
    example: 'GENERAL',
    description: 'Purpose or category of payment',
  })
  @IsOptional()
  @IsString()
  purpose?: string = 'GENERAL';

  @ApiPropertyOptional({
    example: 'receipt_12345',
    description: 'Internal receipt identifier',
  })
  @IsOptional()
  @IsString()
  receipt?: string;

  @ApiPropertyOptional({
    description: 'Customer contact details',
    type: CustomerDetailsDto,
  })
  @IsOptional()
  customer?: CustomerDetailsDto;

  @ApiPropertyOptional({
    example: { bookingId: 'SA26-4821', qty: 2 },
    description: 'Optional metadata / notes passed to Razorpay',
  })
  @IsOptional()
  notes?: Record<string, any>;
}
