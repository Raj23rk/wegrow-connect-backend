import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryDiwaliChallengeDto {
  @ApiPropertyOptional({
    description: 'Search by student name, email, mobile, college, or demo ticket code',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by interested course',
  })
  @IsString()
  @IsOptional()
  course?: string;

  @ApiPropertyOptional({
    description: 'Filter by qualification for free demo (score >= 80: true/false)',
  })
  @IsBooleanString()
  @IsOptional()
  isQualified?: string;

  @ApiPropertyOptional({
    description: 'Filter by whether demo ticket was claimed on campus (true/false)',
  })
  @IsBooleanString()
  @IsOptional()
  isRedeemed?: string;

  @ApiPropertyOptional({
    default: 1,
    description: 'Page number',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: 'Limit per page',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
