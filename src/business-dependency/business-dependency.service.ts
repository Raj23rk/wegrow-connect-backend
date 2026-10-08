import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BusinessDependency,
  BusinessDependencyDocument,
  BusinessDependencyType,
  BusinessDependencyStatus,
} from './schemas/business-dependency.schema';
import {
  BusinessMeetupFeedback,
  BusinessMeetupFeedbackDocument,
  MeetupExperienceLevel,
  MeetupWillingToGrow,
  MeetupCanRefer,
  MeetupFeedbackStatus,
} from './schemas/business-meetup-feedback.schema';
import { CreateBusinessDependencyTestDto } from './dto/create-business-dependency-test.dto';
import { CreateBusinessDependencyDiagnosticDto } from './dto/create-business-dependency-diagnostic.dto';
import { CreateBusinessDependencyDto } from './dto/create-business-dependency.dto';
import { QueryBusinessDependencyDto } from './dto/query-business-dependency.dto';
import { UpdateBusinessDependencyDto } from './dto/update-business-dependency.dto';
import { CreateBusinessMeetupFeedbackDto } from './dto/create-business-meetup-feedback.dto';
import { QueryBusinessMeetupFeedbackDto } from './dto/query-business-meetup-feedback.dto';
import { UpdateBusinessMeetupFeedbackDto } from './dto/update-business-meetup-feedback.dto';

@Injectable()
export class BusinessDependencyService {
  private readonly logger = new Logger(BusinessDependencyService.name);

  constructor(
    @InjectModel(BusinessDependency.name)
    private readonly dependencyModel: Model<BusinessDependencyDocument>,
    @InjectModel(BusinessMeetupFeedback.name)
    private readonly feedbackModel: Model<BusinessMeetupFeedbackDocument>,
  ) {}

