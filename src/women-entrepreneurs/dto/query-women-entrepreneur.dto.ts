import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  BusinessCategory,
  BusinessStage,
  RegistrationStatus,
} from '../schemas/women-entrepreneur.schema';

export class QueryWomenEntrepreneurDto {
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

  @ApiPropertyOptional({ description: 'Search name, phone, or email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: BusinessStage })
  @IsEnum(BusinessStage)
  @IsOptional()
  businessStage?: BusinessStage;

  @ApiPropertyOptional({ enum: BusinessCategory })
  @IsEnum(BusinessCategory)
  @IsOptional()
  category?: BusinessCategory;

  @ApiPropertyOptional({ enum: RegistrationStatus })
  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus;

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
}
