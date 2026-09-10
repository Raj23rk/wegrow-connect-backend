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

  @ApiPropertyOptional({ example: 'Sri Meenakshi Industries' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ example: 'manufacturing' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: '1_to_3_years' })
  @IsString()
  @IsOptional()
  yearsInBusiness?: string;

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

  @ApiPropertyOptional({ example: 'BUSINESS-SEP-16-2026' })
  @IsString()
  @IsOptional()
  eventId?: string;
}
