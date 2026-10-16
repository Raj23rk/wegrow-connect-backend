import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  SingAlongBooking,
  SingAlongBookingSchema,
} from '../sing-along/schemas/sing-along-booking.schema';
import { PaymentsController } from './payments.controller';
import { RazorpayApiController } from './razorpay-api.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: SingAlongBooking.name, schema: SingAlongBookingSchema },
    ]),
  ],
  controllers: [PaymentsController, RazorpayApiController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
