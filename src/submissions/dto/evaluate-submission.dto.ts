import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
}
