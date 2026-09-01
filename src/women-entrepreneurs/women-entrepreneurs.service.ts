import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WomenEntrepreneur,
  WomenEntrepreneurDocument,
} from './schemas/women-entrepreneur.schema';
import { CreateWomenEntrepreneurDto } from './dto/create-women-entrepreneur.dto';
import { QueryWomenEntrepreneurDto } from './dto/query-women-entrepreneur.dto';
import { UpdateWomenEntrepreneurDto } from './dto/update-women-entrepreneur.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WomenEntrepreneursService {
  private readonly logger = new Logger(WomenEntrepreneursService.name);

  constructor(
    @InjectModel(WomenEntrepreneur.name)
    private readonly womenModel: Model<WomenEntrepreneurDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(dto: CreateWomenEntrepreneurDto) {
    const phoneTrimmed = dto.phone.trim();
    const emailNormalized = dto.email ? dto.email.toLowerCase().trim() : '';

    // Check duplicate phone
    const existing = await this.womenModel.findOne({ phone: phoneTrimmed });
    if (existing) {
      throw new BadRequestException(
        'A registration with this phone number already exists.',
      );
    }

    const registration = new this.womenModel({
      fullName: dto.fullName.trim(),
      phone: phoneTrimmed,
      email: emailNormalized,
      businessStage: dto.businessStage,
      category: dto.category,
      emailSent: false,
    });

    const saved = await registration.save();

    // Trigger confirmation email if email is provided
    if (emailNormalized) {
      this.notificationsService
        .sendWomenEntrepreneurConfirmationEmail({
          email: emailNormalized,
          fullName: saved.fullName,
          phone: saved.phone,
          businessStage: saved.businessStage,
          category: saved.category,
        })
        .then((sent) => {
          if (sent) {
            this.womenModel
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

  async findAll(query: QueryWomenEntrepreneurDto) {
    const {
      page = 1,
      limit = 10,
      search,
      businessStage,
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const filter: any = {};

    if (businessStage) {
      filter.businessStage = businessStage;
    }
    if (category) {
      filter.category = category;
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
      ];
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.womenModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.womenModel.countDocuments(filter),
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
    const record = await this.womenModel.findById(id).exec();
    if (!record) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return record;
  }

  async update(id: string, dto: UpdateWomenEntrepreneurDto) {
    const updated = await this.womenModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.womenModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return { success: true, message: 'Registration deleted successfully' };
  }

  async getStats() {
    const [total, stages, categories, statuses] = await Promise.all([
      this.womenModel.countDocuments(),
      this.womenModel.aggregate([
        { $group: { _id: '$businessStage', count: { $sum: 1 } } },
      ]),
      this.womenModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      this.womenModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byBusinessStage: stages.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byCategory: categories.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byStatus: statuses.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };
  }

  async exportCsv(query: QueryWomenEntrepreneurDto): Promise<string> {
    const queryForExport = { ...query, limit: 10000, page: 1 };
    const result = await this.findAll(queryForExport);
    const headers = [
      'ID',
      'Full Name',
      'Phone (WhatsApp)',
      'Email',
      'Business Stage',
      'Category / Domain',
      'Status',
      'Email Sent',
      'Notes',
      'Registered Date',
    ];

    const rows = result.data.map((item) => [
      item._id.toString(),
      `"${item.fullName.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      `"${item.email || ''}"`,
      `"${item.businessStage}"`,
      `"${item.category}"`,
      item.status,
      item.emailSent ? 'Yes' : 'No',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      (item as any).createdAt ? (item as any).createdAt.toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
