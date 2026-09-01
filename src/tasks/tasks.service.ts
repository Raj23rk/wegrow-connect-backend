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

  async findAll(category?: string, isActive?: boolean): Promise<Task[]> {
    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }
    return this.taskModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
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
    const task = await this.findOne(id);
    task.isActive = !task.isActive;
    return (task as TaskDocument).save();
  }

  async findAssignedTaskForStudent(student: Student): Promise<Task> {
    // 1. Try matching campaignId if present
    if (student.campaignId) {
      const campaignTask = await this.taskModel
        .findOne({
          targetCampaignId: student.campaignId,
          isActive: true,
        })
        .exec();
      if (campaignTask) return campaignTask;
    }

    // 2. Try matching targetType specific criteria
    if (student.studentType === 'COLLEGE') {
      const collegeTask = await this.taskModel
        .findOne({
          targetType: TargetAudienceType.COLLEGE,
          isActive: true,
          $or: [
            { targetDepartment: student.department },
            { targetYear: student.year },
          ],
        })
        .exec();
      if (collegeTask) return collegeTask;

      const anyCollegeTask = await this.taskModel
        .findOne({
          targetType: TargetAudienceType.COLLEGE,
          isActive: true,
        })
        .exec();
      if (anyCollegeTask) return anyCollegeTask;
    }

    if (student.studentType === 'SCHOOL') {
      const schoolTask = await this.taskModel
        .findOne({
          targetType: TargetAudienceType.SCHOOL,
          isActive: true,
          targetClass: student.class,
        })
        .exec();
      if (schoolTask) return schoolTask;

      const anySchoolTask = await this.taskModel
        .findOne({
          targetType: TargetAudienceType.SCHOOL,
          isActive: true,
        })
        .exec();
      if (anySchoolTask) return anySchoolTask;
    }

    // 3. Fallback to any active ALL target task
    const defaultTask = await this.taskModel
      .findOne({
        targetType: TargetAudienceType.ALL,
        isActive: true,
      })
      .exec();

    if (defaultTask) return defaultTask;

    // 4. Fallback to latest active task
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
