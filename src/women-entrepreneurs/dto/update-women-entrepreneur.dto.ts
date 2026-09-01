import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateWomenEntrepreneurDto } from './create-women-entrepreneur.dto';
import { RegistrationStatus } from '../schemas/women-entrepreneur.schema';

export class UpdateWomenEntrepreneurDto extends PartialType(CreateWomenEntrepreneurDto) {
  @ApiPropertyOptional({ enum: RegistrationStatus })
  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus;

  @ApiPropertyOptional({ example: 'Called customer for confirmation' })
  @IsString()
  @IsOptional()
  notes?: string;
}
