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

  @ApiPropertyOptional({ description: 'Search name, phone, email, business name, city, state, product/service, or industry' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'Tamil Nadu' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'Sivakasi' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsString()
  @IsOptional()
  isBusinessOwner?: string;

  @ApiPropertyOptional({ example: 'Manufacturing' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: '6 to 10 Years' })
  @IsString()
  @IsOptional()
  yearsInBusiness?: string;

  @ApiPropertyOptional({ example: '6 to 15 Members' })
  @IsString()
  @IsOptional()
  teamSize?: string;

  @ApiPropertyOptional({ example: '₹1 Crore to ₹5 Crore' })
  @IsString()
  @IsOptional()
  annualTurnover?: string;

  @ApiPropertyOptional({ example: 'An Aspiring Business Owner' })
  @IsString()
  @IsOptional()
  currentRole?: string;

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

  @ApiPropertyOptional({ example: 'BUSINESS-OCT-09-2026', description: 'Filter by specific event ID' })
  @IsString()
  @IsOptional()
  eventId?: string;
}

