import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Booking, BookingSchema } from './schemas/booking.schema';

import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Booking.name,
        schema: BookingSchema,
      },
    ]),

    // IMPORTANT
    NotificationsModule,
  ],

  controllers: [BookingsController],

  providers: [BookingsService],

  exports: [BookingsService],
})
export class BookingsModule {}
