import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MeetupExperienceLevel,
  MeetupWillingToGrow,
  MeetupCanRefer,
} from '../schemas/business-meetup-feedback.schema';

export class CreateBusinessMeetupFeedbackDto {
  @ApiProperty({ description: 'Participant full name', example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    description: 'Experience rating',
    enum: MeetupExperienceLevel,
    example: MeetupExperienceLevel.EXCELLENT,
  })
  @IsNotEmpty({ message: 'Experience rating is required' })
  experience!: string;

  @ApiPropertyOptional({ description: 'What did you like most about the meetup?' })
  @IsOptional()
  @IsString()
  liked_most?: string;

  @ApiPropertyOptional({ description: 'Alias for liked_most in camelCase' })
  @IsOptional()
  @IsString()
  likedMost?: string;

  @ApiPropertyOptional({ description: 'Any suggestions to improve the meetup?' })
  @IsOptional()
  @IsString()
  suggestions?: string;

  @ApiProperty({
    description: 'Willing to grow with community',
    enum: MeetupWillingToGrow,
    example: MeetupWillingToGrow.YES,
  })
  @IsOptional()
  willing_to_grow?: string;

  @ApiPropertyOptional({ description: 'Alias in camelCase' })
  @IsOptional()
  willingToGrow?: string;

  @ApiProperty({
    description: 'Can refer someone in circle',
    enum: MeetupCanRefer,
    example: MeetupCanRefer.YES,
  })
  @IsOptional()
  can_refer?: string;

  @ApiPropertyOptional({ description: 'Alias in camelCase' })
  @IsOptional()
  canRefer?: string;

  @ApiPropertyOptional({ description: 'Referral person name' })
  @IsOptional()
  @IsString()
  referral_name?: string;

  @ApiPropertyOptional({ description: 'Referral person name (camelCase)' })
  @IsOptional()
  @IsString()
  referralName?: string;

  @ApiPropertyOptional({ description: 'Referral person business/company' })
  @IsOptional()
  @IsString()
  referral_business?: string;

  @ApiPropertyOptional({ description: 'Referral person business (camelCase)' })
  @IsOptional()
  @IsString()
  referralBusiness?: string;

  @ApiPropertyOptional({ description: 'Referral person mobile number' })
  @IsOptional()
  @IsString()
  referral_mobile?: string;

  @ApiPropertyOptional({ description: 'Referral person mobile (camelCase)' })
  @IsOptional()
  @IsString()
  referralMobile?: string;

  @ApiPropertyOptional({ description: 'Key takeaway points' })
  @IsOptional()
  @IsString()
  key_takeaways?: string;

  @ApiPropertyOptional({ description: 'Key takeaway points (camelCase)' })
  @IsOptional()
  @IsString()
  keyTakeaways?: string;

  @ApiPropertyOptional({ description: 'Event title' })
  @IsOptional()
  @IsString()
  eventTitle?: string;

  // Honeypot field (must be empty)
  @ApiPropertyOptional({ description: 'Spam honeypot field' })
  @IsOptional()
  @IsString()
  website?: string;
}
