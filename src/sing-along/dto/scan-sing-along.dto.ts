import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class ScanSingAlongDto {
  @ApiProperty({
    description:
      'QR Code raw content, URL, verification token, or Booking ID (e.g. SA26-010 or https://www.wegrowbschool.in/sing-along?bookingId=SA26-010)',
    example: 'SA26-010',
  })
  @IsNotEmpty()
  @IsString()
  qrData!: string;

  @ApiPropertyOptional({
    description:
      'Whether to automatically check in the attendee upon scanning (default: true). Set to false to preview attendee details without marking check-in.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoCheckIn?: boolean = true;
}
