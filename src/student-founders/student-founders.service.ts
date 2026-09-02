import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StudentFounder,
  StudentFounderDocument,
} from './schemas/student-founder.schema';
import { CreateStudentFounderDto } from './dto/create-student-founder.dto';
import { QueryStudentFounderDto } from './dto/query-student-founder.dto';
import { UpdateStudentFounderDto } from './dto/update-student-founder.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StudentFoundersService {
  private readonly logger = new Logger(StudentFoundersService.name);

  constructor(
    @InjectModel(StudentFounder.name)
    private readonly founderModel: Model<StudentFounderDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(dto: CreateStudentFounderDto) {
    const phoneTrimmed = dto.phone.trim();
    const emailNormalized = dto.email.toLowerCase().trim();

    // Check duplicate phone or email
    const existing = await this.founderModel.findOne({
      $or: [{ phone: phoneTrimmed }, { email: emailNormalized }],
    });

    if (existing) {
      if (existing.phone === phoneTrimmed) {
        throw new BadRequestException(
          'A registration with this phone number already exists.',
        );
      }
      if (existing.email === emailNormalized) {
        throw new BadRequestException(
          'A registration with this email address already exists.',
        );
      }
    }

    const registration = new this.founderModel({
      fullName: dto.fullName.trim(),
      phone: phoneTrimmed,
      email: emailNormalized,
      collegeName: dto.collegeName.trim(),
      yearOfStudy: dto.yearOfStudy,
      course: dto.course.trim(),
      courseStartYear: dto.courseStartYear,
      courseEndYear: dto.courseEndYear,
      readiness: dto.readiness?.trim() || '',
      hasIdea: dto.hasIdea?.trim() || '',
      seriousness: dto.seriousness?.trim() || '',
      lookingForFunding: dto.lookingForFunding?.trim() || '',
      readyToLearn: dto.readyToLearn?.trim() || '',
      industryNiche: dto.industryNiche?.trim() || '',
      emailSent: false,
    });

    const saved = await registration.save();

    // Trigger confirmation email via Resend
    this.notificationsService
      .sendStudentFounderConfirmationEmail({
        email: emailNormalized,
        fullName: saved.fullName,
        phone: saved.phone,
        collegeName: saved.collegeName,
        yearOfStudy: saved.yearOfStudy,
        course: saved.course,
        courseStartYear: saved.courseStartYear,
        courseEndYear: saved.courseEndYear,
      })
      .then((sent) => {
        if (sent) {
          this.founderModel
            .findByIdAndUpdate(saved._id, { emailSent: true })
            .exec();
        }
      })
      .catch((err) => {
        this.logger.error(
          `Failed to send email to ${emailNormalized}: ${err.message}`,
        );
      });

    return saved;
  }

  async findAll(query: QueryStudentFounderDto) {
    const {
      page = 1,
      limit = 10,
      search,
      yearOfStudy,
      collegeName,
      status,
      industryNiche,
      readiness,
      lookingForFunding,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const filter: any = {};

    if (yearOfStudy) {
      filter.yearOfStudy = yearOfStudy;
    }
    if (collegeName) {
      filter.collegeName = new RegExp(collegeName.trim(), 'i');
    }
    if (status) {
      filter.status = status;
    }
    if (industryNiche) {
      filter.industryNiche = new RegExp(industryNiche.trim(), 'i');
    }
    if (readiness) {
      filter.readiness = readiness;
    }
    if (lookingForFunding) {
      filter.lookingForFunding = lookingForFunding;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { collegeName: searchRegex },
        { course: searchRegex },
        { industryNiche: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.founderModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.founderModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const record = await this.founderModel.findById(id).exec();
    if (!record) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return record;
  }

  async update(id: string, dto: UpdateStudentFounderDto) {
    const updated = await this.founderModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.founderModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return { success: true, message: 'Registration deleted successfully' };
  }

  async getStats() {
    const [total, years, colleges, statuses, niches] = await Promise.all([
      this.founderModel.countDocuments(),
      this.founderModel.aggregate([
        { $group: { _id: '$yearOfStudy', count: { $sum: 1 } } },
      ]),
      this.founderModel.aggregate([
        { $group: { _id: '$collegeName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      this.founderModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.founderModel.aggregate([
        { $match: { industryNiche: { $exists: true, $ne: '' } } },
        { $group: { _id: '$industryNiche', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      total,
      byYearOfStudy: years.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      topColleges: colleges.map((c) => ({ college: c._id, count: c.count })),
      byStatus: statuses.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byIndustryNiche: niches.map((n) => ({ niche: n._id, count: n.count })),
    };
  }

  async exportCsv(query: QueryStudentFounderDto): Promise<string> {
    const queryForExport = { ...query, limit: 10000, page: 1 };
    const result = await this.findAll(queryForExport);
    const headers = [
      'ID',
      'Full Name',
      'Phone (WhatsApp)',
      'Email',
      'College Name',
      'Year of Study',
      'Course / Degree',
      'Course Start Year',
      'Course End Year',
      'Readiness',
      'Business Idea',
      'Seriousness',
      'Looking for Funding',
      'Ready to Learn',
      'Industry Niche',
      'Status',
      'Email Sent',
      'Notes',
      'Registered Date',
    ];

    const rows = result.data.map((item) => [
      item._id.toString(),
      `"${item.fullName.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      `"${item.email}"`,
      `"${item.collegeName.replace(/"/g, '""')}"`,
      `"${item.yearOfStudy}"`,
      `"${item.course.replace(/"/g, '""')}"`,
      item.courseStartYear,
      item.courseEndYear,
      `"${(item.readiness || '').replace(/"/g, '""')}"`,
      `"${(item.hasIdea || '').replace(/"/g, '""')}"`,
      `"${(item.seriousness || '').replace(/"/g, '""')}"`,
      `"${(item.lookingForFunding || '').replace(/"/g, '""')}"`,
      `"${(item.readyToLearn || '').replace(/"/g, '""')}"`,
      `"${(item.industryNiche || '').replace(/"/g, '""')}"`,
      item.status,
      item.emailSent ? 'Yes' : 'No',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      (item as any).createdAt ? (item as any).createdAt.toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
