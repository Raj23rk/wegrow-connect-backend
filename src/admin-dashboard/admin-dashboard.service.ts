import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student, StudentDocument, StudentType } from '../students/schemas/student.schema';
import {
  TaskSession,
  TaskSessionDocument,
  SessionStatus,
} from '../task-sessions/schemas/task-session.schema';
import {
  TaskSubmission,
  TaskSubmissionDocument,
  EvaluationStatus,
} from '../submissions/schemas/task-submission.schema';
import { Campaign, CampaignDocument } from '../campaigns/schemas/campaign.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    @InjectModel(TaskSession.name)
    private readonly sessionModel: Model<TaskSessionDocument>,
    @InjectModel(TaskSubmission.name)
    private readonly submissionModel: Model<TaskSubmissionDocument>,
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
  ) {}

  async getDashboardStats() {
    const [
      totalStudents,
      schoolStudents,
      collegeStudents,
      tasksStarted,
      tasksCompleted,
      pendingEvaluations,
      recentSubmissions,
      campaigns,
    ] = await Promise.all([
      this.studentModel.countDocuments(),
      this.studentModel.countDocuments({ studentType: StudentType.SCHOOL }),
      this.studentModel.countDocuments({ studentType: StudentType.COLLEGE }),
      this.sessionModel.countDocuments(),
      this.sessionModel.countDocuments({
        status: { $in: [SessionStatus.SUBMITTED, SessionStatus.EXPIRED] },
      }),
      this.submissionModel.countDocuments({
        evaluationStatus: EvaluationStatus.PENDING,
      }),
      this.submissionModel
        .find()
        .populate('studentId', 'name studentId email mobile studentType')
        .populate('taskId', 'title category maxMarks')
        .sort({ submittedAt: -1 })
        .limit(10)
        .exec(),
      this.campaignModel.find().exec(),
    ]);

    // Aggregate campaign performance metrics
    const campaignPerformance = await Promise.all(
      campaigns.map(async (c) => {
        const registrationCount = await this.studentModel.countDocuments({
          campaignId: c.campaignId,
        });
        return {
          id: c._id,
          campaignId: c.campaignId,
          name: c.name,
          source: c.source,
          isActive: c.isActive,
          registrationCount,
        };
      }),
    );

    return {
      overview: {
        totalStudents,
        schoolStudents,
        collegeStudents,
        tasksStarted,
        tasksCompleted,
        pendingEvaluations,
      },
      campaignPerformance,
      recentSubmissions,
    };
  }
}
