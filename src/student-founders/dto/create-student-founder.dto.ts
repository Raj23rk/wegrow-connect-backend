import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { YearOfStudy } from '../schemas/student-founder.schema';

export class CreateStudentFounderDto {
  @ApiProperty({ example: 'Arjun Rajan' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Full name must contain at least 2 characters' })
  fullName!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'WhatsApp number must be a valid 10-digit Indian mobile number',
  })
  phone!: string;

  @ApiProperty({ example: 'arjun@example.com' })
  @IsEmail({}, { message: 'Must be a valid email format' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Ayya Nadar Janaki Ammal College' })
  @IsString()
  @IsNotEmpty()
  collegeName!: string;

  @ApiProperty({ enum: YearOfStudy, example: YearOfStudy.THIRD_YEAR })
  @IsEnum(YearOfStudy)
  @IsNotEmpty()
  yearOfStudy!: YearOfStudy;

  @ApiProperty({ example: 'B.Com' })
  @IsString()
  @IsNotEmpty()
  course!: string;

  @ApiProperty({ example: 2023 })
  @Type(() => Number)
  @IsInt()
  @Min(2018)
  @Max(2030)
  @IsNotEmpty()
  courseStartYear!: number;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2035)
  @IsNotEmpty()
  courseEndYear!: number;
}
