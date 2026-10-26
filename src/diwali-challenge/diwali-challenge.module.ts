import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiwaliChallengeController } from './diwali-challenge.controller';
import { DiwaliChallengeService } from './diwali-challenge.service';
import {
  DiwaliChallenge,
  DiwaliChallengeSchema,
} from './schemas/diwali-challenge.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DiwaliChallenge.name,
        schema: DiwaliChallengeSchema,
      },
    ]),
  ],
  controllers: [DiwaliChallengeController],
  providers: [DiwaliChallengeService],
  exports: [DiwaliChallengeService],
})
export class DiwaliChallengeModule {}
