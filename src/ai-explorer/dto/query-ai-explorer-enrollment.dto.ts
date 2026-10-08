import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  AiEnrollmentStatus,
  AiFeePlan,
  AiPaymentStatus,
} from '../schemas/ai-explorer-enrollment.schema';

export class QueryAiExplorerEnrollmentDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Search by student name, school, email, phone, or enrollment ID',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by standard (e.g. 5th Standard)',
  })
  @IsOptional()
  @IsString()
  standard?: string;

  @ApiPropertyOptional({
    enum: AiFeePlan,
    description: 'Filter by fee plan: full, half, term',
  })
  @IsOptional()
  @IsString()
  feePlan?: string;

  @ApiPropertyOptional({
    enum: AiPaymentStatus,
    description: 'Filter by payment status: PENDING, COMPLETED, FAILED, REFUNDED',
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({
    enum: AiEnrollmentStatus,
    description: 'Filter by enrollment status: ENROLLED, PENDING_PAYMENT, ACTIVE, COMPLETED, CANCELLED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter from start date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter up to end date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Sort field: createdAt, studentName, amount, standard',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction: asc or desc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder: 'asc' | 'desc' = 'desc';
}
