import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '../schemas/subscription-plan.schema';

export class CreatePlanDto {
  @ApiProperty({ example: 'Student Monthly Plan' })
  @IsString()
  name!: string;

  @ApiProperty({
    enum: PlanType,
    example: PlanType.STUDENT,
    description: 'Target plan type: STUDENT or BUSINESS',
  })
  @IsEnum(PlanType)
  type!: PlanType;

  @ApiPropertyOptional({ example: 'Access all student features for 30 days' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['Unlimited workshops', 'Certificate access'] })
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
