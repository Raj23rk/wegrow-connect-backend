import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Certificate, CertificateSchema } from './schemas/certificate.schema';

import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';

import { Event, EventSchema } from '../events/schemas/event.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { NotificationsModule } from '../notifications/notifications.module';

import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Certificate.name, schema: CertificateSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
