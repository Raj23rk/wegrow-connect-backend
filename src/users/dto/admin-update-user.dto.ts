import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { UserRole } from '../schemas/user.schema';

export class AdminUpdateUserDto {
  // ================================
  // BASIC DETAILS
  // ================================

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // ================================
  // PASSWORD
  // ================================

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  // ================================
  // ROLE
  // ================================

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // ================================
  // STUDENT
  // ================================

  @IsOptional()
  @IsString()
  college?: string;

  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  year?: string;

  // ================================
  // BUSINESS
  // ================================

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsNumber()
  experience?: number;

  @IsOptional()
  @IsString()
  website?: string;

  // ================================
  // LOCATION
  // ================================

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  // ================================
  // STATUS
  // ================================

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
