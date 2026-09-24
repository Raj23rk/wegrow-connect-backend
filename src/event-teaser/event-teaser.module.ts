import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventTeaser, EventTeaserSchema } from './schemas/event-teaser.schema';
import { EventTeaserService } from './event-teaser.service';
import { EventTeaserController } from './event-teaser.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventTeaser.name, schema: EventTeaserSchema },
    ]),
  ],
  controllers: [EventTeaserController],
  providers: [EventTeaserService],
  exports: [EventTeaserService],
})
export class EventTeaserModule {}
