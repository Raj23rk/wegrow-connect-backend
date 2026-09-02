import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateBusinessFounderDto } from './create-business-founder.dto';
import { FounderRegistrationStatus } from '../schemas/business-founder.schema';

export class UpdateBusinessFounderDto extends PartialType(CreateBusinessFounderDto) {
  @ApiPropertyOptional({ enum: FounderRegistrationStatus })
  @IsEnum(FounderRegistrationStatus)
  @IsOptional()
  status?: FounderRegistrationStatus;

  @ApiPropertyOptional({ example: 'Founder attended orientation' })
  @IsString()
  @IsOptional()
  notes?: string;
}
