import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessDependencyController } from './business-dependency.controller';
import { BusinessDependencyService } from './business-dependency.service';
import {
  BusinessDependency,
  BusinessDependencySchema,
} from './schemas/business-dependency.schema';
import {
  BusinessMeetupFeedback,
  BusinessMeetupFeedbackSchema,
} from './schemas/business-meetup-feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessDependency.name, schema: BusinessDependencySchema },
      {
        name: BusinessMeetupFeedback.name,
        schema: BusinessMeetupFeedbackSchema,
      },
    ]),
  ],
  controllers: [BusinessDependencyController],
  providers: [BusinessDependencyService],
  exports: [BusinessDependencyService],
})
export class BusinessDependencyModule {}
