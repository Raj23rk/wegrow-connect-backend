import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class SendSpinOtpDto {
  @ApiProperty({ example: 'Aditya Sharma', description: 'Student Full Name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

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

  @ApiProperty({
    example: '9876543211',
    description: "Father's Contact Mobile Number",
  })
  @IsString()
  @Matches(/^[0-9+ -]{10,15}$/, {
    message: "Father's mobile number must be a valid 10-15 digit phone number",
  })
  fatherMobile!: string;

  @ApiProperty({
    example: '9876543212',
    description: "Mother's Contact Mobile Number",
  })
  @IsString()
  @Matches(/^[0-9+ -]{10,15}$/, {
    message: "Mother's mobile number must be a valid 10-15 digit phone number",
  })
  motherMobile!: string;

  @ApiProperty({
    example: 'AI & Data Science',
    description: 'Course or Skill Program interested in',
  })
  @IsString()
  @IsNotEmpty()
  courseInterested!: string;

  @ApiPropertyOptional({
    example: 'WeGrow B-School Main Campus',
    description: 'Preferred Campus Location / Visit Time',
  })
  @IsString()
  @IsOptional()
  campusPreference?: string;
}