  // Helper to map DB doc to frontend friendly object
  private formatItem(doc: any) {
    const raw = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
    const isTest = raw.type === BusinessDependencyType.TEST;
    return {
      ...raw,
      id: raw.customId || raw._id?.toString(),
      type: isTest ? 'Business Test' : 'Business Diagnostic',
      rawType: raw.type,
      name: raw.fullName || raw.name || '',
      fullName: raw.fullName || raw.name || '',
      company: raw.company || raw.business || '',
      business: raw.company || raw.business || '',
      phone: raw.phone || '',
      email: raw.email || '',
      designation: raw.designation || '',
      industry: raw.industry || '',
      size: raw.businessSize || raw.size || '',
      businessSize: raw.businessSize || raw.size || '',
      challengeSelect: raw.biggestChallenge || raw.challengeSelect || '',
      biggestChallenge: raw.biggestChallenge || raw.challengeSelect || '',
      challengeNote: raw.challengeDetails || raw.challengeNote || '',
      challengeDetails: raw.challengeDetails || raw.challengeNote || '',
      score: typeof raw.score === 'number' ? raw.score : 0,
      scoreDisplay: raw.scoreDisplay || (raw.score !== undefined ? `${raw.score}/100` : ''),
      category: raw.category || raw.scoreSummary || 'Not Calculated',
      scoreSummary: raw.scoreSummary || raw.category || '',
      stage: raw.stage || (isTest ? 'Test Completed' : 'Diagnostic Booked'),
      submittedAt: raw.submittedAt || raw.createdAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  // =====================================================
  // 1. CREATE TEST API (type: 'test')
  // =====================================================
  async createTest(dto: CreateBusinessDependencyTestDto) {
    const customId = (dto.id || '').trim();
    const fullName = (dto.name || dto.yourName || dto.fullName || 'Anonymous').trim();
    const company = (dto.business || dto.company || dto.businessName || 'Not Specified').trim();
    const phone = (dto.phone || dto.phoneNumber || '').trim();

    let parsedScore: number | undefined;
    if (dto.score !== undefined && dto.score !== null) {
      const num = Number(dto.score);
      if (!isNaN(num)) {
        parsedScore = num;
      }
    }

    const category = (dto.category || dto.scoreSummary || '').trim();
    const submittedAt = dto.submittedAt ? new Date(dto.submittedAt) : new Date();

    const payload = {
      customId,
      type: BusinessDependencyType.TEST,
      fullName,
      company,
      phone,
      score: parsedScore,
      scoreDisplay:
        dto.scoreDisplay?.trim() ||
        (parsedScore !== undefined ? `${parsedScore}/100` : ''),
      scoreSummary: category,
      category,
      stage: dto.stage?.trim() || 'Test Completed',
      submittedAt,
      answers: Array.isArray(dto.answers) ? dto.answers : [],
      testAnswers: dto.testAnswers || {},
      status: BusinessDependencyStatus.PENDING,
    };

    // If client ID provided, upsert so duplicate requests update cleanly
    let saved: any;
    if (customId) {
      saved = await this.dependencyModel.findOneAndUpdate(
        { customId },
        { $set: payload },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } else {
      const record = new this.dependencyModel(payload);
      saved = await record.save();
    }

    this.logger.log(
      `New Business Dependency Test submitted: ID ${saved._id} (customId: ${customId}) by ${fullName} (${company})`,
    );
    return this.formatItem(saved);
  }

  // =====================================================
  // 2. CREATE DIAGNOSTIC API (type: 'diagnostic')
  // =====================================================
  async createDiagnostic(dto: CreateBusinessDependencyDiagnosticDto) {
    const customId = (dto.id || '').trim();
    const fullName = (dto.name || dto.fullName || dto.yourName || 'Anonymous').trim();
    const company = (dto.company || dto.business || dto.businessName || 'Not Specified').trim();
    const phone = (dto.phone || dto.phoneNumber || '').trim();

    let parsedScore: number | undefined;
    if (dto.score !== undefined && dto.score !== null) {
      const num = Number(dto.score);
      if (!isNaN(num)) {
        parsedScore = num;
      }
    }

    const category = (dto.category || dto.scoreSummary || '').trim();
    const submittedAt = dto.submittedAt ? new Date(dto.submittedAt) : new Date();

    const payload = {
      customId,
      type: BusinessDependencyType.DIAGNOSTIC,
      fullName,
      company,
      phone,
      email: (dto.email || '').trim().toLowerCase(),
      designation: (dto.designation || '').trim(),
      industry: (dto.industry || '').trim(),
      businessSize: (dto.size || dto.businessSize || dto.teamSize || '').trim(),
      biggestChallenge: (dto.challengeSelect || dto.biggestChallenge || '').trim(),
      challengeDetails: (dto.challengeNote || dto.challengeDetails || dto.notes || '').trim(),
      score: parsedScore,
      scoreDisplay:
        dto.scoreDisplay?.trim() ||
        (parsedScore !== undefined ? `${parsedScore}/100` : ''),
      scoreSummary: category,
      category,
      originalTestName: (dto.originalTestName || '').trim(),
      originalBusiness: (dto.originalBusiness || '').trim(),
      stage: dto.stage?.trim() || 'Diagnostic Booked',
      submittedAt,
      answers: Array.isArray(dto.answers) ? dto.answers : [],
      testAnswers: dto.testAnswers || {},
      status: BusinessDependencyStatus.PENDING,
    };

    let saved: any;
    if (customId) {
      saved = await this.dependencyModel.findOneAndUpdate(
        { customId },
        { $set: payload },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } else {
      const record = new this.dependencyModel(payload);
      saved = await record.save();
    }

    this.logger.log(
      `New Business Diagnostic booked: ID ${saved._id} (customId: ${customId}) by ${fullName} (${company})`,
    );
    return this.formatItem(saved);
  }

  // =====================================================
  // 3. UNIVERSAL CREATE / REGULAR CRUD CREATE
  // =====================================================
  async create(dto: CreateBusinessDependencyDto) {
    const rawType = String(dto.type || '').toLowerCase();
    const isDiagnostic =
      rawType.includes('diag') ||
      rawType.includes('dyn') ||
      Boolean(
        dto.industry ||
        dto.biggestChallenge ||
        dto.challengeSelect ||
        dto.businessSize ||
        dto.size ||
        dto.email ||
        dto.designation ||
        dto.stage === 'Diagnostic Booked',
      );

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
      category,
      search,
      industry,
      businessSize,
      biggestChallenge,
      status,
      sortBy = 'newest',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const filter: any = {};

    // Filter by type: test, diagnostic, Business Test, Business Diagnostic, or all
    if (type && type.toUpperCase() !== 'ALL') {
      const lower = type.trim().toLowerCase();
      if (lower.includes('diag') || lower.includes('dyn')) {
        filter.type = BusinessDependencyType.DIAGNOSTIC;
      } else if (lower.includes('test')) {
        filter.type = BusinessDependencyType.TEST;
      }
    }

    // Filter by category
    if (category && category.toUpperCase() !== 'ALL') {
      if (category === 'red') {
        filter.score = { $lte: 25 };
      } else if (category === 'high') {
        filter.score = { $gt: 25, $lte: 50 };
      } else if (category === 'growing') {
        filter.score = { $gt: 50, $lte: 75 };
      } else if (category === 'self') {
        filter.score = { $gt: 75 };
      } else {
        const catRegex = new RegExp(category.trim(), 'i');
        filter.$or = [{ category: catRegex }, { scoreSummary: catRegex }];
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
        { category: searchRegex },
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    // Sorting logic supporting frontend presets
    let sort: any = { createdAt: -1 };
    if (sortBy === 'newest') {
      sort = { submittedAt: -1, createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sort = { submittedAt: 1, createdAt: 1 };
    } else if (sortBy === 'score_high') {
      sort = { score: -1 };
    } else if (sortBy === 'score_low') {
      sort = { score: 1 };
    } else if (sortBy) {
      sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    }

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

    const formattedItems = data.map((d) => this.formatItem(d));

    return {
      items: formattedItems,
      // Provide both items and submissions aliases for seamless frontend compatibility
      submissions: formattedItems,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        total: totalAll,
        totalTests,
        totalDiagnostics,
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
      testCount: totalTests,
      totalTests,
      diagnosticCount: totalDiagnostics,
      totalDiagnostics,
      avgScore,
      today: {
        total: todayTotal,
        tests: todayTests,
        diagnostics: todayDiagnostics,
      },
      last7DaysTotal: weekTotal,
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
  // 6. FIND ONE BY ID (Handles MongoDB ObjectId or customId)
  // =====================================================
  async findOne(id: string) {
    const isObjId = Types.ObjectId.isValid(id);
    const query = isObjId ? { $or: [{ _id: id }, { customId: id }] } : { customId: id };
    const record = await this.dependencyModel.findOne(query).exec();
    if (!record) {
      throw new NotFoundException(`Business Dependency entry with ID "${id}" not found`);
    }
    return this.formatItem(record);
  }

  // =====================================================
  // 7. UPDATE BY ID
  // =====================================================
  async update(id: string, dto: UpdateBusinessDependencyDto) {
    const updatePayload: any = { ...dto };

    if (dto.name || dto.yourName) {
      updatePayload.fullName = (dto.fullName || dto.name || dto.yourName)!.trim();
    }
    if (dto.business) {
      updatePayload.company = (dto.company || dto.business)!.trim();
    }
    if (dto.phoneNumber) {
      updatePayload.phone = (dto.phone || dto.phoneNumber)!.trim();
    }
    if (dto.size) {
      updatePayload.businessSize = (dto.businessSize || dto.size)!.trim();
    }
    if (dto.challengeSelect) {
      updatePayload.biggestChallenge = (dto.biggestChallenge || dto.challengeSelect)!.trim();
    }
    if (dto.challengeNote) {
      updatePayload.challengeDetails = (dto.challengeDetails || dto.challengeNote)!.trim();
    }

    const isObjId = Types.ObjectId.isValid(id);
    const query = isObjId ? { $or: [{ _id: id }, { customId: id }] } : { customId: id };

    const updated = await this.dependencyModel
      .findOneAndUpdate(query, { $set: updatePayload }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Business Dependency entry with ID "${id}" not found`);
    }

    return this.formatItem(updated);
  }

  // =====================================================
  // 8. REMOVE BY ID (Safe from CastError)
  // =====================================================
  async remove(id: string) {
    const isObjId = Types.ObjectId.isValid(id);
    const query = isObjId ? { $or: [{ _id: id }, { customId: id }] } : { customId: id };

    await this.dependencyModel.findOneAndDelete(query).exec();

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
      'Category / Status',
      'Stage',
      'Submitted At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = items.map((doc: any) => [
      escapeCsv(doc.id || doc._id),
      escapeCsv(doc.type),
      escapeCsv(doc.name || doc.fullName),
      escapeCsv(doc.company || doc.business),
      escapeCsv(doc.phone),
      escapeCsv(doc.email || ''),
      escapeCsv(doc.designation || ''),
      escapeCsv(doc.industry || ''),
      escapeCsv(doc.size || doc.businessSize || ''),
      escapeCsv(doc.challengeSelect || doc.biggestChallenge || ''),
      escapeCsv(doc.challengeNote || doc.challengeDetails || ''),
      escapeCsv(doc.score !== undefined ? doc.score : ''),
      escapeCsv(doc.scoreDisplay || ''),
      escapeCsv(doc.category || doc.scoreSummary || ''),
      escapeCsv(doc.stage || ''),
      escapeCsv(doc.submittedAt ? new Date(doc.submittedAt).toISOString() : ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // =========================================================================
  // 10. BUSINESS TRANSFORMATION MEETUP FEEDBACK: CREATE (PUBLIC)
  // =========================================================================
  async createFeedback(dto: CreateBusinessMeetupFeedbackDto) {
    if (dto.website && dto.website.trim().length > 0) {
      // Honeypot spam hit - silently return success
      this.logger.warn('Honeypot caught spam submission in meetup feedback');
      return {
        id: 'temp_spam_filtered',
        name: dto.name,
        experience: dto.experience,
      };
    }

    const name = (dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    const experience = (dto.experience || '').trim();
    if (!experience) {
      throw new BadRequestException('Experience rating is required');
    }

    const willingToGrow = (
      dto.willingToGrow ||
      dto.willing_to_grow ||
      MeetupWillingToGrow.YES
    ).trim();

    const canRefer = (
      dto.canRefer ||
      dto.can_refer ||
      MeetupCanRefer.NO
    ).trim();

    const likedMost = (dto.likedMost || dto.liked_most || '').trim();
    const suggestions = (dto.suggestions || '').trim();
    const referralName = (dto.referralName || dto.referral_name || '').trim();
    const referralBusiness = (
      dto.referralBusiness ||
      dto.referral_business ||
      ''
    ).trim();
    const referralMobile = (
      dto.referralMobile ||
      dto.referral_mobile ||
      ''
    ).trim();
    const keyTakeaways = (dto.keyTakeaways || dto.key_takeaways || '').trim();
    const eventTitle = (
      dto.eventTitle ||
      dto.eventName ||
      'Business Transformation Meetup'
    ).trim();

    const created = await this.feedbackModel.create({
      name,
      experience,
      likedMost,
      suggestions,
      willingToGrow,
      canRefer,
      referralName: canRefer === 'Yes' ? referralName : '',
      referralBusiness: canRefer === 'Yes' ? referralBusiness : '',
      referralMobile: canRefer === 'Yes' ? referralMobile : '',
      keyTakeaways,
      eventTitle,
      status: MeetupFeedbackStatus.NEW,
      submittedAt: new Date(),
    });

    return created.toJSON();
  }

  // =========================================================================
  // 11. MEETUP FEEDBACK: GET ALL WITH PAGINATION, FILTERS & SEARCH (ADMIN)
  // =========================================================================
  async findAllFeedback(query: QueryBusinessMeetupFeedbackDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.experience && query.experience.trim()) {
      filter.experience = query.experience.trim();
    }

    if (query.willingToGrow && query.willingToGrow.trim()) {
      filter.willingToGrow = query.willingToGrow.trim();
    }

    if (query.canRefer && query.canRefer.trim()) {
      filter.canRefer = query.canRefer.trim();
    }

    if (query.status && query.status.trim()) {
      filter.status = query.status.trim();
    }

    if (query.startDate || query.endDate) {
      filter.submittedAt = {};
      if (query.startDate) {
        filter.submittedAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.submittedAt.$lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { referralName: searchRegex },
        { referralBusiness: searchRegex },
        { referralMobile: searchRegex },
        { suggestions: searchRegex },
        { likedMost: searchRegex },
        { keyTakeaways: searchRegex },
      ];
    }

    const sortField = query.sortBy || 'submittedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: any = { [sortField]: sortOrder };

    const [items, total, countsAgg] = await Promise.all([
      this.feedbackModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.feedbackModel.countDocuments(filter).exec(),
      this.feedbackModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            excellent: {
              $sum: { $cond: [{ $eq: ['$experience', 'Excellent'] }, 1, 0] },
            },
            good: {
              $sum: { $cond: [{ $eq: ['$experience', 'Good'] }, 1, 0] },
            },
            average: {
              $sum: { $cond: [{ $eq: ['$experience', 'Average'] }, 1, 0] },
            },
            needsImprovement: {
              $sum: {
                $cond: [{ $eq: ['$experience', 'Needs Improvement'] }, 1, 0],
              },
            },
            willingToGrowYes: {
              $sum: { $cond: [{ $eq: ['$willingToGrow', 'Yes'] }, 1, 0] },
            },
            canReferYes: {
              $sum: { $cond: [{ $eq: ['$canRefer', 'Yes'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const counts = countsAgg[0] || {
      total: 0,
      excellent: 0,
      good: 0,
      average: 0,
      needsImprovement: 0,
      willingToGrowYes: 0,
      canReferYes: 0,
    };

    const formattedItems = items.map((doc: any) => ({
      ...doc,
      id: doc._id?.toString(),
    }));

    return {
      items: formattedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      counts,
    };
  }

  // =========================================================================
  // 12. MEETUP FEEDBACK: STATS & ANALYTICS (ADMIN)
  // =========================================================================
  async getFeedbackStats() {
    const [total, experienceAgg, willingAgg, referAgg, recent] =
      await Promise.all([
        this.feedbackModel.countDocuments().exec(),
        this.feedbackModel.aggregate([
          { $group: { _id: '$experience', count: { $sum: 1 } } },
        ]),
        this.feedbackModel.aggregate([
          { $group: { _id: '$willingToGrow', count: { $sum: 1 } } },
        ]),
        this.feedbackModel.aggregate([
          { $match: { canRefer: 'Yes' } },
          {
            $project: {
              name: 1,
              referralName: 1,
              referralBusiness: 1,
              referralMobile: 1,
              submittedAt: 1,
            },
          },
          { $sort: { submittedAt: -1 } },
          { $limit: 20 },
        ]),
        this.feedbackModel
          .find()
          .sort({ submittedAt: -1 })
          .limit(5)
          .lean()
          .exec(),
      ]);

    const experienceBreakdown: Record<string, number> = {
      Excellent: 0,
      Good: 0,
      Average: 0,
      'Needs Improvement': 0,
    };
    let positiveCount = 0;
    experienceAgg.forEach((item) => {
      if (item._id) {
        experienceBreakdown[item._id] = item.count;
        if (item._id === 'Excellent' || item._id === 'Good') {
          positiveCount += item.count;
        }
      }
    });

    const willingBreakdown: Record<string, number> = {
      Yes: 0,
      No: 0,
      Maybe: 0,
    };
    willingAgg.forEach((item) => {
      if (item._id) {
        willingBreakdown[item._id] = item.count;
      }
    });

    const totalReferrals = referAgg.length;
    const satisfactionRate =
      total > 0 ? Math.round((positiveCount / total) * 100) : 0;

    return {
      totalFeedback: total,
      satisfactionRate: `${satisfactionRate}%`,
      experienceBreakdown,
      willingToGrowBreakdown: willingBreakdown,
      referralStats: {
        totalReferrals,
        referralPercentage:
          total > 0 ? `${Math.round((totalReferrals / total) * 100)}%` : '0%',
        recentReferrals: referAgg.map((r: any) => ({
          ...r,
          id: r._id?.toString(),
        })),
      },
      recentSubmissions: recent.map((d: any) => ({
        ...d,
        id: d._id?.toString(),
      })),
    };
  }

  // =========================================================================
  // 13. MEETUP FEEDBACK: EXPORT CSV (ADMIN)
  // =========================================================================
  async exportFeedbackCsv(
    query: QueryBusinessMeetupFeedbackDto,
  ): Promise<string> {
    const result = await this.findAllFeedback({
      ...query,
      page: 1,
      limit: 10000,
    });

    const headers = [
      'ID',
      'Event Title',
      'Participant Name',
      'Experience Rating',
      'Liked Most',
      'Suggestions',
      'Willing to Grow',
      'Can Refer',
      'Referral Name',
      'Referral Business',
      'Referral Mobile',
      'Key Takeaways',
      'Status',
      'Submitted At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = result.items.map((doc: any) => [
      escapeCsv(doc.id || doc._id),
      escapeCsv(doc.eventTitle || 'Business Transformation Meetup'),
      escapeCsv(doc.name),
      escapeCsv(doc.experience),
      escapeCsv(doc.likedMost || ''),
      escapeCsv(doc.suggestions || ''),
      escapeCsv(doc.willingToGrow || ''),
      escapeCsv(doc.canRefer || ''),
      escapeCsv(doc.referralName || ''),
      escapeCsv(doc.referralBusiness || ''),
      escapeCsv(doc.referralMobile || ''),
      escapeCsv(doc.keyTakeaways || ''),
      escapeCsv(doc.status || 'new'),
      escapeCsv(doc.submittedAt ? new Date(doc.submittedAt).toISOString() : ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // =========================================================================
  // 14. MEETUP FEEDBACK: GET SINGLE (ADMIN)
  // =========================================================================
  async findFeedbackById(id: string) {
    const doc = await this.feedbackModel.findById(id).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Feedback with ID "${id}" not found`);
    }
    return {
      ...doc,
      id: doc._id?.toString(),
    };
  }

  // =========================================================================
  // 15. MEETUP FEEDBACK: UPDATE (ADMIN)
  // =========================================================================
  async updateFeedback(id: string, dto: UpdateBusinessMeetupFeedbackDto) {
    const doc = await this.feedbackModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...(dto.status ? { status: dto.status } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Feedback with ID "${id}" not found`);
    }

    return {
      ...doc,
      id: doc._id?.toString(),
    };
  }

  // =========================================================================
  // 16. MEETUP FEEDBACK: DELETE (ADMIN)
  // =========================================================================
  async deleteFeedback(id: string) {
    const res = await this.feedbackModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException(`Feedback with ID "${id}" not found`);
    }
    return {
      success: true,
      message: 'Feedback deleted successfully',
      deletedId: id,
    };
  }
}

