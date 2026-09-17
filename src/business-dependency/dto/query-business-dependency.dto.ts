import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum QueryTypeFilter {
  ALL = 'all',
  TEST = 'test',
  DIAGNOSTIC = 'diagnostic',
}

export class QueryBusinessDependencyDto {
  @ApiPropertyOptional({
    description: 'Filter by submission type: test, diagnostic, or all',
    enum: QueryTypeFilter,
    default: QueryTypeFilter.ALL,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Search across name, company, phone, email, and industry',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by industry',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Filter by business size',
  })
  @IsOptional()
  @IsString()
  businessSize?: string;

  @ApiPropertyOptional({
    description: 'Filter by biggest challenge',
  })
  @IsOptional()
  @IsString()
  biggestChallenge?: string;

  @ApiPropertyOptional({
    description: 'Filter by status: pending, contacted, scheduled, completed, archived',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Sort field: createdAt, fullName, company, score',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction: asc or desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Start date filter (ISO string)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter (ISO string)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
