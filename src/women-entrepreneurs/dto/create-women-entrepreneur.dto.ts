import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { BusinessCategory, BusinessStage } from '../schemas/women-entrepreneur.schema';

export class CreateWomenEntrepreneurDto {
  @ApiProperty({ example: 'Priya Sundaram' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Full name must contain at least 2 characters' })
  fullName!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'WhatsApp phone number must be a valid 10-digit Indian mobile number',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'priya@gmail.com' })
  @IsEmail({}, { message: 'Must be a valid email format' })
  @IsOptional()
  email?: string;

  @ApiProperty({ enum: BusinessStage, example: BusinessStage.PLANNING })
  @IsEnum(BusinessStage)
  @IsNotEmpty()
  businessStage!: BusinessStage;

  @ApiProperty({ enum: BusinessCategory, example: BusinessCategory.RETAIL_BOUTIQUE })
  @IsEnum(BusinessCategory)
  @IsNotEmpty()
  category!: BusinessCategory;
}
