import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogCheatingEventDto {
  @ApiProperty({
    example: 'TAB_SWITCH',
    enum: ['TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'SHORTCUT_ATTEMPT'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'SHORTCUT_ATTEMPT'])
  eventType!: string;

  @ApiPropertyOptional({ example: 'User pressed Ctrl+C' })
  @IsString()
  @IsOptional()
  details?: string;
}
