import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { FounderRegistrationStatus } from '../schemas/business-founder.schema';

export class QueryBusinessFounderDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search name, phone, email, business name, or industry' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'manufacturing' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: '1_to_3_years' })
  @IsString()
  @IsOptional()
  yearsInBusiness?: string;

  @ApiPropertyOptional({ example: 'More Sales' })
  @IsString()
  @IsOptional()
  biggestPriority?: string;

  @ApiPropertyOptional({ example: 'Lack of Customers' })
  @IsString()
  @IsOptional()
  growthBlocker?: string;

  @ApiPropertyOptional({ example: 'Yes' })
  @IsString()
  @IsOptional()
  hasTeam?: string;

  @ApiPropertyOptional({ enum: FounderRegistrationStatus })
  @IsEnum(FounderRegistrationStatus)
  @IsOptional()
  status?: FounderRegistrationStatus;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter from ISO Date e.g. 2026-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter to ISO Date e.g. 2026-12-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'BUSINESS-SEP-16-2026', description: 'Filter by specific event ID' })
  @IsString()
  @IsOptional()
  eventId?: string;
}
