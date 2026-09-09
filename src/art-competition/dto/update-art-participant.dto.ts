import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateArtParticipantDto } from './create-art-participant.dto';
import { ArtParticipantStatus } from '../schemas/art-participant.schema';

export class UpdateArtParticipantDto extends PartialType(CreateArtParticipantDto) {
  @ApiPropertyOptional({ enum: ArtParticipantStatus })
  @IsEnum(ArtParticipantStatus)
  @IsOptional()
  status?: ArtParticipantStatus;

  @ApiPropertyOptional({ example: true, description: 'Mark attendance' })
  @IsBoolean()
  @IsOptional()
  attended?: boolean;

  @ApiPropertyOptional({ example: 'Verified college ID card' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
