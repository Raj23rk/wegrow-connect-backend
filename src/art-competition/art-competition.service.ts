import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ArtParticipant,
  ArtParticipantDocument,
  ArtParticipantStatus,
} from './schemas/art-participant.schema';
import { CreateArtParticipantDto } from './dto/create-art-participant.dto';
import { QueryArtParticipantDto } from './dto/query-art-participant.dto';
import { UpdateArtParticipantDto } from './dto/update-art-participant.dto';

@Injectable()
export class ArtCompetitionService {
  private readonly logger = new Logger(ArtCompetitionService.name);

  constructor(
    @InjectModel(ArtParticipant.name)
    private readonly participantModel: Model<ArtParticipantDocument>,
  ) {}

  // =====================================================
  // GENERATE UNIQUE REGISTRATION NUMBER
  // =====================================================
  private async generateRegistrationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const regNumber = `ART-${year}-${randomDigits}`;
      const exists = await this.participantModel.exists({
        registrationNumber: regNumber,
      });
      if (!exists) {
        return regNumber;
      }
    }
    return `ART-${year}-${Date.now().toString().slice(-4)}`;
  }

  // =====================================================
  // REGISTER PARTICIPANT (PUBLIC)
  // =====================================================
  async register(dto: CreateArtParticipantDto) {
    const phone = (
      dto.phone ||
      dto.whatsappNumber ||
      dto.mobileNumber ||
      ''
    ).trim();

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      throw new BadRequestException(
        'A valid 10-digit Indian WhatsApp or mobile number is required.',
      );
    }

    const collegeName = (dto.collegeName || dto.institutionName || '').trim();
    if (!collegeName) {
      throw new BadRequestException('College / Institution name is required.');
    }

    const degreeAndYear = (
      dto.degreeAndYear ||
      [dto.degree, dto.yearOfStudy].filter(Boolean).join(' - ') ||
      ''
    ).trim();

    if (!degreeAndYear) {
      throw new BadRequestException('Degree & Year of Study is required.');
    }

    const email = dto.email ? dto.email.toLowerCase().trim() : '';
    const preferredArtMedium = (
      dto.preferredArtMedium ||
      dto.artMedium ||
      'Color Pencils & Oil Pastels'
    ).trim();

    // Check duplicate phone number for active registrations
    const existing = await this.participantModel.findOne({
      phone,
      isActive: true,
    });

    if (existing) {
      throw new BadRequestException(
        `A registration with mobile number ${phone} already exists (Reg No: ${existing.registrationNumber}).`,
      );
    }

    const registrationNumber = await this.generateRegistrationNumber();

    const participant = new this.participantModel({
      fullName: dto.fullName.trim(),
      phone,
      email,
      collegeName,
      degreeAndYear,
      preferredArtMedium,
      registrationNumber,
      status: ArtParticipantStatus.CONFIRMED,
      attended: false,
      isActive: true,
    });

    const saved = await participant.save();
    this.logger.log(
      `New participant registered: ${saved.fullName} (${saved.registrationNumber})`,
    );

    return saved;
  }

  // =====================================================
  // GET ALL PARTICIPANTS WITH PAGINATION & TOTAL COUNT (ADMIN)
  // =====================================================
  async findAll(query: QueryArtParticipantDto) {
    const {
      page = 1,
      limit = 10,
      search,
      collegeName,
      preferredArtMedium,
      status,
      attended,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const filter: any = {
      isActive: true,
    };

    if (collegeName) {
      filter.collegeName = new RegExp(collegeName.trim(), 'i');
    }

    if (preferredArtMedium) {
      filter.preferredArtMedium = new RegExp(preferredArtMedium.trim(), 'i');
    }

    if (status) {
      filter.status = status;
    }

    if (typeof attended === 'boolean') {
      filter.attended = attended;
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
        { degreeAndYear: searchRegex },
        { preferredArtMedium: searchRegex },
        { registrationNumber: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      participants,
      total,
      totalParticipants,
      confirmedCount,
      attendedCount,
      cancelledCount,
      todayCount,
    ] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.participantModel.countDocuments(filter),
      this.participantModel.countDocuments({ isActive: true }),
      this.participantModel.countDocuments({
        isActive: true,
        status: ArtParticipantStatus.CONFIRMED,
      }),
      this.participantModel.countDocuments({
        isActive: true,
        status: ArtParticipantStatus.ATTENDED,
      }),
      this.participantModel.countDocuments({
        isActive: true,
        status: ArtParticipantStatus.CANCELLED,
      }),
      this.participantModel.countDocuments({
        isActive: true,
        createdAt: { $gte: todayStart },
      }),
    ]);

    return {
      success: true,
      data: participants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalParticipants,
        filteredTotal: total,
        confirmed: confirmedCount,
        attended: attendedCount,
        cancelled: cancelledCount,
        todayRegistrations: todayCount,
      },
    };
  }

  // =====================================================
  // GET PARTICIPANT BY ID
  // =====================================================
  async findOne(id: string) {
    const participant = await this.participantModel
      .findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { registrationNumber: id }],
        isActive: true,
      })
      .lean()
      .exec();

    if (!participant) {
      throw new NotFoundException(`Participant with ID ${id} not found.`);
    }

    return participant;
  }

  // =====================================================
  // UPDATE PARTICIPANT (ADMIN)
  // =====================================================
  async update(id: string, dto: UpdateArtParticipantDto) {
    const updateData: any = { ...dto };

    if (dto.attended !== undefined) {
      updateData.attended = dto.attended;
      if (dto.attended && !dto.status) {
        updateData.status = ArtParticipantStatus.ATTENDED;
      }
    }

    const updated = await this.participantModel
      .findOneAndUpdate({ _id: id, isActive: true }, updateData, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Participant with ID ${id} not found.`);
    }

    return updated;
  }

  // =====================================================
  // SOFT DELETE PARTICIPANT (ADMIN)
  // =====================================================
  async remove(id: string) {
    const deleted = await this.participantModel
      .findOneAndUpdate({ _id: id }, { isActive: false }, { new: true })
      .exec();

    if (!deleted) {
      throw new NotFoundException(`Participant with ID ${id} not found.`);
    }

    return {
      success: true,
      message: 'Participant registration deleted successfully.',
    };
  }

  // =====================================================
  // GET REGISTRATION STATISTICS (ADMIN)
  // =====================================================
  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      total,
      confirmedCount,
      attendedCount,
      cancelledCount,
      todayCount,
      mediumBreakdown,
      statusBreakdown,
    ] = await Promise.all([
      this.participantModel.countDocuments({ isActive: true }),
      this.participantModel.countDocuments({
        isActive: true,
        status: ArtParticipantStatus.CONFIRMED,
      }),
      this.participantModel.countDocuments({
        isActive: true,
        status: ArtParticipantStatus.ATTENDED,
      }),
      this.participantModel.countDocuments({
        isActive: true,
        status: ArtParticipantStatus.CANCELLED,
      }),
      this.participantModel.countDocuments({
        isActive: true,
        createdAt: { $gte: todayStart },
      }),
      this.participantModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$preferredArtMedium', count: { $sum: 1 } } },
      ]),
      this.participantModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      confirmed: confirmedCount,
      attended: attendedCount,
      cancelled: cancelledCount,
      todayCount,
      byArtMedium: mediumBreakdown.reduce((acc, curr) => {
        acc[curr._id || 'Not Specified'] = curr.count;
        return acc;
      }, {}),
      byStatus: statusBreakdown.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };
  }

  // =====================================================
  // EXPORT AS CSV (ADMIN)
  // =====================================================
  async exportCsv(query: QueryArtParticipantDto): Promise<string> {
    const queryForExport = { ...query, limit: 10000, page: 1 };
    const result = await this.findAll(queryForExport);

    const headers = [
      'Registration No',
      'Full Name',
      'Phone / WhatsApp',
      'Email',
      'College / Institution',
      'Degree & Year',
      'Preferred Art Medium',
      'Status',
      'Attended',
      'Notes',
      'Registered Date',
    ];

    const rows = result.data.map((item: any) => [
      `"${item.registrationNumber || ''}"`,
      `"${(item.fullName || '').replace(/"/g, '""')}"`,
      `"${item.phone || ''}"`,
      `"${item.email || ''}"`,
      `"${(item.collegeName || '').replace(/"/g, '""')}"`,
      `"${(item.degreeAndYear || '').replace(/"/g, '""')}"`,
      `"${(item.preferredArtMedium || '').replace(/"/g, '""')}"`,
      item.status || '',
      item.attended ? 'Yes' : 'No',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
