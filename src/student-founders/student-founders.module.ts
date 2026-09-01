import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StudentFounder,
  StudentFounderSchema,
} from './schemas/student-founder.schema';
import { StudentFoundersService } from './student-founders.service';
import { StudentFoundersController } from './student-founders.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentFounder.name, schema: StudentFounderSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [StudentFoundersController],
  providers: [StudentFoundersService],
  exports: [StudentFoundersService],
})
export class StudentFoundersModule {}
