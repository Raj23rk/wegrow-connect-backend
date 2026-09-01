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

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    private readonly jwtService: JwtService,
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

  async findAll(query: QueryStudentDto) {
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
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { studentId: searchRegex },
      ];
    }

    return this.studentModel.find(filter).sort({ createdAt: -1 }).exec();
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
    const students = await this.findAll(query);
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
}
