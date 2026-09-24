import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateEventTeaserDto } from './create-event-teaser.dto';
import { TeaserSubmissionStatus } from '../schemas/event-teaser.schema';

export class UpdateEventTeaserDto extends PartialType(CreateEventTeaserDto) {
  @ApiPropertyOptional({ enum: TeaserSubmissionStatus })
  @IsEnum(TeaserSubmissionStatus)
  @IsOptional()
  status?: TeaserSubmissionStatus;

  @ApiPropertyOptional({ example: 'Shortlisted for prize reveal' })
  @IsString()
  @IsOptional()
  notes?: string;
}
