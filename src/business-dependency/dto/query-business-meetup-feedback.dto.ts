import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryBusinessMeetupFeedbackDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by name, business, referral name/mobile' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by experience rating (e.g. Excellent, Good, Average, Needs Improvement)' })
  @IsString()
  @IsOptional()
  experience?: string;

  @ApiPropertyOptional({ description: 'Filter by willingToGrow (Yes, No, Maybe)' })
  @IsString()
  @IsOptional()
  willingToGrow?: string;

  @ApiPropertyOptional({ description: 'Filter by canRefer (Yes, No)' })
  @IsString()
  @IsOptional()
  canRefer?: string;

  @ApiPropertyOptional({ description: 'Filter by status (new, reviewed, contacted, archived)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Start date filter (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Sort field (e.g. submittedAt, name, experience)', default: 'submittedAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'submittedAt';

  @ApiPropertyOptional({ description: 'Sort order (asc or desc)', default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
