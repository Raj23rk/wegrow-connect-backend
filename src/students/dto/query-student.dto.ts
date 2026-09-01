import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StudentType } from '../schemas/student.schema';

export class QueryStudentDto {
  @ApiPropertyOptional({ description: 'Search term for name, email, or mobile' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: StudentType })
  @IsEnum(StudentType)
  @IsOptional()
  studentType?: StudentType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  year?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  class?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignId?: string;
}
