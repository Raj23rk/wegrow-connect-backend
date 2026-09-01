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

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(TaskSubmission.name)
    private readonly submissionModel: Model<TaskSubmissionDocument>,
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

  async findAll(status?: string, studentId?: string, taskId?: string) {
    const filter: any = {};
    if (status) {
      filter.evaluationStatus = status;
    }
    if (studentId) {
      filter.studentId = new Types.ObjectId(studentId);
    }
    if (taskId) {
      filter.taskId = new Types.ObjectId(taskId);
    }

    return this.submissionModel
      .find(filter)
      .populate('studentId', 'studentId name email mobile studentType schoolName collegeName')
      .populate('taskId', 'title category maxMarks')
      .populate('sessionId')
      .sort({ submittedAt: -1 })
      .exec();
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
    submission.feedback = evaluateDto.feedback || '';
    submission.evaluationStatus = EvaluationStatus.EVALUATED;
    if (evaluatorUserId) {
      submission.evaluatedBy = new Types.ObjectId(evaluatorUserId);
    }
    submission.evaluatedAt = new Date();

    return (submission as TaskSubmissionDocument).save();
  }
}
