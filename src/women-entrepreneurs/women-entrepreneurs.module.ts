import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WomenEntrepreneur,
  WomenEntrepreneurSchema,
} from './schemas/women-entrepreneur.schema';
import { WomenEntrepreneursService } from './women-entrepreneurs.service';
import { WomenEntrepreneursController } from './women-entrepreneurs.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WomenEntrepreneur.name, schema: WomenEntrepreneurSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [WomenEntrepreneursController],
  providers: [WomenEntrepreneursService],
  exports: [WomenEntrepreneursService],
})
export class WomenEntrepreneursModule {}
