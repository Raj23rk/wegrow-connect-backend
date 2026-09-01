import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { StudentType } from '../schemas/student.schema';

export class RegisterStudentTaskDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must contain at least 2 characters' })
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Must be a valid email format' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit Indian number',
  })
  mobile!: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Use mobile number as WhatsApp number',
  })
  @IsBoolean()
  @IsOptional()
  useMobileAsWhatsapp?: boolean;

  @ApiProperty({ enum: StudentType, example: StudentType.COLLEGE })
  @IsEnum(StudentType)
  @IsNotEmpty()
  studentType!: StudentType;

  // School fields
  @ApiPropertyOptional({ example: 'St. Mary High School' })
  @IsString()
  @IsOptional()
  schoolName?: string;

  @ApiPropertyOptional({ example: '10th' })
  @IsString()
  @IsOptional()
  class?: string;

  // College fields
  @ApiPropertyOptional({ example: 'WeGrow College of Management' })
  @IsString()
  @IsOptional()
  collegeName?: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'III' })
  @IsString()
  @IsOptional()
  year?: string;

  @ApiPropertyOptional({ example: 'NEWSPAPER01' })
  @IsString()
  @IsOptional()
  campaignId?: string;
}
