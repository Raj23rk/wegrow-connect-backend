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
import {
  AiExplorerPrebooking,
  AiExplorerPrebookingSchema,
} from './schemas/ai-explorer-prebooking.schema';
import {
  AiExplorerPrebookingPayment,
  AiExplorerPrebookingPaymentSchema,
} from './schemas/ai-explorer-prebooking-payment.schema';
import { AiExplorerController } from './ai-explorer.controller';
import { AiExplorerService } from './ai-explorer.service';
import { AiPaymentController } from './ai-payment.controller';
import { AiPaymentService } from './ai-payment.service';
import { AiExplorerPrebookingController } from './ai-explorer-prebooking.controller';
import { AiExplorerPrebookingService } from './ai-explorer-prebooking.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiExplorerEnrollment.name, schema: AiExplorerEnrollmentSchema },
      { name: AiExplorerCounter.name, schema: AiExplorerCounterSchema },
      { name: AiExplorerPayment.name, schema: AiExplorerPaymentSchema },
      { name: AiExplorerPrebooking.name, schema: AiExplorerPrebookingSchema },
      { name: AiExplorerPrebookingPayment.name, schema: AiExplorerPrebookingPaymentSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [
    AiExplorerController,
    AiPaymentController,
    AiExplorerPrebookingController,
  ],
  providers: [
    AiExplorerService,
    AiPaymentService,
    AiExplorerPrebookingService,
  ],
  exports: [
    AiExplorerService,
    AiPaymentService,
    AiExplorerPrebookingService,
  ],
})
export class AiExplorerModule {}

