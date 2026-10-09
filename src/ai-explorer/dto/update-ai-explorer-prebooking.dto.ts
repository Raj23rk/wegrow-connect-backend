import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAiExplorerPrebookingDto {
  @ApiPropertyOptional({ description: 'Payment status (COMPLETED, PENDING, FAILED, REFUNDED)' })
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Pre-booking status (CONFIRMED, PENDING_PAYMENT, CANCELLED)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Admin notes / remarks' })
  @IsString()
  @IsOptional()
  adminNotes?: string;

  @ApiPropertyOptional({ description: 'Manual UPI Reference ID / UTR' })
  @IsString()
  @IsOptional()
  utr?: string;

  @ApiPropertyOptional({ description: 'Payment Method' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Total Amount' })
  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Father phone' })
  @IsString()
  @IsOptional()
  fatherPhone?: string;

  @ApiPropertyOptional({ description: 'Mother phone' })
  @IsString()
  @IsOptional()
  motherPhone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
