import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  SingAlongBooking,
  SingAlongBookingSchema,
} from '../sing-along/schemas/sing-along-booking.schema';
import {
  AiExplorerPrebooking,
  AiExplorerPrebookingSchema,
} from '../ai-explorer/schemas/ai-explorer-prebooking.schema';
import {
  AiExplorerCounter,
  AiExplorerCounterSchema,
} from '../ai-explorer/schemas/ai-explorer-counter.schema';
import { PaymentsController } from './payments.controller';
import { RazorpayApiController } from './razorpay-api.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: SingAlongBooking.name, schema: SingAlongBookingSchema },
      { name: AiExplorerPrebooking.name, schema: AiExplorerPrebookingSchema },
      { name: AiExplorerCounter.name, schema: AiExplorerCounterSchema },
    ]),
  ],
  controllers: [PaymentsController, RazorpayApiController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
