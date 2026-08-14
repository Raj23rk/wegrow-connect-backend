import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Event, EventSchema } from './schemas/event.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

import { EventsController } from './events.controller';
import { EventsService } from './events.service';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Event.name,
        schema: EventSchema,
      },

      {
        name: User.name,
        schema: UserSchema,
      },
    ]),

    // IMPORTANT
    NotificationsModule,
  ],

  controllers: [EventsController],

  providers: [EventsService],
})
export class EventsModule {}
