import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BusinessFounder,
  BusinessFounderSchema,
} from './schemas/business-founder.schema';
import { BusinessFoundersService } from './business-founders.service';
import { BusinessFoundersController } from './business-founders.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessFounder.name, schema: BusinessFounderSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [BusinessFoundersController],
  providers: [BusinessFoundersService],
  exports: [BusinessFoundersService],
})
export class BusinessFoundersModule {}
