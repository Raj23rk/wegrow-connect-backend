import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TargetAudienceType, TaskCategory } from '../schemas/task.schema';

export class CreateTaskDto {
  @ApiProperty({ example: 'Business Case Study Analysis' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Analyze the given market problem and propose a solution.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: '1. Read the case study.\n2. Write your answers clearly.\n3. Do not leave the browser window.' })
  @IsString()
  @IsNotEmpty()
  instructions!: string;

  @ApiProperty({ enum: TaskCategory, example: TaskCategory.BUSINESS })
  @IsEnum(TaskCategory)
  @IsNotEmpty()
  category!: TaskCategory;

  @ApiPropertyOptional({ example: 60, default: 60 })
  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxMarks?: number;

  @ApiPropertyOptional({ enum: TargetAudienceType, example: TargetAudienceType.ALL })
  @IsEnum(TargetAudienceType)
  @IsOptional()
  targetType?: TargetAudienceType;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsString()
  @IsOptional()
  targetDepartment?: string;

  @ApiPropertyOptional({ example: 'III' })
  @IsString()
  @IsOptional()
  targetYear?: string;

  @ApiPropertyOptional({ example: '10th' })
  @IsString()
  @IsOptional()
  targetClass?: string;

  @ApiPropertyOptional({ example: 'NEWSPAPER01' })
  @IsString()
  @IsOptional()
  targetCampaignId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
