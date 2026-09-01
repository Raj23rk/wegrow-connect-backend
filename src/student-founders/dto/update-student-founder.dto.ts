import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateStudentFounderDto } from './create-student-founder.dto';
import { FounderRegistrationStatus } from '../schemas/student-founder.schema';

export class UpdateStudentFounderDto extends PartialType(CreateStudentFounderDto) {
  @ApiPropertyOptional({ enum: FounderRegistrationStatus })
  @IsEnum(FounderRegistrationStatus)
  @IsOptional()
  status?: FounderRegistrationStatus;

  @ApiPropertyOptional({ example: 'Student confirmed attendance via call' })
  @IsString()
  @IsOptional()
  notes?: string;
}
