import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Student, StudentDocument, StudentType } from './schemas/student.schema';
import { RegisterStudentTaskDto } from './dto/register-student-task.dto';
import { QueryStudentDto } from './dto/query-student.dto';

import { TasksService } from '../tasks/tasks.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    private readonly jwtService: JwtService,
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateUniqueStudentId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WG${year}`;

    // Get count of registered students this year to form 6-digit index
    const count = await this.studentModel.countDocuments();
    let sequence = count + 1;
    let studentId = `${prefix}${sequence.toString().padStart(6, '0')}`;

    // Ensure uniqueness
    while (await this.studentModel.exists({ studentId })) {
      sequence += 1;
      studentId = `${prefix}${sequence.toString().padStart(6, '0')}`;
    }

    return studentId;
  }

  async register(registerDto: RegisterStudentTaskDto) {
    const normalizedEmail = registerDto.email.toLowerCase().trim();
    const normalizedMobile = registerDto.mobile.trim();

    // Check duplicate mobile or email
    const existing = await this.studentModel.findOne({
      $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }],
    });

    if (existing) {
      if (existing.email === normalizedEmail) {
        throw new BadRequestException('Email is already registered');
      }
      if (existing.mobile === normalizedMobile) {
        throw new BadRequestException('Mobile number is already registered');
      }
    }

    const whatsapp =
      registerDto.useMobileAsWhatsapp || !registerDto.whatsapp
        ? normalizedMobile
        : registerDto.whatsapp.trim();

    const studentId = await this.generateUniqueStudentId();

    const student = new this.studentModel({
      studentId,
      name: registerDto.name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      whatsapp,
      studentType: registerDto.studentType,
      schoolName:
        registerDto.studentType === StudentType.SCHOOL
          ? registerDto.schoolName
          : undefined,
      class:
        registerDto.studentType === StudentType.SCHOOL
          ? registerDto.class
          : undefined,
      collegeName:
        registerDto.studentType === StudentType.COLLEGE
          ? registerDto.collegeName
          : undefined,
      department:
        registerDto.studentType === StudentType.COLLEGE
          ? registerDto.department
          : undefined,
      year:
        registerDto.studentType === StudentType.COLLEGE
          ? registerDto.year
          : undefined,
      campaignId: registerDto.campaignId
        ? registerDto.campaignId.toUpperCase()
        : undefined,
    });

    const savedStudent = await student.save();

    const payload = {
      sub: savedStudent._id.toString(),
      studentId: savedStudent.studentId,
      email: savedStudent.email,
      role: 'STUDENT',
    };

    const token = this.jwtService.sign(payload);

    return {
      student: savedStudent,
      accessToken: token,
    };
  }

  private buildFilter(query: QueryStudentDto) {
    const filter: any = {};

    if (query.studentType) {
      filter.studentType = query.studentType;
    }
    if (query.department) {
      filter.department = new RegExp(query.department, 'i');
    }
    if (query.year) {
      filter.year = query.year;
    }
    if (query.class) {
      filter.class = query.class;
    }
    if (query.campaignId) {
      filter.campaignId = query.campaignId.toUpperCase();
    }
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { studentId: searchRegex },
      ];
    }

    return filter;
  }

  async findAll(query: QueryStudentDto) {
    const filter = this.buildFilter(query);

    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.max(1, Number(query.limit)) : 15;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

    const [students, total] = await Promise.all([
      this.studentModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.studentModel.countDocuments(filter),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      students,
      data: students,
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
    const student = await this.studentModel.findById(id).exec();
    if (!student) {
      throw new NotFoundException(`Student not found`);
    }
    return student;
  }

  async findByStudentId(studentId: string) {
    const student = await this.studentModel.findOne({ studentId }).exec();
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }
    return student;
  }

  async exportCsv(query: QueryStudentDto): Promise<string> {
    const filter = this.buildFilter(query);
    const students = await this.studentModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
    const headers = [
      'Student ID',
      'Name',
      'Email',
      'Mobile',
      'WhatsApp',
      'Student Type',
      'School Name',
      'Class',
      'College Name',
      'Department',
      'Year',
      'Campaign ID',
      'Registered Date',
    ];

    const rows = students.map((s) => [
      s.studentId,
      `"${s.name}"`,
      s.email,
      s.mobile,
      s.whatsapp,
      s.studentType,
      `"${s.schoolName || ''}"`,
      `"${s.class || ''}"`,
      `"${s.collegeName || ''}"`,
      `"${s.department || ''}"`,
      `"${s.year || ''}"`,
      s.campaignId || '',
      (s as any).createdAt ? (s as any).createdAt.toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async sendTaskLink(studentId: string, taskId?: string) {
    const student = await this.findOne(studentId);
    let task: any;
    if (taskId) {
      task = await this.tasksService.findOne(taskId);
    } else {
      task = await this.tasksService.findAssignedTaskForStudent(student);
    }

    const frontendUrl =
      process.env.FRONTEND_URL ||
      'https://wegrow-connect-frontend.vercel.app';
    const taskUrl = `${frontendUrl}/task?studentId=${student._id}&taskId=${task._id}`;

    await this.notificationsService.sendStudentTaskAssignmentEmail({
      email: student.email,
      name: student.name,
      studentId: student.studentId,
      taskTitle: task.title,
      taskCategory: task.category,
      duration: task.duration || 60,
      maxMarks: task.maxMarks || 100,
      taskUrl,
    });

    student.assignedTaskId = task._id;
    student.taskEmailSent = true;
    student.taskEmailSentAt = new Date();
    await student.save();

    return {
      success: true,
      message: `Task link sent successfully to ${student.email}`,
      studentId: student.studentId,
      taskId: task._id,
      taskTitle: task.title,
      taskUrl,
    };
  }

  async sendBulkTaskLinks(studentIds?: string[]) {
    let students: StudentDocument[];
    if (studentIds && studentIds.length > 0) {
      students = await this.studentModel.find({ _id: { $in: studentIds } }).exec();
    } else {
      students = await this.studentModel.find({ taskEmailSent: { $ne: true } }).exec();
    }

    const results = [];
    for (const student of students) {
      try {
        const res = await this.sendTaskLink(student._id.toString());
        results.push(res);
      } catch (err: any) {
        results.push({ studentId: student.studentId, success: false, message: err.message });
      }
    }

    return {
      success: true,
      total: students.length,
      sentCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  }
}
