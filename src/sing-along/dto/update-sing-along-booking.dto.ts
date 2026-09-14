import { PartialType } from '@nestjs/swagger';
import { CreateSingAlongBookingDto } from './create-sing-along-booking.dto';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SingAlongBookingStatus } from '../schemas/sing-along-booking.schema';

export class UpdateSingAlongBookingDto extends PartialType(
  CreateSingAlongBookingDto,
) {
  @IsOptional()
  @IsEnum(SingAlongBookingStatus)
  status?: SingAlongBookingStatus;

  @IsOptional()
  @IsBoolean()
  attended?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
