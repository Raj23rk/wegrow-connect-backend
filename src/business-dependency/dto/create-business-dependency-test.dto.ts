import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBusinessDependencyTestDto {
  // Can receive either yourName, fullName, or name
  @ApiPropertyOptional({
    description: 'Your name',
    example: 'Arjun Mehta',
  })
  @IsOptional()
  @IsString()
  yourName?: string;

  @ApiPropertyOptional({
    description: 'Full name',
    example: 'Arjun Mehta',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Name alias',
    example: 'Arjun Mehta',
  })
  @IsOptional()
  @IsString()
  name?: string;

  // Can receive either businessName or company
  @ApiPropertyOptional({
    description: 'Business name',
    example: 'Mehta Interiors',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Mehta Interiors',
  })
  @IsOptional()
  @IsString()
  company?: string;

  // Can receive either phone or phoneNumber
  @ApiPropertyOptional({
    description: 'Phone number',
    example: '9876543210',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Phone',
    example: '9876543210',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  // Score
  @ApiPropertyOptional({
    description: 'Test Score',
    example: 72,
  })
  @IsOptional()
  score?: number | string;

  @ApiPropertyOptional({
    description: 'Formatted Score Display',
    example: '72/100',
  })
  @IsOptional()
  @IsString()
  scoreDisplay?: string;

  @ApiPropertyOptional({
    description: 'Score classification summary',
    example: 'Partially Systemized',
  })
  @IsOptional()
  @IsString()
  scoreSummary?: string;

  @ApiPropertyOptional({
    description: 'Optional answers or responses payload',
  })
  @IsOptional()
  answers?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional test answers',
  })
  @IsOptional()
  testAnswers?: Record<string, any>;
}
