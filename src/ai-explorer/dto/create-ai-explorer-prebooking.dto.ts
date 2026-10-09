import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StudentItemDto {
  @ApiProperty({ description: 'Student Full Name', example: 'Aarav Kumar' })
  @IsString()
  @IsNotEmpty()
  studentName!: string;

  @ApiProperty({ description: 'Standard / Grade', example: '6th Standard' })
  @IsString()
  @IsNotEmpty()
  standard!: string;

  @ApiProperty({ description: 'School Name', example: 'Delhi Public School' })
  @IsString()
  @IsNotEmpty()
  school!: string;

  @ApiPropertyOptional({ description: 'Gender', example: 'Male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Date of Birth', example: '2014-05-12' })
  @IsString()
  @IsOptional()
  dob?: string;
}

export class CreateAiExplorerPrebookingDto {
  @ApiPropertyOptional({
    description: 'Array of student items for family registration (1, 2, 3 or more children)',
    type: [StudentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentItemDto)
  @IsOptional()
  students?: StudentItemDto[];

  // Support single student direct fields as fallback
  @ApiPropertyOptional({ description: 'Single Student Name (fallback)', example: 'Aarav Kumar' })
  @IsString()
  @IsOptional()
  studentName?: string;

  @ApiPropertyOptional({ description: 'Single Student Standard (fallback)', example: '6th Standard' })
  @IsString()
  @IsOptional()
  standard?: string;

  @ApiPropertyOptional({ description: 'Single Student School (fallback)', example: 'Delhi Public School' })
  @IsString()
  @IsOptional()
  school?: string;

  @ApiProperty({ description: 'Parent / Student Email', example: 'parent@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: "Father's Name", example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  fatherName!: string;

  @ApiPropertyOptional({ description: "Mother's Name", example: 'Priya Kumar' })
  @IsString()
  @IsOptional()
  motherName?: string;

  @ApiProperty({ description: "Father's Phone Number", example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  fatherPhone!: string;

  @ApiPropertyOptional({ description: "Mother's Phone Number", example: '9876543211' })
  @IsString()
  @IsOptional()
  motherPhone?: string;

  @ApiProperty({ description: 'Residential Address', example: 'No 12, Anna Nagar, Chennai' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiPropertyOptional({ description: 'Amount per student in Rs', example: 1000 })
  @IsNumber()
  @IsOptional()
  amountPerStudent?: number;

  @ApiPropertyOptional({ description: 'Total Prebooking amount in Rs', example: 1000 })
  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Amount alias', example: 1000 })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Payment Method', example: 'UPI' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Payment Status', example: 'COMPLETED' })
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Order ID or Transaction ID' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Transaction ID alias' })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Gateway Payment ID' })
  @IsString()
  @IsOptional()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'UPI UTR Reference ID' })
  @IsString()
  @IsOptional()
  utr?: string;

  @ApiPropertyOptional({ description: 'Declaration accepted flag', default: true })
  @IsBoolean()
  @IsOptional()
  declarationAccepted?: boolean;

  @ApiPropertyOptional({ description: 'Admin or Booking Notes' })
  @IsString()
  @IsOptional()
  adminNotes?: string;

  @ApiPropertyOptional({ description: 'Registration status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'AI Explorer Pre-Booking' })
  @IsString()
  @IsOptional()
  course?: string;

  @ApiPropertyOptional({ example: 'AI Explorer Pre-Booking' })
  @IsString()
  @IsOptional()
  courseName?: string;

  @ApiPropertyOptional({ example: 90000 })
  @IsNumber()
  @IsOptional()
  totalFee?: number;
}
