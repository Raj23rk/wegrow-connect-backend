import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBusinessDependencyDiagnosticDto {
  // Name
  @ApiPropertyOptional({
    description: 'Full name of applicant',
    example: 'Raj kumar A',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Alternative name key',
    example: 'Raj kumar A',
  })
  @IsOptional()
  @IsString()
  yourName?: string;

  @ApiPropertyOptional({
    description: 'Alternative name key',
    example: 'Raj kumar A',
  })
  @IsOptional()
  @IsString()
  name?: string;

  // Company
  @ApiPropertyOptional({
    description: 'Company name',
    example: 'THE EYE LAND OPTICALS',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description: 'Alternative business name key',
    example: 'THE EYE LAND OPTICALS',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  // Designation
  @ApiPropertyOptional({
    description: 'Designation / Role',
    example: 'Founder, CEO',
  })
  @IsOptional()
  @IsString()
  designation?: string;

  // Industry
  @ApiPropertyOptional({
    description: 'Industry dropdown selection',
    example: 'Retail',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  // Phone
  @ApiPropertyOptional({
    description: 'Phone / Mobile number',
    example: '06380629995',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Alternative phone key',
    example: '06380629995',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  // Email
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'raj@eyeland.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  // Business Size
  @ApiPropertyOptional({
    description: 'Business / Team size dropdown selection',
    example: '1-5 employees',
  })
  @IsOptional()
  @IsString()
  businessSize?: string;

  @ApiPropertyOptional({
    description: 'Alternative team size key',
    example: '1-5 employees',
  })
  @IsOptional()
  @IsString()
  teamSize?: string;

  // Biggest Challenge
  @ApiPropertyOptional({
    description: 'Biggest challenge dropdown selection',
    example: 'Operations & Process Bottlenecks',
  })
  @IsOptional()
  @IsString()
  biggestChallenge?: string;

  // Anything else about this challenge (optional)
  @ApiPropertyOptional({
    description: 'Anything else about this challenge? (optional)',
    example: 'Need to systematize staff delegation.',
  })
  @IsOptional()
  @IsString()
  challengeDetails?: string;

  @ApiPropertyOptional({
    description: 'Alternative notes or challenge detail key',
    example: 'Need to systematize staff delegation.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  // Score if carried forward
  @ApiPropertyOptional({
    description: 'Score value',
    example: 72,
  })
  @IsOptional()
  score?: number | string;

  @ApiPropertyOptional({
    description: 'Score display string',
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
}
