import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateBusinessFounderDto {
  @ApiProperty({ example: 'R. Soundararajan' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Full name must contain at least 2 characters' })
  fullName!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'founder@mybusiness.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Tamil Nadu' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'Sivakasi' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'yes' })
  @IsString()
  @IsOptional()
  isBusinessOwner?: string;

  @ApiPropertyOptional({ example: '6 to 10 Years' })
  @IsString()
  @IsOptional()
  yearsInBusiness?: string;

  @ApiPropertyOptional({ example: '6 to 15 Members' })
  @IsString()
  @IsOptional()
  teamSize?: string;

  @ApiPropertyOptional({ example: 'Manufacturing' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: '₹1 Crore to ₹5 Crore' })
  @IsString()
  @IsOptional()
  annualTurnover?: string;

  @ApiPropertyOptional({ example: 'Offset printing and packaging boxes' })
  @IsString()
  @IsOptional()
  productService?: string;

  @ApiPropertyOptional({ example: 'An Aspiring Business Owner' })
  @IsString()
  @IsOptional()
  currentRole?: string;

  @ApiPropertyOptional({ example: 'Sri Meenakshi Industries' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ example: 'More Sales' })
  @IsString()
  @IsOptional()
  biggestPriority?: string;

  @ApiPropertyOptional({ example: 'Lack of Customers' })
  @IsString()
  @IsOptional()
  growthBlocker?: string;

  @ApiPropertyOptional({ example: 'Yes' })
  @IsString()
  @IsOptional()
  hasTeam?: string;

  @ApiPropertyOptional({ example: 'Bigger Sales' })
  @IsString()
  @IsOptional()
  futureVision?: string;

  @ApiPropertyOptional({ example: 'Scaling dealer network, reducing owner dependency' })
  @IsString()
  @IsOptional()
  growthChallenge?: string;

  @ApiPropertyOptional({ example: 'BUSINESS-OCT-09-2026' })
  @IsString()
  @IsOptional()
  eventId?: string;
}

