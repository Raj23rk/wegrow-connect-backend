import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCertificateDto {
  @ApiProperty({
    example: '6a7327f64cb492d534684949',
    description: 'Event ID',
  })
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({
    example: '6a7322a6d509bcbf2d7a7575',
    description: 'User ID (Student / Business user)',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({
    example: '6a8455d8fb3236dde9a5c2e6',
    description: 'Booking ID (optional)',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    example: 'Raj Kumar A',
    description: 'Participant name to display on certificate',
  })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({
    example: 'Python Full Stack Bootcamp',
    description: 'Course / Event Title',
  })
  @IsOptional()
  @IsString()
  eventTitle?: string;

  @ApiPropertyOptional({
    example:
      'Demonstrated strong proficiency in Python, Django, React, PostgreSQL, and responsive web design.',
    description: 'Certificate description text',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'A+', default: 'A+' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ example: '2026', default: '2026' })
  @IsOptional()
  @IsString()
  startYear?: string;

  @ApiPropertyOptional({ example: '2026', default: '2026' })
  @IsOptional()
  @IsString()
  endYear?: string;

  @ApiPropertyOptional({ example: '2026-08-20T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  eventDate?: string;

  @ApiPropertyOptional({ example: '2026-08-20T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  issuedDate?: string;
}
