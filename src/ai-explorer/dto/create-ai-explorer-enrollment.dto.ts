import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AiEnrollmentStatus,
  AiFeePlan,
  AiPaymentStatus,
} from '../schemas/ai-explorer-enrollment.schema';

export class CreateAiExplorerEnrollmentDto {
  @ApiProperty({
    example: 'Aarav Sharma',
    description: 'Full name of the student',
  })
  @IsString()
  @IsNotEmpty({ message: 'Student name is required' })
  studentName!: string;

  @ApiPropertyOptional({
    example: 'Aarav Sharma',
    description: 'Alias for studentName',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'parent@example.com',
    description: 'Parent / Student Email address for notifications & receipts',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email!: string;

  @ApiProperty({
    example: '7th Standard',
    description: 'Standard / Grade of the student (5th to 12th Standard)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Standard is required' })
  standard!: string;

  @ApiProperty({
    example: 'Delhi Public School',
    description: 'School name',
  })
  @IsString()
  @IsNotEmpty({ message: 'School name is required' })
  school!: string;

  @ApiProperty({
    example: 'Ramesh Sharma',
    description: "Father's name",
  })
  @IsString()
  @IsNotEmpty({ message: "Father's name is required" })
  fatherName!: string;

  @ApiProperty({
    example: 'Sunita Sharma',
    description: "Mother's name",
  })
  @IsString()
  @IsNotEmpty({ message: "Mother's name is required" })
  motherName!: string;

  @ApiProperty({
    example: '9876543210',
    description: "Father's 10-digit mobile number",
  })
  @IsString()
  @IsNotEmpty({ message: "Father's phone number is required" })
  @Matches(/^(?:\+?91[\s-]?)?[6-9]\d{9}$/, {
    message: "Please enter a valid 10-digit mobile number for Father's phone",
  })
  fatherPhone!: string;

  @ApiProperty({
    example: '9876543211',
    description: "Mother's 10-digit mobile number",
  })
  @IsString()
  @IsNotEmpty({ message: "Mother's phone number is required" })
  @Matches(/^(?:\+?91[\s-]?)?[6-9]\d{9}$/, {
    message: "Please enter a valid 10-digit mobile number for Mother's phone",
  })
  motherPhone!: string;

  @ApiProperty({
    example: '12, Gandhi Road, Chennai - 600001',
    description: 'Residential address',
  })
  @IsString()
  @IsNotEmpty({ message: 'Residential address is required' })
  address!: string;

  @ApiPropertyOptional({
    example: 'AI Explorer',
    description: 'Course title',
    default: 'AI Explorer',
  })
  @IsOptional()
  @IsString()
  courseName?: string;

  @ApiPropertyOptional({
    example: 'full',
    enum: AiFeePlan,
    description: "Selected fee plan: 'full' (₹43,000), 'half' (₹22,500), 'term' (₹45,000/₹15,000)",
  })
  @IsOptional()
  @IsString()
  feePlan?: string;

  @ApiPropertyOptional({
    example: 'full',
    description: 'Alias for feePlan',
  })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({
    example: 43000,
    description: 'Payment amount for this transaction in INR',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    example: 43000,
    description: 'Total fee for the full course in INR',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCourseFee?: number;

  @ApiPropertyOptional({
    example: 'UPI',
    description: 'Payment method: UPI, Card, Netbanking, Cashfree, Razorpay, etc.',
    default: 'UPI',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: 'COMPLETED',
    enum: AiPaymentStatus,
    description: 'Payment status',
  })
  @IsOptional()
  @IsEnum(AiPaymentStatus)
  paymentStatus?: AiPaymentStatus;

  @ApiPropertyOptional({
    example: 'order_AIE26_1728392812_123',
    description: 'Payment gateway order ID',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    example: 'pay_1234567890',
    description: 'Gateway payment ID',
  })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({
    example: '123456789012',
    description: 'UPI UTR / Reference ID',
  })
  @IsOptional()
  @IsString()
  utr?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Declaration checkbox accepted',
  })
  @IsOptional()
  @IsBoolean()
  declarationAccepted?: boolean;

  @ApiPropertyOptional({
    example: 'ENROLLED',
    enum: AiEnrollmentStatus,
  })
  @IsOptional()
  @IsEnum(AiEnrollmentStatus)
  status?: AiEnrollmentStatus;

  @ApiPropertyOptional({
    example: 'Batch A - Weekend Lab',
    description: 'Optional admin notes or counselor remarks',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
