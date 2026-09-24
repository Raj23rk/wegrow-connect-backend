import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EventTeaser,
  EventTeaserDocument,
  TeaserSubmissionStatus,
} from './schemas/event-teaser.schema';
import { CreateEventTeaserDto } from './dto/create-event-teaser.dto';
import { QueryEventTeaserDto } from './dto/query-event-teaser.dto';
import { UpdateEventTeaserDto } from './dto/update-event-teaser.dto';

@Injectable()
export class EventTeaserService {
  private readonly logger = new Logger(EventTeaserService.name);

  constructor(
    @InjectModel(EventTeaser.name)
    private readonly teaserModel: Model<EventTeaserDocument>,
  ) {}

  /**
   * 1. Create a new Event Teaser submission
   */
  async create(dto: CreateEventTeaserDto) {
    const phoneTrimmed = dto.phone.trim();
    const emailNormalized = dto.email ? dto.email.toLowerCase().trim() : '';
    const eventId = (dto.eventId || 'MYSTERY-EVENT-2026').trim().toUpperCase();

    const submission = new this.teaserModel({
      name: dto.name.trim(),
      phone: phoneTrimmed,
      email: emailNormalized,
      guess: dto.guess.trim(),
      eventId,
      status: TeaserSubmissionStatus.PENDING,
    });

    const saved = await submission.save();
    return saved;
  }

  /**
   * 2. Find all Event Teaser submissions with pagination, search, and filtering
   */
  async findAll(query: QueryEventTeaserDto) {
    const {
      page = 1,
      limit = 10,
      search,
      guess,
      status,
      eventId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const filter: any = {};

    if (eventId) {
      filter.eventId = eventId.trim().toUpperCase();
    }
    if (status) {
      filter.status = status;
    }
    if (guess) {
      filter.guess = new RegExp(guess.trim(), 'i');
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { guess: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseCountFilter: any = eventId
      ? { eventId: eventId.trim().toUpperCase() }
      : {};

    const [
      data,
      total,
      totalSubmissions,
      pendingCount,
      reviewedCount,
      winnerCount,
      todayCount,
      distinctEvents,
    ] = await Promise.all([
      this.teaserModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.teaserModel.countDocuments(filter),
      this.teaserModel.countDocuments(baseCountFilter),
      this.teaserModel.countDocuments({
        ...baseCountFilter,
        status: TeaserSubmissionStatus.PENDING,
      }),
      this.teaserModel.countDocuments({
        ...baseCountFilter,
        status: TeaserSubmissionStatus.REVIEWED,
      }),
      this.teaserModel.countDocuments({
        ...baseCountFilter,
        status: TeaserSubmissionStatus.WINNER,
      }),
      this.teaserModel.countDocuments({
        ...baseCountFilter,
        createdAt: { $gte: todayStart },
      }),
      this.teaserModel.distinct('eventId'),
    ]);

    const summary = {
      totalSubmissions,
      total,
      pending: pendingCount,
      reviewed: reviewedCount,
      winner: winnerCount,
      todayCount,
      distinctEvents: (distinctEvents || []).filter(Boolean),
    };

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
      summary,
      counts: summary,
      stats: summary,
    };
  }

  /**
   * 3. Find one submission by ID
   */
  async findOne(id: string) {
    const record = await this.teaserModel.findById(id).exec();
    if (!record) {
      throw new NotFoundException(`Teaser submission with ID ${id} not found`);
    }
    return record;
  }

  /**
   * 4. Update submission by ID
   */
  async update(id: string, dto: UpdateEventTeaserDto) {
    const updated = await this.teaserModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Teaser submission with ID ${id} not found`);
    }
    return updated;
  }

  /**
   * 5. Delete submission by ID
   */
  async remove(id: string) {
    const deleted = await this.teaserModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Teaser submission with ID ${id} not found`);
    }
    return { success: true, message: 'Submission deleted successfully' };
  }

  /**
   * 6. Get stats summary
   */
  async getStats(eventId?: string) {
    const baseFilter: any = {};
    if (eventId) {
      baseFilter.eventId = eventId.trim().toUpperCase();
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, todayCount, statuses, topGuesses] = await Promise.all([
      this.teaserModel.countDocuments(baseFilter),
      this.teaserModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: todayStart },
      }),
      this.teaserModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.teaserModel.aggregate([
        { $match: { ...baseFilter, guess: { $exists: true, $ne: '' } } },
        { $group: { _id: '$guess', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      total,
      todayCount,
      byStatus: statuses.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      topGuesses: topGuesses.map((g) => ({ guess: g._id, count: g.count })),
    };
  }

  /**
   * 7. Export CSV
   */
  async exportCsv(query: QueryEventTeaserDto): Promise<string> {
    const queryForExport = { ...query, limit: 10000, page: 1 };
    const result = await this.findAll(queryForExport);

    const headers = [
      'ID',
      'Event ID',
      'Full Name',
      'Phone Number',
      'Email',
      'Event Guess',
      'Status',
      'Admin Notes',
      'Submitted Date',
    ];

    const rows = result.data.map((item: any) => [
      item._id.toString(),
      `"${item.eventId || 'MYSTERY-EVENT-2026'}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.phone || ''}"`,
      `"${(item.email || '').replace(/"/g, '""')}"`,
      `"${(item.guess || '').replace(/"/g, '""')}"`,
      item.status || '',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      item.createdAt ? new Date(item.createdAt).toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
