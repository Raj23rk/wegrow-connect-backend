import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpinWheelController } from './spin-wheel.controller';
import { SpinWheelService } from './spin-wheel.service';
import {
  SpinWheelParticipant,
  SpinWheelParticipantSchema,
} from './schemas/spin-wheel-participant.schema';
import {
  SpinRewardBudget,
  SpinRewardBudgetSchema,
} from './schemas/spin-reward-budget.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SpinWheelParticipant.name,
        schema: SpinWheelParticipantSchema,
      },
      {
        name: SpinRewardBudget.name,
        schema: SpinRewardBudgetSchema,
      },
    ]),
  ],
  controllers: [SpinWheelController],
  providers: [SpinWheelService],
  exports: [SpinWheelService],
})
export class SpinWheelModule {}
