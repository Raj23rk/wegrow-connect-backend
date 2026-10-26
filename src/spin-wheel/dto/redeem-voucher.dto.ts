import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RedeemVoucherDto {
  @ApiProperty({
    example: 'WGW-SPIN-58291',
    description: 'Unique Voucher Code won by student on Spin Wheel',
  })
  @IsString()
  @IsNotEmpty()
  voucherCode!: string;

  @ApiPropertyOptional({
    example: 'Admitted into AI & Data Science Batch 2026',
    description: 'Optional staff note or counselor note',
  })
  @IsString()
  @IsOptional()
  staffNote?: string;
}
