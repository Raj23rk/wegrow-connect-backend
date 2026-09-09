import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateArtParticipantDto {
  @ApiProperty({
    example: 'S. Karthikeyan',
    description: 'Full name of the participant',
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must contain at least 2 characters' })
  fullName!: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: '10-digit WhatsApp or mobile number',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'WhatsApp number alias',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'WhatsApp number must be a valid 10-digit Indian mobile number',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Mobile number alias',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit Indian mobile number',
  })
  mobileNumber?: string;

  @ApiPropertyOptional({
    example: 'karthik@example.com',
    description: 'Email address of the participant',
  })
  @IsEmail({}, { message: 'Must be a valid email format' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'Ayya Nadar Janaki Ammal College',
    description: 'College or institution name',
  })
  @IsString()
  @IsNotEmpty({ message: 'College / Institution Name is required' })
  collegeName!: string;

  @ApiPropertyOptional({
    example: 'Ayya Nadar Janaki Ammal College',
    description: 'Institution name alias',
  })
  @IsString()
  @IsOptional()
  institutionName?: string;

  @ApiPropertyOptional({
    example: 'B.Com (General) - 2nd Year',
    description: 'Degree and year of study',
  })
  @IsString()
  @IsOptional()
  degreeAndYear?: string;

  @ApiPropertyOptional({
    example: 'B.Com (General)',
    description: 'Degree program',
  })
  @IsString()
  @IsOptional()
  degree?: string;

  @ApiPropertyOptional({
    example: '2nd Year',
    description: 'Year of study',
  })
  @IsString()
  @IsOptional()
  yearOfStudy?: string;

  @ApiPropertyOptional({
    example: 'Color Pencils & Oil Pastels',
    description: 'Preferred art medium',
  })
  @IsString()
  @IsOptional()
  preferredArtMedium?: string;

  @ApiPropertyOptional({
    example: 'Color Pencils & Oil Pastels',
    description: 'Art medium alias',
  })
  @IsString()
  @IsOptional()
  artMedium?: string;
}
