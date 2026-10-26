import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class EnrollDiwaliChallengeDto {
  @ApiProperty({ example: 'Aditya Sharma', description: 'Student Full Name' })
  @IsString()
  @IsNotEmpty()
  studentName!: string;

  @ApiProperty({
    example: 'aditya.sharma@gmail.com',
    description: 'Student Email Address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Student Mobile Number (10 digits)',
  })
  @IsString()
  @Matches(/^[0-9+ -]{10,15}$/, {
    message: 'Mobile number must be a valid 10-15 digit phone number',
  })
  mobileNo!: string;

  @ApiPropertyOptional({
    example: 'RV College of Engineering',
    description: 'College or School Name',
  })
  @IsString()
  @IsOptional()
  collegeOrSchool?: string;

  @ApiProperty({
    example: 'AI & Data Science (B.Tech / Specialization)',
    description: 'Course or Skill Program interested in',
  })
  @IsString()
  @IsNotEmpty()
  courseInterested!: string;

  @ApiPropertyOptional({
    example: 'Campus Diwali Poster QR - Library Block',
    description: 'Poster / Stall location where student scanned the QR',
  })
  @IsString()
  @IsOptional()
  referralSource?: string;
}
