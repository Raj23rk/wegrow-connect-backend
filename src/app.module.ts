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
import { CampaignsModule } from './campaigns/campaigns.module';
import { StudentsModule } from './students/students.module';
import { TasksModule } from './tasks/tasks.module';
import { TaskSessionsModule } from './task-sessions/task-sessions.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { WomenEntrepreneursModule } from './women-entrepreneurs/women-entrepreneurs.module';
import { StudentFoundersModule } from './student-founders/student-founders.module';
import { BusinessFoundersModule } from './business-founders/business-founders.module';
import { SingAlongModule } from './sing-along/sing-along.module';
import { PaymentsModule } from './payments/payments.module';
import { BusinessDependencyModule } from './business-dependency/business-dependency.module';

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

    SubscriptionsModule,

    CertificatesModule,

    InvoicesModule,

    // ============================================================
    // STUDENT TASK & REGISTRATION PLATFORM MODULES
    // ============================================================

    CampaignsModule,

    StudentsModule,

    TasksModule,

    TaskSessionsModule,

    SubmissionsModule,

    AdminDashboardModule,

    // ============================================================
    // COMMUNITY REGISTRATION FORM MODULES
    // ============================================================

    WomenEntrepreneursModule,

    StudentFoundersModule,

    BusinessFoundersModule,

    SingAlongModule,
    PaymentsModule,
    BusinessDependencyModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}

