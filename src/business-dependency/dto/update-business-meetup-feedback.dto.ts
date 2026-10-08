import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MeetupFeedbackStatus } from '../schemas/business-meetup-feedback.schema';

export class UpdateBusinessMeetupFeedbackDto {
  @ApiPropertyOptional({
    description: 'Feedback status',
    enum: MeetupFeedbackStatus,
  })
  @IsEnum(MeetupFeedbackStatus)
  @IsOptional()
  status?: MeetupFeedbackStatus;

  @ApiPropertyOptional({ description: 'Admin follow-up notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
