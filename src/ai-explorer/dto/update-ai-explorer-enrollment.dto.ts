import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AiEnrollmentStatus,
  AiFeePlan,
  AiPaymentStatus,
} from '../schemas/ai-explorer-enrollment.schema';

export class UpdateAiExplorerEnrollmentDto {
  @ApiPropertyOptional({ enum: AiPaymentStatus })
  @IsOptional()
  @IsEnum(AiPaymentStatus)
  paymentStatus?: AiPaymentStatus;

  @ApiPropertyOptional({ enum: AiEnrollmentStatus })
  @IsOptional()
  @IsEnum(AiEnrollmentStatus)
  status?: AiEnrollmentStatus;

  @ApiPropertyOptional({ enum: AiFeePlan })
  @IsOptional()
  @IsEnum(AiFeePlan)
  feePlan?: AiFeePlan;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  standard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
