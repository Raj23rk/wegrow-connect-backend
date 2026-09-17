import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryBusinessDependencyDto {
  @ApiPropertyOptional({
    description: 'Filter by submission type: test, diagnostic, Business Test, Business Diagnostic, or all',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by category: ALL, red, high, growing, self or category string',
  })
  @IsOptional()
  @IsString()
  category?: string;

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
    description: 'Search across name, company, phone, email, industry, category, challenge',
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
    description: 'Sort option: newest, oldest, score_high, score_low, or field name',
    default: 'newest',
  })
  @IsOptional()
  @IsString()
  sortBy: string = 'newest';

  @ApiPropertyOptional({
    description: 'Sort direction: asc or desc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder: string = 'desc';

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
