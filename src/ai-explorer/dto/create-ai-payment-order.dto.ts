import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateAiPaymentOrderDto {
  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  @IsNotEmpty({ message: 'Student name is required' })
  studentName!: string;

  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: '7th Standard' })
  @IsString()
  @IsNotEmpty({ message: 'Standard is required' })
  standard!: string;

  @ApiProperty({ example: 'Delhi Public School' })
  @IsString()
  @IsNotEmpty({ message: 'School name is required' })
  school!: string;

  @ApiProperty({ example: 'Ramesh Sharma' })
  @IsString()
  @IsNotEmpty({ message: "Father's name is required" })
  fatherName!: string;

  @ApiProperty({ example: 'Sunita Sharma' })
  @IsString()
  @IsNotEmpty({ message: "Mother's name is required" })
  motherName!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty({ message: "Father's phone number is required" })
  @Matches(/^(?:\+?91[\s-]?)?[6-9]\d{9}$/, {
    message: 'Valid 10-digit mobile number required',
  })
  fatherPhone!: string;

  @ApiProperty({ example: '9876543211' })
  @IsString()
  @IsNotEmpty({ message: "Mother's phone number is required" })
  @Matches(/^(?:\+?91[\s-]?)?[6-9]\d{9}$/, {
    message: 'Valid 10-digit mobile number required',
  })
  motherPhone!: string;

  @ApiProperty({ example: '12 Gandhi Road, Chennai' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address!: string;

  @ApiPropertyOptional({ example: 'full' })
  @IsOptional()
  @IsString()
  feePlan?: string;

  @ApiPropertyOptional({ example: 'full' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 43000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 'UPI' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyAiPaymentDto {
  @ApiProperty({ example: 'order_AIE26_1728392812_123' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}

export class SubmitAiUtrDto {
  @ApiProperty({ example: 'order_AIE26_1728392812_123' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ example: '123456789012' })
  @IsString()
  @IsNotEmpty({ message: '12-digit UPI UTR number is required' })
  utr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentScreenshot?: string;
}
