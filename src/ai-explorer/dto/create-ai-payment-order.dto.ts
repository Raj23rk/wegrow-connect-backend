import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EnrollmentStudentItemDto } from './create-ai-explorer-enrollment.dto';

export class CreateAiPaymentOrderDto {
  @ApiPropertyOptional({
    description: 'Array of student objects for family / sibling enrollment',
    type: [EnrollmentStudentItemDto],
  })
  @IsOptional()
  @IsArray()
  students?: EnrollmentStudentItemDto[];

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  studentCount?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalStudents?: number;

  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  studentName?: string;

  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 'parent@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'parent@example.com' })
  @IsOptional()
  @IsString()
  mailId?: string;

  @ApiPropertyOptional({ example: 'parent@example.com' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ example: '7th Standard' })
  @IsOptional()
  @IsString()
  standard?: string;

  @ApiPropertyOptional({ example: 'Delhi Public School' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ example: 'Ramesh Sharma' })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({ example: 'Sunita Sharma' })
  @IsOptional()
  @IsString()
  motherName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @IsString()
  motherPhone?: string;

  @ApiPropertyOptional({ example: '12 Gandhi Road, Chennai' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'full' })
  @IsOptional()
  @IsString()
  feePlan?: string;

  @ApiPropertyOptional({ example: 'full' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 'Term Wise Payment (Term I)' })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiPropertyOptional({ example: 'Term I' })
  @IsOptional()
  @IsString()
  selectedTerm?: string;

  @ApiPropertyOptional({ example: 43000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 43000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderAmount?: number;

  @ApiPropertyOptional({ example: 90000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalFee?: number;

  @ApiPropertyOptional({ example: 43000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCourseFee?: number;

  @ApiPropertyOptional({ example: 'UPI' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderNote?: string;
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
