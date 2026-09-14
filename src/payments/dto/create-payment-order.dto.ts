import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
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
    example: 199,
    description: 'Amount in INR (Rupees)',
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(1, { message: 'Amount must be at least ₹1' })
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({
    example: 'INR',
    default: 'INR',
    description: 'Currency code',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiPropertyOptional({
    example: 'SING_ALONG_TICKET',
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
