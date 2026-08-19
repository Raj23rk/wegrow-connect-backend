import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({ example: 'Monthly Subscription Plan' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 499 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class GenerateInvoiceDto {
  @ApiProperty({ example: '64f1b2c3d4e5f6g7h8i9j0k1', description: 'User ID to bill' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({ example: '64f1b2c3d4e5f6g7h8i9j0k2', description: 'Booking ID (optional)' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: '64f1b2c3d4e5f6g7h8i9j0k3', description: 'Subscription ID (optional)' })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];

  @ApiPropertyOptional({ example: 18, description: 'Tax percentage (e.g. 18 for 18%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;
}
