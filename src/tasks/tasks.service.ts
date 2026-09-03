import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TargetAudienceType, Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Student } from '../students/schemas/student.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId?: string): Promise<Task> {
    const task = new this.taskModel({
      ...createTaskDto,
      createdBy: userId,
    });
    return task.save();
  }

  async findAll(category?: string, isActive?: boolean) {
    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }
    const tasks = await this.taskModel.find(filter).sort({ createdAt: -1 }).exec();
    return {
      tasks,
      data: tasks,
      total: tasks.length,
    };
  }

  async findOne(id: string, includeAnswers: boolean = false): Promise<Task> {
    const task = await this.taskModel.findById(id).lean().exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    if (!includeAnswers) {
      const { answerKey, ...safeTask } = task as any;
      return safeTask as Task;
    }
    return task as Task;
  }

  async findTaskWithAnswers(id: string): Promise<TaskDocument> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async uploadQuestions(id: string, questions: any[]): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    task.questions = Array.isArray(questions) ? questions : [];
    return task.save();
  }

  async uploadAnswerKey(id: string, answerKey: any[]): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    task.answerKey = Array.isArray(answerKey) ? answerKey : [];
    return task.save();
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const updated = await this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return updated;
  }

  async toggleStatus(id: string): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    task.isActive = !task.isActive;
    return (task as TaskDocument).save();
  }

  async findAssignedTaskForStudent(student: Student): Promise<Task> {
    // 1. Try matching campaignId if present
    if (student.campaignId) {
      const campaignTask = await this.taskModel
        .findOne({
          $or: [
            { targetCampaignId: student.campaignId },
            { targetType: TargetAudienceType.BY_CAMPAIGN, targetCampaignId: student.campaignId },
          ],
          isActive: true,
        })
        .exec();
      if (campaignTask) return campaignTask;
    }

    // 2. Try matching study year if present (college)
    if (student.year) {
      const yearTask = await this.taskModel
        .findOne({
          $or: [
            { targetYear: student.year },
            { targetType: TargetAudienceType.BY_YEAR, targetYear: student.year },
          ],
          isActive: true,
        })
        .exec();
      if (yearTask) return yearTask;
    }

    // 3. Try matching class if present (school)
    if (student.class) {
      const classTask = await this.taskModel
        .findOne({
          $or: [
            { targetClass: student.class },
            { targetType: TargetAudienceType.BY_CLASS, targetClass: student.class },
          ],
          isActive: true,
        })
        .exec();
      if (classTask) return classTask;
    }

    // 4. Try matching department if present
    if (student.department) {
      const deptTask = await this.taskModel
        .findOne({
          $or: [
            { targetDepartment: new RegExp(student.department.trim(), 'i') },
            { targetType: TargetAudienceType.BY_DEPARTMENT, targetDepartment: new RegExp(student.department.trim(), 'i') },
          ],
          isActive: true,
        })
        .exec();
      if (deptTask) return deptTask;
    }

    // 5. Try matching targetType specific criteria
    if (student.studentType === 'COLLEGE') {
      const collegeTask = await this.taskModel
        .findOne({
          targetType: TargetAudienceType.COLLEGE,
          isActive: true,
        })
        .exec();
      if (collegeTask) return collegeTask;
    }

    if (student.studentType === 'SCHOOL') {
      const schoolTask = await this.taskModel
        .findOne({
          targetType: TargetAudienceType.SCHOOL,
          isActive: true,
        })
        .exec();
      if (schoolTask) return schoolTask;
    }

    // 6. Fallback to any active ALL target task
    const defaultTask = await this.taskModel
      .findOne({
        targetType: TargetAudienceType.ALL,
        isActive: true,
      })
      .exec();

    if (defaultTask) return defaultTask;

    // 7. Fallback to latest active task
    const latestTask = await this.taskModel
      .findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .exec();

    if (!latestTask) {
      throw new NotFoundException('No active task available at this time');
    }

    return latestTask;
  }
}
