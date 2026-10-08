import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AiExplorerEnrollment,
  AiExplorerEnrollmentSchema,
} from './schemas/ai-explorer-enrollment.schema';
import {
  AiExplorerCounter,
  AiExplorerCounterSchema,
} from './schemas/ai-explorer-counter.schema';
import {
  AiExplorerPayment,
  AiExplorerPaymentSchema,
} from './schemas/ai-explorer-payment.schema';
import { AiExplorerController } from './ai-explorer.controller';
import { AiExplorerService } from './ai-explorer.service';
import { AiPaymentController } from './ai-payment.controller';
import { AiPaymentService } from './ai-payment.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiExplorerEnrollment.name, schema: AiExplorerEnrollmentSchema },
      { name: AiExplorerCounter.name, schema: AiExplorerCounterSchema },
      { name: AiExplorerPayment.name, schema: AiExplorerPaymentSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AiExplorerController, AiPaymentController],
  providers: [AiExplorerService, AiPaymentService],
  exports: [AiExplorerService, AiPaymentService],
})
export class AiExplorerModule {}
