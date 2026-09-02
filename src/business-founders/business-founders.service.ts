import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BusinessFounder,
  BusinessFounderDocument,
} from './schemas/business-founder.schema';
import { CreateBusinessFounderDto } from './dto/create-business-founder.dto';
import { QueryBusinessFounderDto } from './dto/query-business-founder.dto';
import { UpdateBusinessFounderDto } from './dto/update-business-founder.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BusinessFoundersService {
  private readonly logger = new Logger(BusinessFoundersService.name);

  constructor(
    @InjectModel(BusinessFounder.name)
    private readonly founderModel: Model<BusinessFounderDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(dto: CreateBusinessFounderDto) {
    const phoneTrimmed = dto.phone.trim();
    const emailNormalized = dto.email ? dto.email.toLowerCase().trim() : '';

    // Check duplicate phone or email (if email is provided)
    const orConditions: any[] = [{ phone: phoneTrimmed }];
    if (emailNormalized) {
      orConditions.push({ email: emailNormalized });
    }

    const existing = await this.founderModel.findOne({
      $or: orConditions,
    });

    if (existing) {
      if (existing.phone === phoneTrimmed) {
        throw new BadRequestException(
          'A registration with this phone number already exists.',
        );
      }
      if (emailNormalized && existing.email === emailNormalized) {
        throw new BadRequestException(
          'A registration with this email address already exists.',
        );
      }
    }

    const registration = new this.founderModel({
      fullName: dto.fullName.trim(),
      phone: phoneTrimmed,
      email: emailNormalized,
      businessName: dto.businessName?.trim() || '',
      industry: dto.industry?.trim() || '',
      yearsInBusiness: dto.yearsInBusiness?.trim() || '',
      biggestPriority: dto.biggestPriority?.trim() || '',
      growthBlocker: dto.growthBlocker?.trim() || '',
      hasTeam: dto.hasTeam?.trim() || '',
      futureVision: dto.futureVision?.trim() || '',
      growthChallenge: dto.growthChallenge?.trim() || '',
      emailSent: false,
    });

    const saved = await registration.save();

    // Trigger confirmation email via NotificationsService if email provided
    if (emailNormalized) {
      this.notificationsService
        .sendBusinessFounderConfirmationEmail({
          email: emailNormalized,
          fullName: saved.fullName,
          phone: saved.phone,
          businessName: saved.businessName,
          industry: saved.industry,
          yearsInBusiness: saved.yearsInBusiness,
          biggestPriority: saved.biggestPriority,
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
    }

    return saved;
  }

  async findAll(query: QueryBusinessFounderDto) {
    const {
      page = 1,
      limit = 10,
      search,
      industry,
      yearsInBusiness,
      biggestPriority,
      growthBlocker,
      hasTeam,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const filter: any = {};

    if (industry) {
      filter.industry = new RegExp(industry.trim(), 'i');
    }
    if (yearsInBusiness) {
      filter.yearsInBusiness = yearsInBusiness;
    }
    if (biggestPriority) {
      filter.biggestPriority = biggestPriority;
    }
    if (growthBlocker) {
      filter.growthBlocker = growthBlocker;
    }
    if (hasTeam) {
      filter.hasTeam = hasTeam;
    }
    if (status) {
      filter.status = status;
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
        { businessName: searchRegex },
        { industry: searchRegex },
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

  async update(id: string, dto: UpdateBusinessFounderDto) {
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
    const [total, industries, years, priorities, blockers, teams, statuses] =
      await Promise.all([
        this.founderModel.countDocuments(),
        this.founderModel.aggregate([
          { $match: { industry: { $exists: true, $ne: '' } } },
          { $group: { _id: '$industry', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.founderModel.aggregate([
          { $match: { yearsInBusiness: { $exists: true, $ne: '' } } },
          { $group: { _id: '$yearsInBusiness', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.founderModel.aggregate([
          { $match: { biggestPriority: { $exists: true, $ne: '' } } },
          { $group: { _id: '$biggestPriority', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.founderModel.aggregate([
          { $match: { growthBlocker: { $exists: true, $ne: '' } } },
          { $group: { _id: '$growthBlocker', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.founderModel.aggregate([
          { $match: { hasTeam: { $exists: true, $ne: '' } } },
          { $group: { _id: '$hasTeam', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.founderModel.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

    return {
      total,
      byIndustry: industries.map((i) => ({ industry: i._id, count: i.count })),
      byYearsInBusiness: years.map((y) => ({
        yearsInBusiness: y._id,
        count: y.count,
      })),
      byPriority: priorities.map((p) => ({
        priority: p._id,
        count: p.count,
      })),
      byGrowthBlocker: blockers.map((b) => ({
        growthBlocker: b._id,
        count: b.count,
      })),
      byHasTeam: teams.map((t) => ({ hasTeam: t._id, count: t.count })),
      byStatus: statuses.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };
  }

  async exportCsv(query: QueryBusinessFounderDto): Promise<string> {
    const queryForExport = { ...query, limit: 10000, page: 1 };
    const result = await this.findAll(queryForExport);
    const headers = [
      'ID',
      'Full Name',
      'Phone (WhatsApp)',
      'Email',
      'Business / Company Name',
      'Industry / Sector',
      'Years in Business',
      'Biggest Priority',
      'Growth Blocker',
      'Has Team',
      'Future Vision',
      'Growth Challenge / Notes',
      'Status',
      'Email Sent',
      'Admin Notes',
      'Registered Date',
    ];

    const rows = result.data.map((item) => [
      item._id.toString(),
      `"${item.fullName.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      `"${(item.email || '').replace(/"/g, '""')}"`,
      `"${(item.businessName || '').replace(/"/g, '""')}"`,
      `"${(item.industry || '').replace(/"/g, '""')}"`,
      `"${(item.yearsInBusiness || '').replace(/"/g, '""')}"`,
      `"${(item.biggestPriority || '').replace(/"/g, '""')}"`,
      `"${(item.growthBlocker || '').replace(/"/g, '""')}"`,
      `"${(item.hasTeam || '').replace(/"/g, '""')}"`,
      `"${(item.futureVision || '').replace(/"/g, '""')}"`,
      `"${(item.growthChallenge || '').replace(/"/g, '""')}"`,
      item.status,
      item.emailSent ? 'Yes' : 'No',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      (item as any).createdAt ? (item as any).createdAt.toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
