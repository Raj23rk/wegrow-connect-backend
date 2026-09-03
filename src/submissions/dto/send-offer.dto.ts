import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SendOfferEmailDto {
  @ApiPropertyOptional({ example: 'Please visit our Madurai branch to claim your scholarship and certificate.' })
  @IsString()
  @IsOptional()
  customMessage?: string;
}
