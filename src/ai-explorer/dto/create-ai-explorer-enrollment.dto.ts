import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EnrollmentStudentItemDto {
  @ApiPropertyOptional({ example: 'Raja' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Raja' })
  @IsOptional()
  @IsString()
  studentName?: string;

  @ApiPropertyOptional({ example: '5th Standard' })
  @IsOptional()
  @IsString()
  standard?: string;

  @ApiPropertyOptional({ example: 'KVS School' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ example: 'Weekend Batch (Sat & Sun)' })
  @IsOptional()
  @IsString()
  preferredBatch?: string;

  @ApiPropertyOptional({ example: 'Batch A' })
  @IsOptional()
  @IsString()
  batch?: string;

  @ApiPropertyOptional({ example: '10:00 AM - 12:00 PM' })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '2014-05-12' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ example: '11' })
  @IsOptional()
  age?: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateAiExplorerEnrollmentDto {
  @ApiPropertyOptional({
    description: 'Array of student objects for family / sibling enrollment',
    type: [EnrollmentStudentItemDto],
  })
  @IsOptional()
  @IsArray()
  students?: EnrollmentStudentItemDto[];

  @ApiPropertyOptional({ example: 2, description: 'Number of students' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  studentCount?: number;

  @ApiPropertyOptional({ example: 2, description: 'Total students count' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalStudents?: number;

  @ApiPropertyOptional({
    example: 'Aarav Sharma',
    description: 'Full name of the student',
  })
  @IsOptional()
  @IsString()
  studentName?: string;

  @ApiPropertyOptional({
    example: 'Aarav Sharma',
    description: 'Alias for studentName',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Aarav Sharma',
    description: 'Alias for studentName',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'Aarav Sharma',
    description: 'Alias for studentName',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    example: 'parent@example.com',
    description: 'Parent / Student Email address for notifications & receipts',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    example: 'parent@example.com',
    description: 'Alias for email',
  })
  @IsOptional()
  @IsString()
  mailId?: string;

  @ApiPropertyOptional({
    example: 'parent@example.com',
    description: 'Alias for email',
  })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({
    example: '7th Standard',
    description: 'Standard / Grade of the student (5th to 12th Standard)',
  })
  @IsOptional()
  @IsString()
  standard?: string;

  @ApiPropertyOptional({
    example: 'Delhi Public School',
    description: 'School name',
  })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({
    example: 'Ramesh Sharma',
    description: "Father's name",
  })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({
    example: 'Sunita Sharma',
    description: "Mother's name",
  })
  @IsOptional()
  @IsString()
  motherName?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: "Father's 10-digit mobile number",
  })
  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Customer phone alias',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Phone alias',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: '9876543211',
    description: "Mother's 10-digit mobile number",
  })
  @IsOptional()
  @IsString()
  motherPhone?: string;

  @ApiPropertyOptional({
    example: '12, Gandhi Road, Chennai - 600001',
    description: 'Residential address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'AI Explorer',
    description: 'Course title',
    default: 'AI Explorer',
  })
  @IsOptional()
  @IsString()
  courseName?: string;

  @ApiPropertyOptional({
    example: 'AI Explorer',
    description: 'Course title alias',
  })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiPropertyOptional({
    example: 'full',
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
    example: 'Term Wise Payment (Term I)',
    description: 'Plan name description',
  })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiPropertyOptional({
    example: 'Term I',
    description: 'Selected term identifier',
  })
  @IsOptional()
  @IsString()
  selectedTerm?: string;

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
    description: 'Alias for amount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderAmount?: number;

  @ApiPropertyOptional({
    example: 43000,
    description: 'Total fee for the full course in INR',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCourseFee?: number;

  @ApiPropertyOptional({
    example: 90000,
    description: 'Total fee alias for multiple children or overall course',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalFee?: number;

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
    description: 'Payment status: PAID, COMPLETED, PENDING, FAILED',
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

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
    example: 'ORD_61004836',
    description: 'Transaction ID / Payment ID alias',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    example: 'ORD_61004836',
    description: 'Txnid alias',
  })
  @IsOptional()
  @IsString()
  txnid?: string;

  @ApiPropertyOptional({
    example: 'cf_123456',
    description: 'Cashfree Payment ID',
  })
  @IsOptional()
  @IsString()
  cfPaymentId?: string;

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
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'Batch A - Weekend Lab',
    description: 'Optional admin notes or counselor remarks',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

