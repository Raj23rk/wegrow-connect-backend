import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateEventTeaserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full Name of the participant' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must contain at least 2 characters' })
  name!: string;

  @ApiProperty({ example: '9876543210', description: 'Contact Phone Number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'AI Business Summit 2026', description: 'The user guess for the mystery event' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Guess cannot be empty' })
  guess!: string;

  @ApiPropertyOptional({ example: 'MYSTERY-EVENT-2026', description: 'Event identifier' })
  @IsOptional()
  @IsString()
  eventId?: string;
}
