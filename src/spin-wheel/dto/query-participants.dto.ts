import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QuerySpinParticipantsDto {
  @ApiPropertyOptional({
    description: 'Search by student name, email, student mobile, father mobile, mother mobile, or voucher code',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by interested course title',
  })
  @IsString()
  @IsOptional()
  course?: string;

  @ApiPropertyOptional({
    description: 'Filter by whether student has spun the wheel (true/false)',
  })
  @IsBooleanString()
  @IsOptional()
  hasSpun?: string;

  @ApiPropertyOptional({
    description: 'Filter by campus visit redemption status (true/false)',
  })
  @IsBooleanString()
  @IsOptional()
  isRedeemed?: string;

  @ApiPropertyOptional({
    description: 'Filter by email OTP verification status (true/false)',
  })
  @IsBooleanString()
  @IsOptional()
  isEmailVerified?: string;

  @ApiPropertyOptional({
    default: 1,
    description: 'Page number (1-indexed)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: 'Number of records per page (max 100)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    default: 'createdAt',
    description: 'Field to sort by (createdAt, name, spunAt, redeemedAt)',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    default: 'desc',
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
