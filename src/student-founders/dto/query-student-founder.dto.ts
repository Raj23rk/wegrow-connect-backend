import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  FounderRegistrationStatus,
  YearOfStudy,
} from '../schemas/student-founder.schema';

export class QueryStudentFounderDto {
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

  @ApiPropertyOptional({ description: 'Search name, phone, email, college, or course' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: YearOfStudy })
  @IsEnum(YearOfStudy)
  @IsOptional()
  yearOfStudy?: YearOfStudy;

  @ApiPropertyOptional({ example: 'Ayya Nadar Janaki Ammal College' })
  @IsString()
  @IsOptional()
  collegeName?: string;

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
}
