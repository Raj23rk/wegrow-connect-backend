import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateBusinessDependencyDiagnosticDto {
  @ApiPropertyOptional({ description: 'Client-generated ID' })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'Submission type' })
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Submission timestamp' })
  @IsOptional()
  submittedAt?: string;

  @ApiPropertyOptional({ description: 'Full name of applicant' })
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Name' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Alternative name key' })
  @IsOptional()
  yourName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  business?: string;

  @ApiPropertyOptional({ description: 'Alternative business name key' })
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Designation / Role' })
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional({ description: 'Industry dropdown selection' })
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Phone / Mobile number' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Alternative phone key' })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Business size from lead form' })
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({ description: 'Business size' })
  @IsOptional()
  businessSize?: string;

  @ApiPropertyOptional({ description: 'Team size' })
  @IsOptional()
  teamSize?: string;

  @ApiPropertyOptional({ description: 'Biggest challenge dropdown' })
  @IsOptional()
  challengeSelect?: string;

  @ApiPropertyOptional({ description: 'Biggest challenge' })
  @IsOptional()
  biggestChallenge?: string;

  @ApiPropertyOptional({ description: 'Challenge detail note' })
  @IsOptional()
  challengeNote?: string;

  @ApiPropertyOptional({ description: 'Challenge details' })
  @IsOptional()
  challengeDetails?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Score value' })
  @IsOptional()
  score?: any;

  @ApiPropertyOptional({ description: 'Score category band name' })
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Score display string' })
  @IsOptional()
  scoreDisplay?: string;

  @ApiPropertyOptional({ description: 'Score summary' })
  @IsOptional()
  scoreSummary?: string;

  @ApiPropertyOptional({ description: 'Original test participant name' })
  @IsOptional()
  originalTestName?: string;

  @ApiPropertyOptional({ description: 'Original business name' })
  @IsOptional()
  originalBusiness?: string;

  @ApiPropertyOptional({ description: 'Stage of the lead' })
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional({ description: 'Status' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Optional answers payload' })
  @IsOptional()
  answers?: any;

  @ApiPropertyOptional({ description: 'Optional test answers' })
  @IsOptional()
  testAnswers?: any;
}
