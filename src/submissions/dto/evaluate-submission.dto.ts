import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class EvaluateSubmissionDto {
  @ApiProperty({ example: 85 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  score!: number;

  @ApiPropertyOptional({ example: 'Good structural approach, well executed.' })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiPropertyOptional({ example: 'Good structural approach, well executed.' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isSelected?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isWinner?: boolean;
}
