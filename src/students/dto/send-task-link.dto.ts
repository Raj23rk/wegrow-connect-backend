import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendTaskLinkDto {
  @ApiPropertyOptional({ description: 'Optional explicit task ID. If omitted, matches automatically by study year/class' })
  @IsString()
  @IsOptional()
  taskId?: string;
}

export class SendBulkTaskLinksDto {
  @ApiPropertyOptional({ description: 'List of student IDs. If omitted, sends to all students who haven\'t received task links yet' })
  @IsArray()
  @IsOptional()
  studentIds?: string[];
}
