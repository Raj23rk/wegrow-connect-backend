import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ArtParticipant,
  ArtParticipantSchema,
} from './schemas/art-participant.schema';
import { ArtCompetitionService } from './art-competition.service';
import { ArtCompetitionController } from './art-competition.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ArtParticipant.name, schema: ArtParticipantSchema },
    ]),
  ],
  controllers: [ArtCompetitionController],
  providers: [ArtCompetitionService],
  exports: [ArtCompetitionService],
})
export class ArtCompetitionModule {}
