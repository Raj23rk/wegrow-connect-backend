import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SessionStatus,
  TaskSession,
  TaskSessionDocument,
} from './schemas/task-session.schema';
import { StartTaskSessionDto } from './dto/start-task-session.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { LogCheatingEventDto } from './dto/log-cheating-event.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { TasksService } from '../tasks/tasks.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class TaskSessionsService {
  constructor(
    @InjectModel(TaskSession.name)
    private readonly sessionModel: Model<TaskSessionDocument>,
    private readonly tasksService: TasksService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  async startSession(dto: StartTaskSessionDto) {
    const task = await this.tasksService.findOne(dto.taskId);
    if (!task.isActive) {
      throw new BadRequestException('This task is currently inactive');
    }

    // Check if session already exists for this student and task
    let session = await this.sessionModel
      .findOne({
        studentId: new Types.ObjectId(dto.studentId),
        taskId: new Types.ObjectId(dto.taskId),
      })
      .exec();

    const now = new Date();

    if (session) {
      // Check if expired
      if (session.status === SessionStatus.IN_PROGRESS && now > session.expiresAt) {
        await this.autoSubmitExpiredSession(session);
      }

      const remainingSeconds = Math.max(
        0,
        Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000),
      );

      return {
        session,
        remainingSeconds,
        isExpired: now > session.expiresAt || session.status !== SessionStatus.IN_PROGRESS,
      };
    }

    // Create new session
    const durationMinutes = task.duration || 60;
    const startedAt = now;
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    session = new this.sessionModel({
      studentId: new Types.ObjectId(dto.studentId),
      taskId: new Types.ObjectId(dto.taskId),
      startedAt,
      expiresAt,
      status: SessionStatus.IN_PROGRESS,
      latestAnswer: '',
    });

    const savedSession = await session.save();
    const remainingSeconds = durationMinutes * 60;

    return {
      session: savedSession,
      remainingSeconds,
      isExpired: false,
    };
  }

  async getActiveSession(studentId: string) {
    const now = new Date();
    const session = await this.sessionModel
      .findOne({
        studentId: new Types.ObjectId(studentId),
        status: SessionStatus.IN_PROGRESS,
      })
      .populate('taskId')
      .exec();

    if (!session) {
      throw new NotFoundException('No active task session found');
    }

    if (now > session.expiresAt) {
      await this.autoSubmitExpiredSession(session);
      throw new ForbiddenException('Task session timer has expired and answers were auto-submitted');
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000),
    );

    return {
      session,
      remainingSeconds,
    };
  }

  async saveAnswer(sessionId: string, dto: SaveAnswerDto) {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new ForbiddenException(
        `Cannot save answer. Session is currently ${session.status}`,
      );
    }

    const now = new Date();
    if (now > session.expiresAt) {
      await this.autoSubmitExpiredSession(session);
      throw new ForbiddenException('Time expired. Your work has been automatically submitted.');
    }

    session.latestAnswer = dto.answer;
    await session.save();

    const remainingSeconds = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000),
    );

    return {
      message: 'Draft saved successfully',
      savedAt: now,
      remainingSeconds,
    };
  }

  async logCheatingEvent(sessionId: string, dto: LogCheatingEventDto) {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (dto.eventType === 'TAB_SWITCH') session.tabSwitchCount += 1;
    if (dto.eventType === 'FULLSCREEN_EXIT') session.fullscreenExitCount += 1;
    if (dto.eventType === 'COPY_ATTEMPT') session.copyAttemptCount += 1;
    if (dto.eventType === 'PASTE_ATTEMPT') session.pasteAttemptCount += 1;

    session.suspiciousActivity.push({
      eventType: dto.eventType,
      timestamp: new Date(),
      details: dto.details || '',
    });

    await session.save();

    return {
      message: 'Anti-cheating event logged',
      tabSwitchCount: session.tabSwitchCount,
      fullscreenExitCount: session.fullscreenExitCount,
      copyAttemptCount: session.copyAttemptCount,
      pasteAttemptCount: session.pasteAttemptCount,
    };
  }

  async submitSession(sessionId: string, dto: SubmitTaskDto) {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.status === SessionStatus.SUBMITTED) {
      throw new BadRequestException('Task session has already been submitted');
    }

    const now = new Date();
    const finalAnswer = dto.answer !== undefined ? dto.answer : session.latestAnswer;

    session.latestAnswer = finalAnswer;
    session.submittedAt = now;
    session.status = now > session.expiresAt ? SessionStatus.EXPIRED : SessionStatus.SUBMITTED;

    const savedSession = await session.save();

    const submission = await this.submissionsService.createSubmission({
      sessionId: savedSession._id.toString(),
      studentId: savedSession.studentId.toString(),
      taskId: savedSession.taskId.toString(),
      answer: finalAnswer,
    });

    return {
      message: 'Task submitted successfully',
      submissionId: submission.submissionId,
      submittedAt: savedSession.submittedAt,
      status: savedSession.status,
    };
  }

  private async autoSubmitExpiredSession(session: TaskSessionDocument) {
    session.status = SessionStatus.EXPIRED;
    session.submittedAt = session.expiresAt;
    await session.save();

    await this.submissionsService.createSubmission({
      sessionId: session._id.toString(),
      studentId: session.studentId.toString(),
      taskId: session.taskId.toString(),
      answer: session.latestAnswer || '',
    });
  }

  async findSessionById(id: string) {
    const session = await this.sessionModel
      .findById(id)
      .populate('studentId')
      .populate('taskId')
      .exec();

    if (!session) {
      throw new NotFoundException(`Task session ${id} not found`);
    }

    return session;
  }
}
