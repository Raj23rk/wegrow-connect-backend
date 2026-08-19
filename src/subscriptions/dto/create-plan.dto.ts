import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Monthly Plan' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Access all features for 30 days' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['Unlimited events', 'Certificate access'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ example: 499 })
  @IsNumber()
  @Min(1)
  price!: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  durationDays!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
