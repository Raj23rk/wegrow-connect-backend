import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import {
  TaskSession,
  TaskSessionSchema,
} from '../task-sessions/schemas/task-session.schema';
import {
  TaskSubmission,
  TaskSubmissionSchema,
} from '../submissions/schemas/task-submission.schema';
import { Campaign, CampaignSchema } from '../campaigns/schemas/campaign.schema';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: TaskSession.name, schema: TaskSessionSchema },
      { name: TaskSubmission.name, schema: TaskSubmissionSchema },
      { name: Campaign.name, schema: CampaignSchema },
    ]),
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
