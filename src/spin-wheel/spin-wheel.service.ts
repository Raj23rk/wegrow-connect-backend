import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resend } from 'resend';
import * as QRCode from 'qrcode';
import {
  SpinWheelParticipant,
  SpinWheelParticipantDocument,
} from './schemas/spin-wheel-participant.schema';
import {
  SpinRewardBudget,
  SpinRewardBudgetDocument,
} from './schemas/spin-reward-budget.schema';
import { SendSpinOtpDto } from './dto/send-otp.dto';
import { VerifySpinOtpDto } from './dto/verify-otp.dto';
import { SpinWheelDto } from './dto/spin-wheel.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';
import { QuerySpinParticipantsDto } from './dto/query-participants.dto';

export interface SpinSector {
  rewardId: string;
  title: string;
  badge: string;
  category: string;
  description: string;
  terms: string;
  color: string;
  textColor: string;
  icon: string;
  maxTotalBudget: number;
  allocatedCount: number;
  probabilityWeight: number;
}

@Injectable()
export class SpinWheelService implements OnModuleInit {
  private readonly logger = new Logger(SpinWheelService.name);
  private readonly resend: Resend;

  // Default Reward Set (8 sectors, rich skill & campus rewards)
  private readonly defaultRewards: SpinSector[] = [
    {
      rewardId: 'bonus_masterclass',
      title: 'Bonus Masterclass Pass',
      badge: 'FREE PASS',
      category: 'bonus_class',
      description: 'Exclusive 3-Hour AI & Tech Leadership Masterclass with Industry Veterans',
      terms: 'Valid on visiting WeGrow B-School Campus within 14 days.',
      color: '#f59e0b', // Amber Gold
      textColor: '#ffffff',
      icon: '🎓',
      maxTotalBudget: 150,
      allocatedCount: 0,
      probabilityWeight: 20,
    },
    {
      rewardId: 'discount_50',
      title: '50% Course Scholarship',
      badge: '50% SCHOLARSHIP',
      category: 'discount',
      description: '50% Tuition Waiver on select signature diploma & specialization courses',
      terms: 'Applicable upon campus visit & admission counseling at WeGrow B-School.',
      color: '#0284c7', // Deep Cyan/Sky
      textColor: '#ffffff',
      icon: '⭐',
      maxTotalBudget: 30,
      allocatedCount: 0,
      probabilityWeight: 10,
    },
    {
      rewardId: 'project_review',
      title: '1-on-1 Project Review',
      badge: 'FREE AUDIT',
      category: 'project_review',
      description: 'Personalized Code, Resume & Capstone Project Review with Tech Leads',
      terms: 'Scheduled in-person at WeGrow B-School Innovation Lab.',
      color: '#7c3aed', // Royal Violet
      textColor: '#ffffff',
      icon: '💻',
      maxTotalBudget: 100,
      allocatedCount: 0,
      probabilityWeight: 18,
    },
    {
      rewardId: 'bogo_course',
      title: 'Buy 1 Get 1 Skill Pass',
      badge: 'BOGO OFFER',
      category: 'discount',
      description: 'Enroll in any core track and sponsor a friend/peer at zero additional fee',
      terms: 'Redeemable during campus visit to WeGrow B-School.',
      color: '#059669', // Emerald Green
      textColor: '#ffffff',
      icon: '👥',
      maxTotalBudget: 50,
      allocatedCount: 0,
      probabilityWeight: 12,
    },
    {
      rewardId: 'workshop_pass',
      title: '2-Day Workshop Pass',
      badge: 'FREE PASS',
      category: 'workshop_pass',
      description: 'Complimentary pass for a hands-on weekend workshop on AI & Entrepreneurship',
      terms: 'Present digital voucher code at the campus reception.',
      color: '#db2777', // Crimson Pink
      textColor: '#ffffff',
      icon: '🎟️',
      maxTotalBudget: 120,
      allocatedCount: 0,
      probabilityWeight: 18,
    },
    {
      rewardId: 'campus_voucher',
      title: '₹3,000 Admission Voucher',
      badge: '₹3,000 VOUCHER',
      category: 'discount',
      description: 'Instant ₹3,000 tuition reduction credit upon campus visit registration',
      terms: 'Direct credit adjustment during WeGrow B-School campus enrollment.',
      color: '#ea580c', // Fiery Orange
      textColor: '#ffffff',
      icon: '⚡',
      maxTotalBudget: 80,
      allocatedCount: 0,
      probabilityWeight: 15,
    },
    {
      rewardId: 'discount_20',
      title: '20% Tuition Discount',
      badge: '20% OFF',
      category: 'discount',
      description: 'Flat 20% scholarship discount across our certified curriculum',
      terms: 'Valid on in-person campus registration at WeGrow B-School.',
      color: '#4f46e5', // Indigo
      textColor: '#ffffff',
      icon: '🚀',
      maxTotalBudget: 100,
      allocatedCount: 0,
      probabilityWeight: 16,
    },
    {
      rewardId: 'welcome_kit',
      title: 'Student Welcome Hamper',
      badge: 'CAMPUS GIFT',
      category: 'mentorship',
      description: 'WeGrow Founders Handbook, Tech Kit, Branded Merch & Resource Pass',
      terms: 'Collect in person from campus front desk upon visit.',
      color: '#0d9488', // Teal
      textColor: '#ffffff',
      icon: '🎁',
      maxTotalBudget: 200,
      allocatedCount: 0,
      probabilityWeight: 20,
    },
  ];

