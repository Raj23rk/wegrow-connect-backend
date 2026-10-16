import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiPropertyOptional({
    example: 'order_OPs4sfsff',
    description: 'Razorpay Order ID (snake_case)',
  })
  @IsOptional()
  @IsString()
  razorpay_order_id?: string;

  @ApiPropertyOptional({
    example: 'order_OPs4sfsff',
    description: 'Razorpay Order ID (camelCase)',
  })
  @IsOptional()
  @IsString()
  razorpayOrderId?: string;

  @ApiPropertyOptional({
    example: 'order_OPs4sfsff',
    description: 'Order ID alias',
  })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiPropertyOptional({
    example: 'order_OPs4sfsff',
    description: 'Order ID alias',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    example: 'pay_OPs5sfsff',
    description: 'Razorpay Payment ID (snake_case)',
  })
  @IsOptional()
  @IsString()
  razorpay_payment_id?: string;

  @ApiPropertyOptional({
    example: 'pay_OPs5sfsff',
    description: 'Razorpay Payment ID (camelCase)',
  })
  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;

  @ApiPropertyOptional({
    example: 'pay_OPs5sfsff',
    description: 'Payment ID alias',
  })
  @IsOptional()
  @IsString()
  payment_id?: string;

  @ApiPropertyOptional({
    example: 'pay_OPs5sfsff',
    description: 'Payment ID alias',
  })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({
    example: '5a4b7...signature',
    description: 'Razorpay HMAC-SHA256 Signature (snake_case)',
  })
  @IsOptional()
  @IsString()
  razorpay_signature?: string;

  @ApiPropertyOptional({
    example: '5a4b7...signature',
    description: 'Razorpay HMAC-SHA256 Signature (camelCase)',
  })
  @IsOptional()
  @IsString()
  razorpaySignature?: string;

  @ApiPropertyOptional({
    example: '5a4b7...signature',
    description: 'Signature alias',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({
    example: 'SA26-4821',
    description: 'Associated Booking ID',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Extra payload or metadata to link',
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Payment purpose (e.g. AI_EXPLORER_PREBOOKING, GENERAL)',
  })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    description: 'Payment amount in INR',
  })
  @IsOptional()
  amount?: number;
}
