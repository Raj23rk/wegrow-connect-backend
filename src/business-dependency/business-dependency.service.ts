import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BusinessDependency,
  BusinessDependencyDocument,
  BusinessDependencyType,
  BusinessDependencyStatus,
} from './schemas/business-dependency.schema';
import { CreateBusinessDependencyTestDto } from './dto/create-business-dependency-test.dto';
import { CreateBusinessDependencyDiagnosticDto } from './dto/create-business-dependency-diagnostic.dto';
import { CreateBusinessDependencyDto } from './dto/create-business-dependency.dto';
import { QueryBusinessDependencyDto } from './dto/query-business-dependency.dto';
import { UpdateBusinessDependencyDto } from './dto/update-business-dependency.dto';

@Injectable()
export class BusinessDependencyService {
  private readonly logger = new Logger(BusinessDependencyService.name);

  constructor(
    @InjectModel(BusinessDependency.name)
    private readonly dependencyModel: Model<BusinessDependencyDocument>,
  ) {}

  // =====================================================
  // 1. CREATE TEST API (type: 'test')
  // =====================================================
  async createTest(dto: CreateBusinessDependencyTestDto) {
    const fullName = (dto.yourName || dto.fullName || dto.name || '').trim();
    const company = (dto.businessName || dto.company || '').trim();
    const phone = (dto.phoneNumber || dto.phone || '').trim();

    if (!fullName) {
      throw new BadRequestException('Your name is required');
    }
    if (!company) {
      throw new BadRequestException('Business name is required');
    }
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    let parsedScore: number | undefined;
    if (dto.score !== undefined && dto.score !== null) {
      const num = Number(dto.score);
      if (!isNaN(num)) {
        parsedScore = num;
      }
    }

    const record = new this.dependencyModel({
      type: BusinessDependencyType.TEST,
      fullName,
      company,
      phone,
      score: parsedScore,
      scoreDisplay: dto.scoreDisplay?.trim() || (parsedScore !== undefined ? `${parsedScore}/100` : ''),
      scoreSummary: dto.scoreSummary?.trim() || '',
      testAnswers: dto.testAnswers || dto.answers || {},
      status: BusinessDependencyStatus.PENDING,
    });

    const saved = await record.save();
    this.logger.log(`New Business Dependency Test submitted: ID ${saved._id} by ${fullName} (${company})`);
    return saved;
  }

  // =====================================================
  // 2. CREATE DIAGNOSTIC API (type: 'diagnostic')
  // =====================================================
  async createDiagnostic(dto: CreateBusinessDependencyDiagnosticDto) {
    const fullName = (dto.fullName || dto.yourName || dto.name || '').trim();
    const company = (dto.company || dto.businessName || '').trim();
    const phone = (dto.phone || dto.phoneNumber || '').trim();

    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }
    if (!company) {
      throw new BadRequestException('Company name is required');
    }
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    let parsedScore: number | undefined;
    if (dto.score !== undefined && dto.score !== null) {
      const num = Number(dto.score);
      if (!isNaN(num)) {
        parsedScore = num;
      }
    }

    const record = new this.dependencyModel({
      type: BusinessDependencyType.DIAGNOSTIC,
      fullName,
      company,
      phone,
      email: (dto.email || '').trim().toLowerCase(),
      designation: (dto.designation || '').trim(),
      industry: (dto.industry || '').trim(),
      businessSize: (dto.businessSize || dto.teamSize || '').trim(),
      biggestChallenge: (dto.biggestChallenge || '').trim(),
      challengeDetails: (dto.challengeDetails || dto.notes || '').trim(),
      score: parsedScore,
      scoreDisplay: dto.scoreDisplay?.trim() || (parsedScore !== undefined ? `${parsedScore}/100` : ''),
      scoreSummary: dto.scoreSummary?.trim() || '',
      testAnswers: dto.answers || {},
      status: BusinessDependencyStatus.PENDING,
    });

