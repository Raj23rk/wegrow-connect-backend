import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SingAlongBooking,
  SingAlongBookingSchema,
} from './schemas/sing-along-booking.schema';
import { SingAlongController } from './sing-along.controller';
import { SingAlongService } from './sing-along.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SingAlongBooking.name, schema: SingAlongBookingSchema },
    ]),
  ],
  controllers: [SingAlongController],
  providers: [SingAlongService],
  exports: [SingAlongService],
})
export class SingAlongModule {}
