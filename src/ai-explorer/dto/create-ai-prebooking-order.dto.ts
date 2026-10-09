import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { StudentItemDto } from './create-ai-explorer-prebooking.dto';

export class CreateAiPrebookingOrderDto {
  @ApiPropertyOptional({
    description: 'Array of student items for family registration',
    type: [StudentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentItemDto)
  @IsOptional()
  students?: StudentItemDto[];

  @ApiPropertyOptional({ description: 'Single Student Name (fallback)', example: 'Aarav Kumar' })
  @IsString()
  @IsOptional()
  studentName?: string;

  @ApiPropertyOptional({ description: 'Single Student Name alias', example: 'Aarav Kumar' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Customer Name alias', example: 'Aarav Kumar' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Single Student Standard (fallback)', example: '6th Standard' })
  @IsString()
  @IsOptional()
  standard?: string;

  @ApiPropertyOptional({ description: 'Single Student School (fallback)', example: 'Delhi Public School' })
  @IsString()
  @IsOptional()
  school?: string;

  @ApiProperty({ description: 'Parent / Customer Email Address', example: 'parent@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Customer Email Alias', example: 'parent@gmail.com' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Mail ID Alias', example: 'parent@gmail.com' })
  @IsEmail()
  @IsOptional()
  mailId?: string;

  @ApiPropertyOptional({ description: "Father's Name", example: 'Rajesh Kumar' })
  @IsString()
  @IsOptional()
  fatherName?: string;

  @ApiPropertyOptional({ description: "Mother's Name", example: 'Priya Kumar' })
  @IsString()
  @IsOptional()
  motherName?: string;

  @ApiProperty({ description: "Father's or Parent Phone Number", example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  fatherPhone!: string;

  @ApiPropertyOptional({ description: 'Customer Phone Alias', example: '9876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Customer Phone Alias', example: '9876543210' })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ description: "Mother's Phone Number", example: '9876543211' })
  @IsString()
  @IsOptional()
  motherPhone?: string;

  @ApiPropertyOptional({ description: 'Residential Address', example: 'No 12, Anna Nagar, Chennai' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Total Order Amount in Rs (calculated automatically as students count * 1000)', example: 1000 })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Order Amount alias', example: 1000 })
  @IsNumber()
  @IsOptional()
  orderAmount?: number;

  @ApiPropertyOptional({ example: 'AI Explorer' })
  @IsString()
  @IsOptional()
  course?: string;

  @ApiPropertyOptional({ example: 'AI Explorer' })
  @IsString()
  @IsOptional()
  courseName?: string;

  @ApiPropertyOptional({ example: 90000 })
  @IsNumber()
  @IsOptional()
  totalFee?: number;

  @ApiPropertyOptional({ description: 'Payment Method', example: 'Cashfree' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Order Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Order Note Alias' })
  @IsString()
  @IsOptional()
  orderNote?: string;
}

export class SubmitAiPrebookingUtrDto {
  @ApiProperty({ description: 'Order ID or Prebooking ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: '12-digit UPI UTR / Bank Reference Number' })
  @IsString()
  @IsNotEmpty()
  utr!: string;

  @ApiPropertyOptional({ description: 'Prebooking ID alias' })
  @IsString()
  @IsOptional()
  prebookingId?: string;
}

export class VerifyAiPrebookingPaymentDto {
  @ApiProperty({ description: 'Cashfree or Generated Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