    const saved = await record.save();
    this.logger.log(`New Business Diagnostic booked: ID ${saved._id} by ${fullName} (${company})`);
    return saved;
  }

  // =====================================================
  // 3. UNIVERSAL CREATE / REGULAR CRUD CREATE
  // =====================================================
  async create(dto: CreateBusinessDependencyDto) {
    // If type is explicitly test or diagnostic, follow that;
    // Otherwise, auto-infer from diagnostic fields
    const isDiagnostic =
      dto.type === BusinessDependencyType.DIAGNOSTIC ||
      Boolean(dto.industry || dto.biggestChallenge || dto.businessSize || dto.email || dto.designation);

    if (isDiagnostic) {
      return this.createDiagnostic(dto as CreateBusinessDependencyDiagnosticDto);
    } else {
      return this.createTest(dto as CreateBusinessDependencyTestDto);
    }
  }

  // =====================================================
  // 4. FIND ALL WITH PAGINATION, FILTERS, & TOTAL COUNTS (ADMIN)
  // =====================================================
  async findAll(query: QueryBusinessDependencyDto) {
    const {
      page = 1,
      limit = 10,
      type,
      search,
      industry,
      businessSize,
      biggestChallenge,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const filter: any = {};

    // Filter by type: test, diagnostic (dyn), or all
    if (type && type !== 'all') {
      const normalizedType = type.trim().toLowerCase();
      if (normalizedType === 'test') {
        filter.type = BusinessDependencyType.TEST;
      } else if (
        normalizedType === 'dyn' ||
        normalizedType === 'diagnostic' ||
        normalizedType.startsWith('dyn')
      ) {
        filter.type = BusinessDependencyType.DIAGNOSTIC;
      } else {
        filter.type = normalizedType;
      }
    }

    if (industry) {
      filter.industry = new RegExp(industry.trim(), 'i');
    }
    if (businessSize) {
      filter.businessSize = new RegExp(businessSize.trim(), 'i');
    }
    if (biggestChallenge) {
      filter.biggestChallenge = new RegExp(biggestChallenge.trim(), 'i');
    }
    if (status) {
      filter.status = status.trim().toLowerCase();
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { company: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { industry: searchRegex },
        { designation: searchRegex },
        { biggestChallenge: searchRegex },
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      data,
      total,
      totalAll,
      totalTests,
      totalDiagnostics,
      todayTests,
      todayDiagnostics,
    ] = await Promise.all([
      this.dependencyModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.dependencyModel.countDocuments(filter).exec(),
      this.dependencyModel.countDocuments({}).exec(),
      this.dependencyModel.countDocuments({ type: BusinessDependencyType.TEST }).exec(),
      this.dependencyModel.countDocuments({ type: BusinessDependencyType.DIAGNOSTIC }).exec(),
      this.dependencyModel.countDocuments({
        type: BusinessDependencyType.TEST,
        createdAt: { $gte: todayStart },
      }).exec(),
      this.dependencyModel.countDocuments({
        type: BusinessDependencyType.DIAGNOSTIC,
        createdAt: { $gte: todayStart },
      }).exec(),
    ]);

    return {
      items: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        total: totalAll,
        totalTests, // Count total test attended
        totalDiagnostics, // Count total diagnostics booked
        todayTotal: todayTests + todayDiagnostics,
        todayTests,
        todayDiagnostics,
      },
    };
  }

  // =====================================================
  // 5. GET DETAILED STATS (ADMIN)
  // =====================================================
  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [
      total,
      totalTests,
      totalDiagnostics,
      todayTotal,
      todayTests,
      todayDiagnostics,
      weekTotal,
      industryAgg,
      challengeAgg,
      avgScoreAgg,
    ] = await Promise.all([
      this.dependencyModel.countDocuments({}).exec(),
      this.dependencyModel.countDocuments({ type: BusinessDependencyType.TEST }).exec(),
      this.dependencyModel.countDocuments({ type: BusinessDependencyType.DIAGNOSTIC }).exec(),
      this.dependencyModel.countDocuments({ createdAt: { $gte: todayStart } }).exec(),
      this.dependencyModel.countDocuments({
        type: BusinessDependencyType.TEST,
        createdAt: { $gte: todayStart },
      }).exec(),
      this.dependencyModel.countDocuments({
        type: BusinessDependencyType.DIAGNOSTIC,
        createdAt: { $gte: todayStart },
      }).exec(),
      this.dependencyModel.countDocuments({ createdAt: { $gte: weekStart } }).exec(),
      this.dependencyModel.aggregate([
        { $match: { industry: { $exists: true, $ne: '' } } },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).exec(),
      this.dependencyModel.aggregate([
        { $match: { biggestChallenge: { $exists: true, $ne: '' } } },
        { $group: { _id: '$biggestChallenge', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).exec(),
      this.dependencyModel.aggregate([
        { $match: { score: { $gt: 0 } } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } },
      ]).exec(),
    ]);

    const avgScore = avgScoreAgg.length > 0 ? Math.round(avgScoreAgg[0].avgScore) : 0;

    return {
      total,
      totalTests,
      totalDiagnostics,
      today: {
        total: todayTotal,
        tests: todayTests,
        diagnostics: todayDiagnostics,
      },
      last7DaysTotal: weekTotal,
      avgScore,
      industryBreakdown: industryAgg.map((item) => ({
        industry: item._id,
        count: item.count,
      })),
      challengeBreakdown: challengeAgg.map((item) => ({
        challenge: item._id,
        count: item.count,
      })),
    };
  }

  // =====================================================
  // 6. FIND ONE BY ID
  // =====================================================
  async findOne(id: string) {
    const record = await this.dependencyModel.findById(id).exec();
    if (!record) {
      throw new NotFoundException(`Business Dependency entry with ID "${id}" not found`);
    }
    return record;
  }

  // =====================================================
  // 7. UPDATE BY ID
  // =====================================================
  async update(id: string, dto: UpdateBusinessDependencyDto) {
    const updatePayload: any = { ...dto };

    // Standardize aliases if passed
    if (dto.yourName || dto.name) {
      updatePayload.fullName = (dto.fullName || dto.yourName || dto.name)!.trim();
    }
    if (dto.businessName) {
      updatePayload.company = (dto.company || dto.businessName)!.trim();
    }
    if (dto.phoneNumber) {
      updatePayload.phone = (dto.phone || dto.phoneNumber)!.trim();
    }
    if (dto.teamSize) {
      updatePayload.businessSize = (dto.businessSize || dto.teamSize)!.trim();
    }

    const updated = await this.dependencyModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Business Dependency entry with ID "${id}" not found`);
    }

    return updated;
  }

  // =====================================================
  // 8. REMOVE BY ID
  // =====================================================
  async remove(id: string) {
    const deleted = await this.dependencyModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Business Dependency entry with ID "${id}" not found`);
    }
    return {
      success: true,
      message: 'Record deleted successfully',
      deletedId: id,
    };
  }

  // =====================================================
  // 9. EXPORT CSV
  // =====================================================
  async exportCsv(query: QueryBusinessDependencyDto): Promise<string> {
    const { items } = await this.findAll({
      ...query,
      page: 1,
      limit: 10000,
    });

    const headers = [
      'ID',
      'Type',
      'Full / Your Name',
      'Company / Business Name',
      'Phone',
      'Email',
      'Designation',
      'Industry',
      'Business Size',
      'Biggest Challenge',
      'Challenge Details',
      'Score',
      'Score Display',
      'Score Summary',
      'Status',
      'Submitted At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = items.map((doc: any) => [
      escapeCsv(doc._id),
      escapeCsv(doc.type),
      escapeCsv(doc.fullName),
      escapeCsv(doc.company),
      escapeCsv(doc.phone),
      escapeCsv(doc.email || ''),
      escapeCsv(doc.designation || ''),
      escapeCsv(doc.industry || ''),
      escapeCsv(doc.businessSize || ''),
      escapeCsv(doc.biggestChallenge || ''),
      escapeCsv(doc.challengeDetails || ''),
      escapeCsv(doc.score !== undefined ? doc.score : ''),
      escapeCsv(doc.scoreDisplay || ''),
      escapeCsv(doc.scoreSummary || ''),
      escapeCsv(doc.status),
      escapeCsv(doc.createdAt ? new Date(doc.createdAt).toISOString() : ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
