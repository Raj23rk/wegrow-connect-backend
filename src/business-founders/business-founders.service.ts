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
  FounderRegistrationStatus,
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
    const eventId = (dto.eventId || 'BUSINESS-OCT-09-2026').trim().toUpperCase();

    // Check duplicate phone or email (if email is provided) for this event
    const orConditions: any[] = [{ phone: phoneTrimmed }];
    if (emailNormalized) {
      orConditions.push({ email: emailNormalized });
    }

    const existing = await this.founderModel.findOne({
      eventId,
      $or: orConditions,
    }).lean().exec();

    if (existing) {
      if (existing.phone === phoneTrimmed) {
        throw new BadRequestException(
          `A registration with phone number ${phoneTrimmed} already exists for event ${eventId}.`,
        );
      }
      if (emailNormalized && existing.email === emailNormalized) {
        throw new BadRequestException(
          `A registration with email ${emailNormalized} already exists for event ${eventId}.`,
        );
      }
    }

    const registration = new this.founderModel({
      fullName: dto.fullName.trim(),
      phone: phoneTrimmed,
      email: emailNormalized,
      state: dto.state?.trim() || '',
      city: dto.city?.trim() || '',
      isBusinessOwner: dto.isBusinessOwner?.trim() || '',
      yearsInBusiness: dto.yearsInBusiness?.trim() || '',
      teamSize: dto.teamSize?.trim() || '',
      industry: dto.industry?.trim() || '',
      annualTurnover: dto.annualTurnover?.trim() || '',
      productService: dto.productService?.trim() || '',
      currentRole: dto.currentRole?.trim() || '',
      businessName: dto.businessName?.trim() || '',
      biggestPriority: dto.biggestPriority?.trim() || '',
      growthBlocker: dto.growthBlocker?.trim() || '',
      hasTeam: dto.hasTeam?.trim() || '',
      futureVision: dto.futureVision?.trim() || '',
      growthChallenge: dto.growthChallenge?.trim() || '',
      eventId,
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
          growthBlocker: saved.growthBlocker,
          hasTeam: saved.hasTeam,
          futureVision: saved.futureVision,
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
      state,
      city,
      isBusinessOwner,
      industry,
      yearsInBusiness,
      teamSize,
      annualTurnover,
      currentRole,
      biggestPriority,
      growthBlocker,
      hasTeam,
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
    if (state) {
      filter.state = new RegExp(state.trim(), 'i');
    }
    if (city) {
      filter.city = new RegExp(city.trim(), 'i');
    }
    if (isBusinessOwner) {
      filter.isBusinessOwner = isBusinessOwner.trim().toLowerCase();
    }
    if (industry) {
      filter.industry = new RegExp(industry.trim(), 'i');
    }
    if (yearsInBusiness) {
      filter.yearsInBusiness = yearsInBusiness;
    }
    if (teamSize) {
      filter.teamSize = teamSize;
    }
    if (annualTurnover) {
      filter.annualTurnover = annualTurnover;
    }
    if (currentRole) {
      filter.currentRole = currentRole;
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
        { city: searchRegex },
        { state: searchRegex },
        { productService: searchRegex },
        { currentRole: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseCountFilter: any = eventId ? { eventId: eventId.trim().toUpperCase() } : {};

    const [
      data,
      total,
      totalFounders,
      confirmedCount,
      attendedCount,
      cancelledCount,
      newRegsCount,
      distinctEvents,
    ] = await Promise.all([
      this.founderModel.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
      this.founderModel.countDocuments(filter),
      this.founderModel.countDocuments(baseCountFilter),
      this.founderModel.countDocuments({
        ...baseCountFilter,
        status: FounderRegistrationStatus.CONFIRMED,
      }),
      this.founderModel.countDocuments({
        ...baseCountFilter,
        status: FounderRegistrationStatus.ATTENDED,
      }),
      this.founderModel.countDocuments({
        ...baseCountFilter,
        status: FounderRegistrationStatus.CANCELLED,
      }),
      this.founderModel.countDocuments({
        ...baseCountFilter,
        createdAt: { $gte: todayStart },
      }),
      this.founderModel.distinct('eventId'),
    ]);

    const summary = {
      totalFounders,
      total,
      confirmed: confirmedCount,
      attended: attendedCount,
      attend: attendedCount,
      cancelled: cancelledCount,
      newRegs: newRegsCount,
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

  async getStats(eventId?: string) {
    const baseFilter: any = {};
    if (eventId) {
      baseFilter.eventId = eventId.trim().toUpperCase();
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      total,
      confirmedCount,
      attendedCount,
      cancelledCount,
      newRegsCount,
      industries,
      years,
      teamSizes,
      annualTurnovers,
      cities,
      states,
      businessOwners,
      currentRoles,
      priorities,
      blockers,
      teams,
      statuses,
      distinctEvents,
    ] = await Promise.all([
      this.founderModel.countDocuments(baseFilter),
      this.founderModel.countDocuments({
        ...baseFilter,
        status: FounderRegistrationStatus.CONFIRMED,
      }),
      this.founderModel.countDocuments({
        ...baseFilter,
        status: FounderRegistrationStatus.ATTENDED,
      }),
      this.founderModel.countDocuments({
        ...baseFilter,
        status: FounderRegistrationStatus.CANCELLED,
      }),
      this.founderModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: todayStart },
      }),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            industry: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            yearsInBusiness: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$yearsInBusiness', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            teamSize: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$teamSize', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            annualTurnover: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$annualTurnover', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            city: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            state: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$state', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            isBusinessOwner: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$isBusinessOwner', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            currentRole: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$currentRole', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            biggestPriority: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$biggestPriority', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            growthBlocker: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$growthBlocker', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        {
          $match: {
            ...baseFilter,
            hasTeam: { $exists: true, $ne: '' },
          },
        },
        { $group: { _id: '$hasTeam', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.founderModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.founderModel.distinct('eventId'),
    ]);

    return {
      total,
      totalFounders: total,
      confirmed: confirmedCount,
      attended: attendedCount,
      attend: attendedCount,
      cancelled: cancelledCount,
      newRegs: newRegsCount,
      distinctEvents: (distinctEvents || []).filter(Boolean),
      byIndustry: industries.map((i) => ({ industry: i._id, count: i.count })),
      byYearsInBusiness: years.map((y) => ({
        yearsInBusiness: y._id,
        count: y.count,
      })),
      byTeamSize: teamSizes.map((t) => ({
        teamSize: t._id,
        count: t.count,
      })),
      byAnnualTurnover: annualTurnovers.map((a) => ({
        annualTurnover: a._id,
        count: a.count,
      })),
      byCity: cities.map((c) => ({
        city: c._id,
        count: c.count,
      })),
      byState: states.map((s) => ({
        state: s._id,
        count: s.count,
      })),
      byIsBusinessOwner: businessOwners.map((b) => ({
        isBusinessOwner: b._id,
        count: b.count,
      })),
      byCurrentRole: currentRoles.map((r) => ({
        currentRole: r._id,
        count: r.count,
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
      'Event ID',
      'Full Name',
      'Phone (WhatsApp)',
      'Email',
      'State',
      'City',
      'Is Business Owner',
      'Years in Business',
      'Team Size',
      'Industry / Sector',
      'Annual Turnover',
      'Product / Service',
      'Current Role',
      'Business / Company Name',
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

    const rows = result.data.map((item: any) => [
      item._id.toString(),
      `"${item.eventId || 'BUSINESS-OCT-09-2026'}"`,
      `"${(item.fullName || '').replace(/"/g, '""')}"`,
      `"${item.phone || ''}"`,
      `"${(item.email || '').replace(/"/g, '""')}"`,
      `"${(item.state || '').replace(/"/g, '""')}"`,
      `"${(item.city || '').replace(/"/g, '""')}"`,
      `"${(item.isBusinessOwner || '').replace(/"/g, '""')}"`,
      `"${(item.yearsInBusiness || '').replace(/"/g, '""')}"`,
      `"${(item.teamSize || '').replace(/"/g, '""')}"`,
      `"${(item.industry || '').replace(/"/g, '""')}"`,
      `"${(item.annualTurnover || '').replace(/"/g, '""')}"`,
      `"${(item.productService || '').replace(/"/g, '""')}"`,
      `"${(item.currentRole || '').replace(/"/g, '""')}"`,
      `"${(item.businessName || '').replace(/"/g, '""')}"`,
      `"${(item.biggestPriority || '').replace(/"/g, '""')}"`,
      `"${(item.growthBlocker || '').replace(/"/g, '""')}"`,
      `"${(item.hasTeam || '').replace(/"/g, '""')}"`,
      `"${(item.futureVision || '').replace(/"/g, '""')}"`,
      `"${(item.growthChallenge || '').replace(/"/g, '""')}"`,
      item.status || '',
      item.emailSent ? 'Yes' : 'No',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      item.createdAt ? new Date(item.createdAt).toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

