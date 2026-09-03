import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EvaluationStatus,
  TaskSubmission,
  TaskSubmissionDocument,
} from './schemas/task-submission.schema';
import { EvaluateSubmissionDto } from './dto/evaluate-submission.dto';

import { QuerySubmissionDto } from './dto/query-submission.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(TaskSubmission.name)
    private readonly submissionModel: Model<TaskSubmissionDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async generateUniqueSubmissionId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SUB${year}`;
    const count = await this.submissionModel.countDocuments();
    let seq = count + 1;
    let submissionId = `${prefix}${seq.toString().padStart(6, '0')}`;

    while (await this.submissionModel.exists({ submissionId })) {
      seq += 1;
      submissionId = `${prefix}${seq.toString().padStart(6, '0')}`;
    }

    return submissionId;
  }

  async createSubmission(data: {
    sessionId: string;
    studentId: string;
    taskId: string;
    answer: string;
  }): Promise<TaskSubmission> {
    const existing = await this.submissionModel.findOne({
      sessionId: new Types.ObjectId(data.sessionId),
    });

    if (existing) {
      return existing;
    }

    const submissionId = await this.generateUniqueSubmissionId();

    const submission = new this.submissionModel({
      submissionId,
      sessionId: new Types.ObjectId(data.sessionId),
      studentId: new Types.ObjectId(data.studentId),
      taskId: new Types.ObjectId(data.taskId),
      answer: data.answer,
      submittedAt: new Date(),
      evaluationStatus: EvaluationStatus.PENDING,
    });

    return submission.save();
  }

  async findAll(query: QuerySubmissionDto = {}) {
    const filter: any = {};
    if (query.status) {
      filter.evaluationStatus = query.status;
    }
    if (query.studentId && Types.ObjectId.isValid(query.studentId)) {
      filter.studentId = new Types.ObjectId(query.studentId);
    }
    if (query.taskId && Types.ObjectId.isValid(query.taskId)) {
      filter.taskId = new Types.ObjectId(query.taskId);
    }
    if (query.isSelected !== undefined) {
      filter.selectedForOffer = query.isSelected;
    }
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { submissionId: searchRegex },
      ];
    }

    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.max(1, Number(query.limit)) : 15;
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.submissionModel
        .find(filter)
        .populate('studentId', 'studentId name email mobile studentType schoolName collegeName class department year')
        .populate('taskId', 'title category maxMarks duration')
        .populate('sessionId')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.submissionModel.countDocuments(filter),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      submissions,
      data: submissions,
      total,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const submission = await this.submissionModel
      .findById(id)
      .populate('studentId')
      .populate('taskId')
      .populate('sessionId')
      .exec();

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    return submission;
  }

  async evaluate(
    id: string,
    evaluateDto: EvaluateSubmissionDto,
    evaluatorUserId?: string,
  ) {
    const submission = await this.findOne(id);

    submission.score = evaluateDto.score;
    submission.feedback = evaluateDto.feedback || evaluateDto.remarks || '';
    submission.remarks = evaluateDto.remarks || evaluateDto.feedback || '';
    const isSelected = evaluateDto.isSelected ?? evaluateDto.isWinner;
    if (isSelected !== undefined) {
      submission.selectedForOffer = isSelected;
      submission.isWinner = isSelected;
    }
    submission.evaluationStatus = EvaluationStatus.EVALUATED;
    if (evaluatorUserId && Types.ObjectId.isValid(evaluatorUserId)) {
      submission.evaluatedBy = new Types.ObjectId(evaluatorUserId);
    }
    submission.evaluatedAt = new Date();

    return (submission as TaskSubmissionDocument).save();
  }

  async sendOfferEmail(id: string, customMessage?: string) {
    const submission = await this.findOne(id);

    const student = submission.studentId as any;
    const task = submission.taskId as any;

    if (!student || !student.email) {
      throw new BadRequestException('Student email not found for this submission');
    }

    await this.notificationsService.sendStudentWinnerOfferEmail({
      email: student.email,
      name: student.name,
      studentId: student.studentId,
      taskTitle: task?.title || 'Skill Assessment',
      score: submission.score || 0,
      maxMarks: task?.maxMarks || 100,
      customMessage,
    });

    submission.isWinner = true;
    submission.selectedForOffer = true;
    submission.offerEmailSent = true;
    submission.offerEmailSentAt = new Date();
    await (submission as TaskSubmissionDocument).save();

    return {
      success: true,
      message: `Gift offer email sent to ${student.email}`,
      studentId: student.studentId,
      email: student.email,
      score: submission.score,
    };
  }
}