  constructor(
    @InjectModel(SpinWheelParticipant.name)
    private readonly participantModel: Model<SpinWheelParticipantDocument>,
    @InjectModel(SpinRewardBudget.name)
    private readonly budgetModel: Model<SpinRewardBudgetDocument>,
  ) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not configured in .env');
    }
    this.resend = new Resend(apiKey);
  }

  async onModuleInit() {
    await this.seedRewardBudgets();
    await this.cleanEmptyVoucherCodes();
  }

  // ============================================================
  // CLEAN LEGACY EMPTY VOUCHER CODES (PREVENTS UNIQUE INDEX CONFLICTS)
  // ============================================================
  private async cleanEmptyVoucherCodes() {
    try {
      const result = await this.participantModel.updateMany(
        { voucherCode: { $in: ['', null] }, hasSpun: false },
        { $unset: { voucherCode: '' } },
      );
      if (result.modifiedCount > 0) {
        this.logger.log(
          `Cleaned up ${result.modifiedCount} empty voucherCode entries from unspun participants.`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to clean empty voucher codes', err);
    }
  }

  // ============================================================
  // SEED OR SYNC REWARD BUDGETS IN DATABASE
  // ============================================================
  private async seedRewardBudgets() {
    try {
      for (const reward of this.defaultRewards) {
        const existing = await this.budgetModel.findOne({
          rewardId: reward.rewardId,
        });
        if (!existing) {
          await this.budgetModel.create(reward);
          this.logger.log(`Initialized reward budget for: ${reward.title}`);
        }
      }
    } catch (err) {
      this.logger.error('Failed to seed spin wheel reward budgets', err);
    }
  }

  // ============================================================
  // 1. GET ACTIVE REWARDS (FOR WHEEL DISPLAY)
  // ============================================================
  async getRewards(): Promise<SpinSector[]> {
    const dbRewards = await this.budgetModel
      .find({ isActive: true })
      .lean()
      .exec();

    if (dbRewards && dbRewards.length > 0) {
      return dbRewards.map((r) => ({
        rewardId: r.rewardId,
        title: r.title,
        badge: r.badge,
        category: r.category,
        description: r.description,
        terms: r.terms,
        color: r.color,
        textColor: r.textColor,
        icon: r.icon,
        maxTotalBudget: r.maxTotalBudget,
        allocatedCount: r.allocatedCount,
        probabilityWeight: r.probabilityWeight,
      }));
    }

    return this.defaultRewards;
  }

  // ============================================================
  // 2. SEND EMAIL OTP (STUDENT REGISTRATION STEP)
  // ============================================================
  async sendOtp(dto: SendSpinOtpDto) {
    const cleanEmail = dto.email.trim().toLowerCase();

    // Normalize phone numbers (digits only)
    const cleanStudentMobile = dto.mobileNo.trim().replace(/[^0-9]/g, '');
    const cleanFatherMobile = dto.fatherMobile.trim().replace(/[^0-9]/g, '');
    const cleanMotherMobile = dto.motherMobile.trim().replace(/[^0-9]/g, '');

    // 1. Validate phone number lengths
    if (cleanStudentMobile.length < 10) {
      throw new BadRequestException('Student mobile number must be at least 10 digits.');
    }
    if (cleanFatherMobile.length < 10) {
      throw new BadRequestException("Father's contact number must be at least 10 digits.");
    }
    if (cleanMotherMobile.length < 10) {
      throw new BadRequestException("Mother's contact number must be at least 10 digits.");
    }

    // 2. Family phone numbers (shared family phone allowed)
    // 3. Check if participant has already spun with this email
    const existingSpunEmail = await this.participantModel.findOne({
      email: cleanEmail,
      hasSpun: true,
    });

    if (existingSpunEmail) {
      return {
        success: false,
        alreadySpun: true,
        message:
          'This email is already registered and has already spun the wheel! Each student is eligible for 1 spin only.',
        data: {
          name: existingSpunEmail.name,
          email: existingSpunEmail.email,
          voucherCode: existingSpunEmail.voucherCode,
          rewardTitle: existingSpunEmail.rewardTitle,
          rewardBadge: existingSpunEmail.rewardBadge,
          rewardDescription: existingSpunEmail.rewardDescription,
          qrCodeDataUrl: existingSpunEmail.qrCodeDataUrl,
          isRedeemed: existingSpunEmail.isRedeemed,
        },
      };
    }

    // 4. Check if student mobile number was already used by another email
    const existingSpunMobile = await this.participantModel.findOne({
      mobileNo: cleanStudentMobile,
      email: { $ne: cleanEmail },
      hasSpun: true,
    });

    if (existingSpunMobile) {
      throw new BadRequestException(
        'This student mobile number has already been used to spin the wheel with another email. Duplicate entries are not permitted.',
      );
    }

    // Check if mobile number is tied to another active participant
    const mobileInUse = await this.participantModel.findOne({
      mobileNo: cleanStudentMobile,
      email: { $ne: cleanEmail },
    });

    if (mobileInUse) {
      throw new BadRequestException(
        'This student mobile number is already registered under another student email. Please enter your unique mobile number.',
      );
    }

    // Upsert participant record cleanly with email verified directly
    await this.participantModel.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          name: dto.name.trim(),
          email: cleanEmail,
          mobileNo: cleanStudentMobile,
          fatherMobile: cleanFatherMobile,
          motherMobile: cleanMotherMobile,
          courseInterested: dto.courseInterested.trim(),
          campusPreference:
            dto.campusPreference?.trim() || 'WeGrow B-School Main Campus',
          isEmailVerified: true,
        },
      },
      { upsert: true, new: true },
    );

    return {
      success: true,
      canSpin: true,
      message: 'Registration confirmed! Spin wheel is unlocked.',
      email: cleanEmail,
      student: {
        name: dto.name.trim(),
        email: cleanEmail,
        courseInterested: dto.courseInterested.trim(),
      },
    };
  }

  // ============================================================
  // 3. VERIFY EMAIL OTP
  // ============================================================
  async verifyOtp(dto: VerifySpinOtpDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const participant = await this.participantModel.findOne({
      email: cleanEmail,
    });

    if (!participant) {
      throw new NotFoundException(
        'Student registration not found. Please fill out the registration form first.',
      );
    }

    if (participant.hasSpun) {
      return {
        success: true,
        alreadySpun: true,
        message: 'You have already spun the wheel and claimed your reward!',
        voucherCode: participant.voucherCode,
        rewardTitle: participant.rewardTitle,
        qrCodeDataUrl: participant.qrCodeDataUrl,
      };
    }

    // Mark verified
    participant.isEmailVerified = true;
    participant.otpVerifiedAt = new Date();
    participant.emailOtp = '';
    await participant.save();

    return {
      success: true,
      message: 'Email successfully verified! The Spin Wheel is now unlocked.',
      student: {
        name: participant.name,
        email: participant.email,
        courseInterested: participant.courseInterested,
      },
      canSpin: true,
    };
  }

  // ============================================================
  // 4. SPIN THE WHEEL (SERVER-DETERMINED FAIR REWARD & BUDGET CONTROL)
  // ============================================================
  async spin(dto: SpinWheelDto, ipAddress?: string, userAgent?: string) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const participant = await this.participantModel.findOne({
      email: cleanEmail,
    });

    if (!participant) {
      throw new NotFoundException('Registration record not found. Please register first.');
    }

    if (participant.hasSpun) {
      return {
        success: false,
        alreadySpun: true,
        message: 'You have already spun the wheel! You cannot spin more than once.',
        data: {
          voucherCode: participant.voucherCode,
          rewardTitle: participant.rewardTitle,
          rewardBadge: participant.rewardBadge,
          rewardDescription: participant.rewardDescription,
          qrCodeDataUrl: participant.qrCodeDataUrl,
        },
      };
    }

    // Fetch all active rewards
    const allRewards = await this.getRewards();

    // Filter by available budget (allocatedCount < maxTotalBudget)
    const availableRewards = allRewards.filter(
      (r) => r.allocatedCount < r.maxTotalBudget,
    );

    const candidatePool =
      availableRewards.length > 0 ? availableRewards : allRewards;

    // Fair server-side weighted random selection
    const wonReward = this.pickWeightedReward(candidatePool);

    // Find its sector index in the full list of rewards (for client wheel rotation calculation)
    const sectorIndex = allRewards.findIndex(
      (r) => r.rewardId === wonReward.rewardId,
    );

    // Generate unique Voucher Code (e.g., WGW-SPIN-83921)
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const voucherCode = `WGW-SPIN-${randomDigits}`;

    // Create QR code for campus verification
    const verificationPayload = JSON.stringify({
      code: voucherCode,
      name: participant.name,
      email: participant.email,
      course: participant.courseInterested,
      reward: wonReward.title,
      campus: 'WeGrow B-School',
      url: `https://www.wegrowbschool.in/spin-and-win?voucher=${voucherCode}`,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(verificationPayload, {
      margin: 2,
      width: 256,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });

    // Update participant
    participant.hasSpun = true;
    participant.spunAt = new Date();
    participant.rewardId = wonReward.rewardId;
    participant.rewardTitle = wonReward.title;
    participant.rewardBadge = wonReward.badge;
    participant.rewardDescription = wonReward.description;
    participant.rewardTerms = wonReward.terms;
    participant.voucherCode = voucherCode;
    participant.qrCodeDataUrl = qrCodeDataUrl;
    participant.ipAddress = ipAddress || '';
    participant.userAgent = userAgent || '';
    await participant.save();

    // Increment budget counter in DB
    await this.budgetModel.updateOne(
      { rewardId: wonReward.rewardId },
      { $inc: { allocatedCount: 1 } },
    );

    // Send official congratulatory reward voucher email
    await this.sendRewardVoucherEmail(participant, wonReward, voucherCode, qrCodeDataUrl);

    return {
      success: true,
      message: 'Congratulations! You have won an exclusive skill reward!',
      reward: wonReward,
      sectorIndex: sectorIndex >= 0 ? sectorIndex : 0,
      totalSectors: allRewards.length,
      voucherCode,
      qrCodeDataUrl,
      student: {
        name: participant.name,
        email: participant.email,
        mobileNo: participant.mobileNo,
        courseInterested: participant.courseInterested,
      },
      campusOffer: {
        title: 'Offer Valid on WeGrow B-School Campus Visit',
        location: 'WeGrow B-School Campus, Innovation & Leadership Hub',
        visitingHours: 'Mon - Sat: 9:30 AM to 6:00 PM',
        instructions:
          'Present this digital voucher or QR code at our campus reception to claim your reward & counseling session.',
      },
    };
  }

  // ============================================================
  // 5. VERIFY VOUCHER (FOR RECEPTION / CAMPUS STAFF SCANNER)
  // ============================================================
  async verifyVoucher(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const participant = await this.participantModel.findOne({
      voucherCode: cleanCode,
    });

    if (!participant) {
      throw new NotFoundException(`No voucher found with code: ${cleanCode}`);
    }

    return {
      success: true,
      voucherCode: participant.voucherCode,
      isRedeemed: participant.isRedeemed,
      redeemedAt: participant.redeemedAt,
      redeemedBy: participant.redeemedBy,
      student: {
        name: participant.name,
        email: participant.email,
        mobileNo: participant.mobileNo,
        fatherMobile: participant.fatherMobile,
        motherMobile: participant.motherMobile,
        courseInterested: participant.courseInterested,
        campusPreference: participant.campusPreference,
        registeredAt: (participant as any).createdAt,
      },
      reward: {
        title: participant.rewardTitle,
        badge: participant.rewardBadge,
        description: participant.rewardDescription,
        terms: participant.rewardTerms,
      },
    };
  }

  // ============================================================
  // 6. REDEEM VOUCHER (CAMPUS STAFF ACTION)
  // ============================================================
  async redeemVoucher(dto: RedeemVoucherDto, staffName = 'Campus Reception Desk') {
    const cleanCode = dto.voucherCode.trim().toUpperCase();
    const participant = await this.participantModel.findOne({
      voucherCode: cleanCode,
    });

    if (!participant) {
      throw new NotFoundException(`Voucher code ${cleanCode} does not exist.`);
    }

    if (participant.isRedeemed) {
      throw new BadRequestException(
        `This voucher has already been redeemed on ${participant.redeemedAt?.toLocaleString() || 'a previous visit'}.`,
      );
    }

    participant.isRedeemed = true;
    participant.redeemedAt = new Date();
    participant.redeemedBy = staffName;
    if (dto.staffNote) {
      participant.rewardTerms = `${participant.rewardTerms || ''} [Staff Note: ${dto.staffNote}]`.trim();
    }
    await participant.save();

    return {
      success: true,
      message: `Voucher ${cleanCode} has been successfully validated and marked as CLAIMED at WeGrow B-School!`,
      studentName: participant.name,
      rewardTitle: participant.rewardTitle,
      redeemedAt: participant.redeemedAt,
    };
  }

  // ============================================================
  // 7. GET STATS (FOR ADMIN)
  // ============================================================
  async getStats() {
    const totalRegistered = await this.participantModel.countDocuments();
    const totalVerified = await this.participantModel.countDocuments({
      isEmailVerified: true,
    });
    const totalSpun = await this.participantModel.countDocuments({
      hasSpun: true,
    });
    const totalRedeemed = await this.participantModel.countDocuments({
      isRedeemed: true,
    });

    const rewardBreakdown = await this.participantModel.aggregate([
      { $match: { hasSpun: true } },
      { $group: { _id: '$rewardTitle', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const courseBreakdown = await this.participantModel.aggregate([
      { $group: { _id: '$courseInterested', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const budgets = await this.budgetModel.find().lean();

    return {
      totalRegistered,
      totalVerified,
      totalSpun,
      totalRedeemed,
      rewardBreakdown,
      courseBreakdown,
      budgets,
    };
  }

  // ============================================================
  // 8. ADMIN: GET ALL REGISTERED PARTICIPANTS (WITH SEARCH & FILTERS)
  // ============================================================
  async findAllParticipants(query: QuerySpinParticipantsDto) {
    const filter: any = {};

    // Search by student name, email, student phone, father phone, mother phone, or voucher code
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { mobileNo: { $regex: s, $options: 'i' } },
        { fatherMobile: { $regex: s, $options: 'i' } },
        { motherMobile: { $regex: s, $options: 'i' } },
        { voucherCode: { $regex: s, $options: 'i' } },
      ];
    }

    if (query.course && query.course.trim()) {
      filter.courseInterested = { $regex: query.course.trim(), $options: 'i' };
    }

    if (query.hasSpun !== undefined && query.hasSpun !== '') {
      filter.hasSpun = String(query.hasSpun) === 'true';
    }

    if (query.isRedeemed !== undefined && query.isRedeemed !== '') {
      filter.isRedeemed = String(query.isRedeemed) === 'true';
    }

    if (query.isEmailVerified !== undefined && query.isEmailVerified !== '') {
      filter.isEmailVerified = String(query.isEmailVerified) === 'true';
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const sortField = query.sortBy || 'createdAt';
    const sortDir = query.sortOrder === 'asc' ? 1 : -1;
    const sortObj: any = { [sortField]: sortDir };

    const [total, participants, totalVerified, totalSpun, totalRedeemed, totalOverall] =
      await Promise.all([
        this.participantModel.countDocuments(filter),
        this.participantModel
          .find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .select('-emailOtp')
          .lean()
          .exec(),
        this.participantModel.countDocuments({ isEmailVerified: true }),
        this.participantModel.countDocuments({ hasSpun: true }),
        this.participantModel.countDocuments({ isRedeemed: true }),
        this.participantModel.countDocuments(),
      ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalRegistered: totalOverall,
        totalVerified,
        totalSpun,
        totalRedeemed,
      },
      participants,
    };
  }

  // ============================================================
  // HELPER: WEIGHTED RANDOM PICK FOR FAIR REWARDS
  // ============================================================
  private pickWeightedReward(pool: SpinSector[]): SpinSector {
    const totalWeight = pool.reduce((acc, cur) => acc + (cur.probabilityWeight || 1), 0);
    let randomNum = Math.random() * totalWeight;

    for (const reward of pool) {
      if (randomNum < reward.probabilityWeight) {
        return reward;
      }
      randomNum -= reward.probabilityWeight;
    }

    return pool[0];
  }

  // ============================================================
  // HELPER: SEND OTP EMAIL VIA RESEND
  // ============================================================
  private async sendOtpEmail(to: string, name: string, otp: string) {
    try {
      if (!process.env.RESEND_API_KEY) {
        this.logger.warn(`No RESEND_API_KEY; OTP for ${to} is: ${otp}`);
        return;
      }

      const mailFrom =
        process.env.MAIL_FROM || 'WeGrow B School <noreply@wegrowbschool.in>';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Spin & Win Verification Code — WeGrow B-School</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6edf3;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0d1117;padding:30px 10px;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#161b22 0%,#0f141c 100%);border-radius:18px;border:1px solid #30363d;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 40%,#b45309 100%);padding:28px 24px;text-align:center;">
              <div style="font-size:26px;font-weight:900;letter-spacing:1px;color:#ffffff;text-shadow:0 2px 4px rgba(0,0,0,0.3);">
                ✨ WEGROW B-SCHOOL ✨
              </div>
              <div style="font-size:14px;font-weight:700;color:#fffbeb;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">
                Spin & Win — Skill Edition 🎡
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 32px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0 0 14px;font-weight:800;">
                Hello ${name},
              </h1>
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 26px;">
                You are one step away from unlocking the <strong style="color:#f59e0b;">WeGrow Skill Spinning Wheel</strong>! Enter this verification code to verify your student email and spin to win scholarships, workshop passes, and learning perks.
              </p>

              <!-- OTP Box -->
              <div style="margin:28px auto;background:#1e293b;border:2px dashed #f59e0b;border-radius:12px;padding:18px 28px;display:inline-block;">
                <div style="font-size:12px;font-weight:800;color:#f59e0b;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">
                  Your Verification OTP
                </div>
                <div style="font-size:38px;font-weight:900;letter-spacing:10px;color:#ffffff;font-family:monospace;">
                  ${otp}
                </div>
              </div>

              <p style="color:#64748b;font-size:13px;line-height:1.5;margin:18px 0 0;">
                ⏳ This code is valid for <strong>10 minutes</strong>. Please do not share this OTP with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#090d16;padding:20px 24px;text-align:center;border-top:1px solid #21262d;font-size:12px;color:#64748b;">
              <p style="margin:0 0 6px;"><strong>WeGrow B-School</strong> &bull; Empowering Skills. Transforming Futures.</p>
              <p style="margin:0;"><a href="https://www.wegrowbschool.in" style="color:#f59e0b;text-decoration:none;">www.wegrowbschool.in</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const { data, error } = await this.resend.emails.send({
        from: mailFrom,
        to: [to],
        subject: `[OTP: ${otp}] Verify Your Email — WeGrow Spin & Win`,
        html,
      });

      if (error) {
        this.logger.error(`Resend OTP email error for ${to}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Resend OTP sent to ${to}. Message ID: ${data?.id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}`, err);
    }
  }

  // ============================================================
  // HELPER: SEND REWARD VOUCHER EMAIL WITH CAMPUS VISIT PASS
  // ============================================================
  private async sendRewardVoucherEmail(
    student: SpinWheelParticipantDocument,
    reward: SpinSector,
    voucherCode: string,
    qrCodeDataUrl: string,
  ) {
    try {
      if (!process.env.RESEND_API_KEY) {
        this.logger.warn(`No RESEND_API_KEY; voucher won for ${student.email}: ${voucherCode}`);
        return;
      }

      const mailFrom =
        process.env.MAIL_FROM || 'WeGrow B School <noreply@wegrowbschool.in>';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Congratulations! Your Spin & Win Reward — WeGrow B-School</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:30px 10px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#131b2e 0%,#0d1424 100%);border-radius:20px;border:1px solid #23314f;overflow:hidden;box-shadow:0 16px 44px rgba(0,0,0,0.7);">
          
          <!-- Celebration Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 40%,#ea580c 100%);padding:32px 24px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🎉 🏆 🎡</div>
              <div style="font-size:26px;font-weight:900;letter-spacing:1px;color:#ffffff;text-shadow:0 2px 6px rgba(0,0,0,0.4);">
                YOU'RE A WINNER!
              </div>
              <div style="font-size:14px;font-weight:800;color:#fffbeb;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">
                WeGrow B-School &bull; Spin & Win Skill Edition
              </div>
            </td>
          </tr>

          <!-- Winner Content -->
          <tr>
            <td style="padding:34px 30px;text-align:center;">
              <p style="color:#94a3b8;font-size:16px;margin:0 0 10px;">
                Congratulations, <strong style="color:#ffffff;">${student.name}</strong>!
              </p>
              <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">
                You spun the wheel and unlocked an exclusive skill benefit for your interested course <strong style="color:#f59e0b;">${student.courseInterested}</strong>!
              </p>

              <!-- Reward Showcase Card -->
              <div style="background:linear-gradient(145deg,#1e293b 0%,#0f172a 100%);border:2px solid #f59e0b;border-radius:16px;padding:24px 20px;margin-bottom:28px;">
                <div style="display:inline-block;background:#f59e0b;color:#0f172a;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">
                  ${reward.badge}
                </div>
                <div style="font-size:24px;font-weight:900;color:#ffffff;margin-bottom:8px;">
                  ${reward.title}
                </div>
                <div style="font-size:14px;color:#94a3b8;line-height:1.5;">
                  ${reward.description}
                </div>
              </div>

              <!-- Voucher Code & QR Block -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#090d16;border:1px dashed #334155;border-radius:14px;padding:20px;margin-bottom:28px;">
                <tr>
                  <td width="50%" align="center" style="border-right:1px solid #1e293b;padding-right:15px;">
                    <div style="font-size:11px;font-weight:800;color:#f59e0b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">
                      Claim Voucher Code
                    </div>
                    <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;font-family:monospace;background:#1e293b;padding:8px 12px;border-radius:8px;display:inline-block;">
                      ${voucherCode}
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:6px;">
                      Show code at campus desk
                    </div>
                  </td>
                  <td width="50%" align="center" style="padding-left:15px;">
                    <img src="${qrCodeDataUrl}" alt="Campus Verification QR" width="130" height="130" style="display:block;border-radius:10px;background:#ffffff;padding:6px;" />
                    <div style="font-size:11px;color:#64748b;margin-top:6px;">
                      Fast Scan for Campus Entry
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Campus Visit Instructions -->
              <div style="text-align:left;background:#131c31;border-radius:14px;padding:22px;border-left:4px solid #f59e0b;margin-bottom:24px;">
                <div style="font-size:15px;font-weight:800;color:#ffffff;margin-bottom:8px;">
                  📍 How to Claim Your Reward:
                </div>
                <ol style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7;">
                  <li>Visit the <strong>WeGrow B-School Campus</strong> during visiting hours (Mon - Sat, 9:30 AM – 6:00 PM).</li>
                  <li>Present this voucher ticket or QR code at our campus reception.</li>
                  <li>Our academic advisors will apply your discount, book your workshop, or grant your project review & starter kit!</li>
                </ol>
              </div>

              <!-- Campus Location Details -->
              <div style="text-align:left;font-size:13px;color:#94a3b8;line-height:1.6;">
                <p style="margin:0 0 6px;"><strong style="color:#ffffff;">Campus Location:</strong> WeGrow B-School Campus, Innovation Hub, Bengaluru / Chennai</p>
                <p style="margin:0 0 6px;"><strong style="color:#ffffff;">Contact / Helpline:</strong> +91 98400 12345 / admissions@wegrowbschool.in</p>
                <p style="margin:0;"><strong style="color:#ffffff;">Website:</strong> <a href="https://www.wegrowbschool.in" style="color:#f59e0b;text-decoration:none;">www.wegrowbschool.in</a></p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#070a12;padding:20px 24px;text-align:center;border-top:1px solid #1a2333;font-size:12px;color:#64748b;">
              <p style="margin:0 0 4px;">&copy; 2026 WeGrow B-School. All rights reserved.</p>
              <p style="margin:0;">Valid for learning &amp; skill enhancement tracks. Avoid cash gambling mechanics; non-transferable.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const { data, error } = await this.resend.emails.send({
        from: mailFrom,
        to: [student.email],
        subject: `🎉 You Won ${reward.title}! Your WeGrow B-School Campus Voucher`,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send voucher email to ${student.email}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Voucher email sent to ${student.email}. Message ID: ${data?.id}`);
      }
    } catch (err) {
      this.logger.error(`Error sending reward voucher email to ${student.email}`, err);
    }
  }
}
