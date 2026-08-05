import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/schemas/user.schema';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  // Student Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  college?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  skills?: string[];

  // Business Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  experience?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;
}