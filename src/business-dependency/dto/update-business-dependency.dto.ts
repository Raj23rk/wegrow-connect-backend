import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateBusinessDependencyDto } from './create-business-dependency.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessDependencyStatus } from '../schemas/business-dependency.schema';

export class UpdateBusinessDependencyDto extends PartialType(
  CreateBusinessDependencyDto,
) {
  @ApiPropertyOptional({
    description: 'Lead status',
    enum: BusinessDependencyStatus,
    example: BusinessDependencyStatus.CONTACTED,
  })
  @IsOptional()
  @IsEnum(BusinessDependencyStatus)
  status?: BusinessDependencyStatus;

  @ApiPropertyOptional({
    description: 'Internal admin notes',
    example: 'Scheduled consultation call for tomorrow.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
