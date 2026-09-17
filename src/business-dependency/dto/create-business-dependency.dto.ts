import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateBusinessDependencyDto {
  @ApiPropertyOptional({ description: 'Client custom ID' })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'Submission type' })
  @IsOptional()
  type?: any;

  @ApiPropertyOptional({ description: 'Submission timestamp' })
  @IsOptional()
  submittedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  yourName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  business?: string;

  @ApiPropertyOptional()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  businessSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  teamSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  challengeSelect?: string;

  @ApiPropertyOptional()
  @IsOptional()
  biggestChallenge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  challengeNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  challengeDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  score?: any;

  @ApiPropertyOptional()
  @IsOptional()
  scoreDisplay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  scoreSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  originalTestName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  originalBusiness?: string;

  @ApiPropertyOptional()
  @IsOptional()
  answers?: any;

  @ApiPropertyOptional()
  @IsOptional()
  testAnswers?: any;
}
