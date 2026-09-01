import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitTaskDto {
  @ApiPropertyOptional({ example: 'Final submission content...' })
  @IsString()
  @IsOptional()
  answer?: string;
}
