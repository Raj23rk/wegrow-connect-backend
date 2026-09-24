import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TeaserSubmissionStatus } from '../schemas/event-teaser.schema';

export class QueryEventTeaserDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Records per page' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search name, phone, email, or guess' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'AI Summit', description: 'Filter by specific guess keyword' })
  @IsString()
  @IsOptional()
  guess?: string;

  @ApiPropertyOptional({ enum: TeaserSubmissionStatus, description: 'Filter by status' })
  @IsEnum(TeaserSubmissionStatus)
  @IsOptional()
  status?: TeaserSubmissionStatus;

  @ApiPropertyOptional({ example: 'MYSTERY-EVENT-2026', description: 'Filter by event ID' })
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field to sort by' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'], description: 'Sort direction' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Start Date in ISO format (e.g. 2026-01-01)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End Date in ISO format (e.g. 2026-12-31)' })
  @IsString()
  @IsOptional()
  endDate?: string;
}
