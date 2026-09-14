import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SingAlongBookingStatus } from '../schemas/sing-along-booking.schema';

export class QuerySingAlongBookingDto {
  @ApiPropertyOptional({
    description: 'Search query for name, phone, bookingId or UTR',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: SingAlongBookingStatus,
    description: 'Filter by booking status',
  })
  @IsOptional()
  @IsEnum(SingAlongBookingStatus)
  status?: SingAlongBookingStatus;

  @ApiPropertyOptional({ description: 'Filter by eventId' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 50;
}
