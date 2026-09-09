import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ArtParticipantStatus } from '../schemas/art-participant.schema';

export class QueryArtParticipantDto {
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

  @ApiPropertyOptional({
    description: 'Search by full name, phone, email, college, degree, or registration number',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by college or institution name' })
  @IsString()
  @IsOptional()
  collegeName?: string;

  @ApiPropertyOptional({ description: 'Filter by preferred art medium' })
  @IsString()
  @IsOptional()
  preferredArtMedium?: string;

  @ApiPropertyOptional({ enum: ArtParticipantStatus })
  @IsEnum(ArtParticipantStatus)
  @IsOptional()
  status?: ArtParticipantStatus;

  @ApiPropertyOptional({ description: 'Filter by attendance status' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  attended?: boolean;

  @ApiPropertyOptional({ example: 'createdAt', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', default: 'desc' })
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
