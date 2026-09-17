import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateBusinessDependencyTestDto {
  @ApiPropertyOptional({ description: 'Client-generated ID' })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'Submission type' })
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Submission timestamp' })
  @IsOptional()
  submittedAt?: string;

  @ApiPropertyOptional({ description: 'Your name / participant name' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Your name' })
  @IsOptional()
  yourName?: string;

  @ApiPropertyOptional({ description: 'Full name' })
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  business?: string;

  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Test Score' })
  @IsOptional()
  score?: any;

  @ApiPropertyOptional({ description: 'Category / Band label' })
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Score display string' })
  @IsOptional()
  scoreDisplay?: string;

  @ApiPropertyOptional({ description: 'Score classification summary' })
  @IsOptional()
  scoreSummary?: string;

  @ApiPropertyOptional({ description: 'Stage of the submission' })
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional({ description: 'Status of the submission' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Array of answers' })
  @IsOptional()
  answers?: any;

  @ApiPropertyOptional({ description: 'Optional test answers object' })
  @IsOptional()
  testAnswers?: any;
}
