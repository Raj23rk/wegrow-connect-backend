import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ContactModule } from './contact/contact.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { CertificatesModule } from './certificates/certificates.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    // ============================================================
    // ENVIRONMENT CONFIG
    // ============================================================

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ============================================================
    // MONGODB
    // ============================================================

    MongooseModule.forRootAsync({
      imports: [ConfigModule],

      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),

      inject: [ConfigService],
    }),

    // ============================================================
    // MODULES
    // ============================================================

    UsersModule,

    AuthModule,

    EventsModule,

    BookingsModule,

    NotificationsModule,

    ContactModule,

    // ============================================================
    // NEW MODULES
    // ============================================================

    SubscriptionsModule,

    CertificatesModule,

    InvoicesModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}

