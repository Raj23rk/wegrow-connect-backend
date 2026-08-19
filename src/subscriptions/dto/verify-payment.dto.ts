import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_ABCxyz123' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId!: string;

  @ApiProperty({ example: 'pay_ABCxyz123' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId!: string;

  @ApiProperty({ example: 'signature_hash' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature!: string;
}
