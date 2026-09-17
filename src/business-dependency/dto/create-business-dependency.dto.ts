import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { BusinessDependencyType } from '../schemas/business-dependency.schema';

export class CreateBusinessDependencyDto {
  @ApiPropertyOptional({
    description: 'Submission type',
    enum: BusinessDependencyType,
    example: BusinessDependencyType.TEST,
  })
  @IsOptional()
  @IsEnum(BusinessDependencyType)
  type?: BusinessDependencyType;

  @ApiPropertyOptional({ example: 'Arjun Mehta' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Arjun Mehta' })
  @IsOptional()
  @IsString()
  yourName?: string;

  @ApiPropertyOptional({ example: 'Arjun Mehta' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Mehta Interiors' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Mehta Interiors' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'arjun@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Founder, CEO' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: 'Retail' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: '1-5 employees' })
  @IsOptional()
  @IsString()
  businessSize?: string;

  @ApiPropertyOptional({ example: '1-5 employees' })
  @IsOptional()
  @IsString()
  teamSize?: string;

  @ApiPropertyOptional({ example: 'Operations & Scaling' })
  @IsOptional()
  @IsString()
  biggestChallenge?: string;

  @ApiPropertyOptional({ example: 'Need a clear operational roadmap.' })
  @IsOptional()
  @IsString()
  challengeDetails?: string;

  @ApiPropertyOptional({ example: 'Need a clear operational roadmap.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  score?: number | string;

  @ApiPropertyOptional({ example: '72/100' })
  @IsOptional()
  @IsString()
  scoreDisplay?: string;

  @ApiPropertyOptional({ example: 'Partially Systemized' })
  @IsOptional()
  @IsString()
  scoreSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  answers?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  testAnswers?: Record<string, any>;
}
