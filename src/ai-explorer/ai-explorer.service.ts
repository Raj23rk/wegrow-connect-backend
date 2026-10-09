import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AiEnrollmentStatus,
  AiExplorerEnrollment,
  AiExplorerEnrollmentDocument,
  AiFeePlan,
  AiPaymentStatus,
} from './schemas/ai-explorer-enrollment.schema';
import {
  AiExplorerCounter,
  AiExplorerCounterDocument,
} from './schemas/ai-explorer-counter.schema';
import { CreateAiExplorerEnrollmentDto } from './dto/create-ai-explorer-enrollment.dto';
import { QueryAiExplorerEnrollmentDto } from './dto/query-ai-explorer-enrollment.dto';
import { UpdateAiExplorerEnrollmentDto } from './dto/update-ai-explorer-enrollment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AiExplorerService {
  private readonly logger = new Logger(AiExplorerService.name);

  constructor(
    @InjectModel(AiExplorerEnrollment.name)
    private readonly enrollmentModel: Model<AiExplorerEnrollmentDocument>,
    @InjectModel(AiExplorerCounter.name)
    private readonly counterModel: Model<AiExplorerCounterDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generates atomic unique sequential enrollment IDs like AIE26-1001
   */
  async generateEnrollmentId(): Promise<string> {
    try {
      const counter = await this.counterModel.findOneAndUpdate(
        { id: 'ai_explorer_enrollment' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      const year = new Date().getFullYear().toString().slice(-2);
      return `AIE${year}-${counter.seq}`;
    } catch (error) {
      this.logger.error('Failed to generate sequential enrollment ID, using timestamp fallback', error);
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `AIE26-${rand}`;
    }
  }

  /**
   * Helper to normalize fee plan amounts and names
   */
  private resolveFeePlan(planRaw?: string, inputAmount?: number) {
    const p = (planRaw || 'full').toLowerCase().trim();
    if (p.includes('half')) {
      return {
        feePlan: AiFeePlan.HALF,
        planName: 'Half-Yearly',
        amount: inputAmount && inputAmount > 0 ? inputAmount : 22500,
        totalCourseFee: 45000,
      };
    }
    if (p.includes('term')) {
      return {
        feePlan: AiFeePlan.TERM,
        planName: 'Term Wise Payment',
        amount: inputAmount && inputAmount > 0 ? inputAmount : 15000,
        totalCourseFee: 45000,
      };
    }
    return {
      feePlan: AiFeePlan.FULL,
      planName: 'Full Payment',
      amount: inputAmount && inputAmount > 0 ? inputAmount : 43000,
      totalCourseFee: 43000,
    };
  }

  /**
   * Enroll Student (Public submission)
   */
  async enrollStudent(dto: CreateAiExplorerEnrollmentDto) {
    let studentName = (
      dto.studentName ||
      dto.name ||
      dto.fullName ||
      dto.customerName ||
      ''
    ).trim();

    let standard = (dto.standard || '').trim();
    let school = (dto.school || '').trim();

    const students = Array.isArray(dto.students) ? dto.students : [];
    if (students.length > 0) {
      if (!studentName) {
        studentName = students
          .map((s) => (s.name || s.studentName || '').trim())
          .filter(Boolean)
          .join(', ');
      }
      if (!standard) {
        standard = students
          .map((s) => (s.standard || '').trim())
          .filter(Boolean)
          .join(', ');
      }
      if (!school) {
        school = students
          .map((s) => (s.school || '').trim())
          .filter(Boolean)
          .join(', ');
      }
    }

    if (!studentName) {
      throw new BadRequestException('Student name is required');
    }

    const email = (
      dto.email ||
      dto.mailId ||
      dto.customerEmail ||
      ''
    ).trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email address is required');
    }

    const fatherName = (dto.fatherName || '').trim();
    const motherName = (dto.motherName || '').trim();
    const rawFatherPhone = (dto.fatherPhone || dto.phone || dto.customerPhone || '').trim().replace(/\D/g, '').slice(-10);
    const rawMotherPhone = (dto.motherPhone || '').trim().replace(/\D/g, '').slice(-10);

    if (rawFatherPhone && rawMotherPhone && rawFatherPhone === rawMotherPhone) {
      throw new BadRequestException("Father's phone number and Mother's phone number cannot be the same. Please provide an alternate contact number.");
    }

    const fatherPhone = rawFatherPhone || rawMotherPhone;
    const motherPhone = rawMotherPhone || '';
    const address = (dto.address || '').trim();

    if (!standard || !school || !fatherName || !fatherPhone || !address) {
      throw new BadRequestException('All student and parent details are required');
    }

    const planInfo = this.resolveFeePlan(dto.feePlan || dto.plan, dto.amount || dto.orderAmount);
    const totalStudents = dto.totalStudents || dto.studentCount || (students.length > 0 ? students.length : 1);
    const enrollmentId = await this.generateEnrollmentId();

    let paymentStatus = AiPaymentStatus.COMPLETED;
    if (dto.paymentStatus) {
      const ps = dto.paymentStatus.toUpperCase().trim();
      if (ps.includes('PENDING')) paymentStatus = AiPaymentStatus.PENDING;
      else if (ps.includes('FAIL')) paymentStatus = AiPaymentStatus.FAILED;
      else if (ps.includes('REFUND')) paymentStatus = AiPaymentStatus.REFUNDED;
      else paymentStatus = AiPaymentStatus.COMPLETED; // Handles 'PAID', 'SUCCESS', 'COMPLETED'
    }

    const status = dto.status === 'PENDING_PAYMENT' ? AiEnrollmentStatus.PENDING_PAYMENT : AiEnrollmentStatus.ENROLLED;
    const finalAmount = dto.amount && dto.amount > 0 ? dto.amount : planInfo.amount;
    const finalTotalFee = dto.totalFee || dto.totalCourseFee || planInfo.totalCourseFee;
    const finalPlanName = dto.planName || planInfo.planName;

    const enrollment = new this.enrollmentModel({
      enrollmentId,
      studentName,
      students,
      studentCount: totalStudents,
      totalStudents,
      email,
      standard,
      school,
      fatherName,
      motherName: motherName || fatherName,
      fatherPhone,
      motherPhone,
      address,
      courseName: dto.courseName || 'AI Explorer',
      feePlan: planInfo.feePlan,
      planName: finalPlanName,
      selectedTerm: dto.selectedTerm || '',
      amount: finalAmount,
      totalCourseFee: finalTotalFee,
      totalFee: finalTotalFee,
      paymentMethod: dto.paymentMethod || 'UPI',
      paymentStatus,
      orderId: dto.orderId || dto.transactionId || dto.txnid || '',
      paymentId: dto.paymentId || dto.cfPaymentId || dto.transactionId || '',
      utr: dto.utr || dto.transactionId || '',
      declarationAccepted: dto.declarationAccepted !== false,
      status,
      adminNotes: dto.adminNotes || '',
      isActive: true,
    });

    const saved = await enrollment.save();

    // Asynchronously dispatch notification emails
    this.sendNotificationEmails(saved).catch((err) =>
      this.logger.error(`Error sending enrollment email notifications for ${enrollmentId}:`, err),
    );

    return saved;
  }

  /**
   * Dispatch Student Confirmation & Admin Alert Emails
   */
  async sendNotificationEmails(enrollment: AiExplorerEnrollmentDocument) {
    if (!enrollment.email) return;

    try {
      // 1. Send Student / Parent Confirmation Email
      const studentEmailSuccess = await this.notificationsService.sendAiExplorerStudentWelcomeEmail({
        email: enrollment.email,
        studentName: enrollment.studentName,
        enrollmentId: enrollment.enrollmentId,
        standard: enrollment.standard,
        school: enrollment.school,
        fatherName: enrollment.fatherName,
        motherName: enrollment.motherName,
        fatherPhone: enrollment.fatherPhone,
        motherPhone: enrollment.motherPhone,
        feePlan: enrollment.feePlan,
        planName: enrollment.planName,
        amount: enrollment.amount,
        totalCourseFee: enrollment.totalCourseFee,
        paymentMethod: enrollment.paymentMethod,
        paymentStatus: enrollment.paymentStatus,
        utr: enrollment.utr,
        orderId: enrollment.orderId,
        createdAt: (enrollment as any).createdAt,
      });

      if (studentEmailSuccess) {
        await this.enrollmentModel.updateOne(
          { _id: enrollment._id },
          { $set: { emailSent: true, emailSentAt: new Date() } },
        );
        this.logger.log(`Student welcome email sent to ${enrollment.email} for ${enrollment.enrollmentId}`);
      }

      // 2. Send Admin Alert Email
      await this.notificationsService.sendAiExplorerAdminAlertEmail({
        studentName: enrollment.studentName,
        enrollmentId: enrollment.enrollmentId,
        email: enrollment.email,
        standard: enrollment.standard,
        school: enrollment.school,
        fatherName: enrollment.fatherName,
        motherName: enrollment.motherName,
        fatherPhone: enrollment.fatherPhone,
        motherPhone: enrollment.motherPhone,
        address: enrollment.address,
        feePlan: enrollment.feePlan,
        planName: enrollment.planName,
        amount: enrollment.amount,
        paymentMethod: enrollment.paymentMethod,
        paymentStatus: enrollment.paymentStatus,
        orderId: enrollment.orderId,
        utr: enrollment.utr,
        createdAt: (enrollment as any).createdAt,
      });
    } catch (err) {
      this.logger.error('Failed to send notification emails:', err);
    }
  }

  /**
   * Verify Enrollment by ID or Enrollment ID (Public)
   */
  async verifyEnrollment(id: string) {
    const cleanId = (id || '').trim();
    let enrollment: AiExplorerEnrollmentDocument | null = null;

    if (Types.ObjectId.isValid(cleanId)) {
      enrollment = await this.enrollmentModel.findById(cleanId);
    }
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({
        $or: [
          { enrollmentId: cleanId.toUpperCase() },
          { orderId: cleanId },
          { utr: cleanId },
        ],
        isActive: true,
      });
    }

    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found with ID: ${cleanId}`);
    }

    return {
      success: true,
      data: enrollment,
    };
  }

  /**
   * Admin: Find All with Pagination, Search & Filters
   */
  async findAll(query: QueryAiExplorerEnrollmentDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isActive: true };

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { studentName: { $regex: s, $options: 'i' } },
        { enrollmentId: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { school: { $regex: s, $options: 'i' } },
        { fatherName: { $regex: s, $options: 'i' } },
        { motherName: { $regex: s, $options: 'i' } },
        { fatherPhone: { $regex: s, $options: 'i' } },
        { motherPhone: { $regex: s, $options: 'i' } },
        { orderId: { $regex: s, $options: 'i' } },
        { utr: { $regex: s, $options: 'i' } },
      ];
    }

    if (query.standard && query.standard.trim()) {
      filter.standard = { $regex: query.standard.trim(), $options: 'i' };
    }

    if (query.feePlan && query.feePlan.trim()) {
      filter.feePlan = query.feePlan.trim().toLowerCase();
    }

    if (query.paymentStatus && query.paymentStatus.trim()) {
      filter.paymentStatus = query.paymentStatus.trim().toUpperCase();
    }

    if (query.status && query.status.trim()) {
      filter.status = query.status.trim().toUpperCase();
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, any> = { [sortField]: sortOrder };

    const [enrollments, total] = await Promise.all([
      this.enrollmentModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.enrollmentModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: enrollments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Admin: Get Comprehensive Statistics
   */
  async getStats() {
    const match = { isActive: true };

    const [
      totalEnrollments,
      completedEnrollments,
      pendingEnrollments,
      revenueResult,
      byPlan,
      byStandard,
      byPaymentMethod,
      recentEnrollments,
    ] = await Promise.all([
      this.enrollmentModel.countDocuments(match),
      this.enrollmentModel.countDocuments({ ...match, paymentStatus: AiPaymentStatus.COMPLETED }),
      this.enrollmentModel.countDocuments({ ...match, paymentStatus: AiPaymentStatus.PENDING }),
      this.enrollmentModel.aggregate([
        { $match: { ...match, paymentStatus: AiPaymentStatus.COMPLETED } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
      this.enrollmentModel.aggregate([
        { $match: match },
        { $group: { _id: '$feePlan', count: { $sum: 1 }, totalRevenue: { $sum: '$amount' } } },
        { $sort: { count: -1 } },
      ]),
      this.enrollmentModel.aggregate([
        { $match: match },
        { $group: { _id: '$standard', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      this.enrollmentModel.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.enrollmentModel.find(match).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return {
      success: true,
      data: {
        totalEnrollments,
        completedEnrollments,
        pendingEnrollments,
        totalRevenue,
        totalRevenueFormatted: `₹${totalRevenue.toLocaleString('en-IN')}`,
        byPlan,
        byStandard,
        byPaymentMethod,
        recentEnrollments,
      },
    };
  }

  /**
   * Admin: Export all enrollments as CSV
   */
  async exportCsv() {
    const enrollments = await this.enrollmentModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Enrollment ID',
      'Student Name',
      'Email',
      'Standard',
      'School',
      'Father Name',
      'Father Phone',
      'Mother Name',
      'Mother Phone',
      'Address',
      'Fee Plan',
      'Plan Name',
      'Amount (INR)',
      'Total Course Fee',
      'Payment Method',
      'Payment Status',
      'Order ID',
      'UTR',
      'Enrollment Status',
      'Email Sent',
      'Created Date',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = enrollments.map((e: any) => [
      escapeCsv(e.enrollmentId),
      escapeCsv(e.studentName),
      escapeCsv(e.email),
      escapeCsv(e.standard),
      escapeCsv(e.school),
      escapeCsv(e.fatherName),
      escapeCsv(e.fatherPhone),
      escapeCsv(e.motherName),
      escapeCsv(e.motherPhone),
      escapeCsv(e.address),
      escapeCsv(e.feePlan),
      escapeCsv(e.planName),
      escapeCsv(e.amount),
      escapeCsv(e.totalCourseFee),
      escapeCsv(e.paymentMethod),
      escapeCsv(e.paymentStatus),
      escapeCsv(e.orderId || ''),
      escapeCsv(e.utr || ''),
      escapeCsv(e.status),
      escapeCsv(e.emailSent ? 'Yes' : 'No'),
      escapeCsv(new Date(e.createdAt).toISOString().split('T')[0]),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csvContent;
  }

  /**
   * Admin: Find single enrollment by ID
   */
  async findOne(id: string) {
    let enrollment: AiExplorerEnrollmentDocument | null = null;
    if (Types.ObjectId.isValid(id)) {
      enrollment = await this.enrollmentModel.findById(id);
    }
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({ enrollmentId: id.toUpperCase() });
    }
    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found for ID: ${id}`);
    }
    return {
      success: true,
      data: enrollment,
    };
  }

  /**
   * Admin: Update enrollment
   */
  async update(id: string, dto: UpdateAiExplorerEnrollmentDto) {
    let enrollment = await this.enrollmentModel.findById(id);
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({ enrollmentId: id.toUpperCase() });
    }
    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found for ID: ${id}`);
    }

    Object.assign(enrollment, dto);
    const updated = await enrollment.save();

    return {
      success: true,
      message: 'Enrollment updated successfully',
      data: updated,
    };
  }

  /**
   * Admin: Remove enrollment (Soft delete)
   */
  async remove(id: string) {
    let enrollment = await this.enrollmentModel.findById(id);
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({ enrollmentId: id.toUpperCase() });
    }
    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found for ID: ${id}`);
    }

    enrollment.isActive = false;
    await enrollment.save();

    return {
      success: true,
      message: 'Enrollment deleted successfully',
    };
  }

  /**
   * Admin: Resend Confirmation Email
   */
  async resendConfirmationEmail(id: string, targetEmail?: string) {
    let enrollment = await this.enrollmentModel.findById(id);
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({ enrollmentId: id.toUpperCase() });
    }
    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found for ID: ${id}`);
    }

    const emailToUse = (targetEmail || enrollment.email || '').trim();
    if (!emailToUse) {
      throw new BadRequestException('No email address provided for sending confirmation');
    }

    const success = await this.notificationsService.sendAiExplorerStudentWelcomeEmail({
      email: emailToUse,
      studentName: enrollment.studentName,
      enrollmentId: enrollment.enrollmentId,
      standard: enrollment.standard,
      school: enrollment.school,
      fatherName: enrollment.fatherName,
      motherName: enrollment.motherName,
      fatherPhone: enrollment.fatherPhone,
      motherPhone: enrollment.motherPhone,
      feePlan: enrollment.feePlan,
      planName: enrollment.planName,
      amount: enrollment.amount,
      totalCourseFee: enrollment.totalCourseFee,
      paymentMethod: enrollment.paymentMethod,
      paymentStatus: enrollment.paymentStatus,
      utr: enrollment.utr,
      orderId: enrollment.orderId,
      createdAt: (enrollment as any).createdAt,
    });

    if (success) {
      await this.enrollmentModel.updateOne(
        { _id: enrollment._id },
        { $set: { emailSent: true, emailSentAt: new Date() } },
      );
    }

    return {
      success,
      message: success ? `Confirmation email resent to ${emailToUse}` : 'Failed to send email',
    };
  }
}
