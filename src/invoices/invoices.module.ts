import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';

import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
