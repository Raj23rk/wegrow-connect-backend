import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({
    example: 'order_OPs4sfsff',
    description: 'Razorpay Order ID',
  })
  @IsString()
  @IsNotEmpty({ message: 'Razorpay order ID is required' })
  razorpayOrderId!: string;

  @ApiProperty({
    example: 'pay_OPs5sfsff',
    description: 'Razorpay Payment ID',
  })
  @IsString()
  @IsNotEmpty({ message: 'Razorpay payment ID is required' })
  razorpayPaymentId!: string;

  @ApiProperty({
    example: '5a4b7...signature',
    description: 'Razorpay HMAC-SHA256 Signature',
  })
  @IsString()
  @IsNotEmpty({ message: 'Razorpay signature is required' })
  razorpaySignature!: string;

  @ApiPropertyOptional({
    example: 'SA26-4821',
    description: 'Associated Booking ID if payment is for Sing Along Ticket',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Extra payload or metadata to link',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
