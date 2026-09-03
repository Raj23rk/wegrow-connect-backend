import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QuerySubmissionDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 15, default: 15 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 15;

  @ApiPropertyOptional({ description: 'Search student name, email, mobile, or submission ID' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'PENDING or EVALUATED' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isSelected?: boolean;
}
