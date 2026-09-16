import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SingAlongBooking,
  SingAlongBookingSchema,
} from './schemas/sing-along-booking.schema';
import {
  SingAlongPayment,
  SingAlongPaymentSchema,
} from './schemas/sing-along-payment.schema';
import {
  SingAlongCounter,
  SingAlongCounterSchema,
} from './schemas/sing-along-counter.schema';
import { SingAlongController } from './sing-along.controller';
import { SingAlongService } from './sing-along.service';
import { SingPaymentController } from './sing-payment.controller';
import { SingPaymentService } from './sing-payment.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SingAlongBooking.name, schema: SingAlongBookingSchema },
      { name: SingAlongPayment.name, schema: SingAlongPaymentSchema },
      { name: SingAlongCounter.name, schema: SingAlongCounterSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [SingAlongController, SingPaymentController],
  providers: [SingAlongService, SingPaymentService],
  exports: [SingAlongService, SingPaymentService],
})
export class SingAlongModule {}

