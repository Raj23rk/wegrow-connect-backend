import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';

import { UserRole } from '../schemas/user.schema';

export class AdminCreateUserDto {
  // ================================
  // BASIC DETAILS
  // ================================

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // ================================
  // ROLE
  // ================================

  @IsEnum(UserRole)
  role!: UserRole;

  // ================================
  // STUDENT
  // ================================

  @IsString()
  @IsOptional()
  college?: string;

  @IsString()
  @IsOptional()
  course?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  year?: string;

  // ================================
  // BUSINESS
  // ================================

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  // ================================
  // LOCATION
  // ================================

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  // ================================
  // STATUS
  // ================================

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
