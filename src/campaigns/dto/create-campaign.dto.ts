import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Newspaper Ad Campaign' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Newspaper' })
  @IsString()
  @IsNotEmpty()
  source!: string;

  @ApiProperty({ example: 'NEWSPAPER01' })
  @IsString()
  @IsNotEmpty()
  campaignId!: string;

  @ApiPropertyOptional({ example: 'https://example.com/qr/NEWSPAPER01.png' })
  @IsString()
  @IsOptional()
  qrCode?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
