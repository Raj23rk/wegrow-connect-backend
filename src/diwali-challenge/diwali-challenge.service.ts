import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resend } from 'resend';
import * as QRCode from 'qrcode';
import {
  DiwaliChallenge,
  DiwaliChallengeDocument,
} from './schemas/diwali-challenge.schema';
import {
  ChallengeQuestion,
  DIWALI_CHALLENGE_QUESTIONS,
} from './diwali-challenge.data';
import { EnrollDiwaliChallengeDto } from './dto/enroll-challenge.dto';
import { SubmitDiwaliChallengeDto } from './dto/submit-challenge.dto';
import { QueryDiwaliChallengeDto } from './dto/query-challenge.dto';
import { RedeemDemoTicketDto } from './dto/redeem-ticket.dto';

@Injectable()
export class DiwaliChallengeService {
  private readonly logger = new Logger(DiwaliChallengeService.name);
  private readonly resend: Resend;

  constructor(
    @InjectModel(DiwaliChallenge.name)
    private readonly challengeModel: Model<DiwaliChallengeDocument>,
  ) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not configured in .env');
    }
    this.resend = new Resend(apiKey);
  }

  // ============================================================
  // 1. GET PUBLIC QUESTIONS (SAFE - STRIPS ANSWERS)
  // ============================================================
  getPublicQuestions() {
    return DIWALI_CHALLENGE_QUESTIONS.map((q) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      options: q.options,
      marks: q.marks,
    }));
  }

  // ============================================================
  // 2. ENROLL STUDENT (STEP 1: SCAN POSTER QR & FILL DETAILS)
  // ============================================================
  async enroll(dto: EnrollDiwaliChallengeDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanMobile = dto.mobileNo.trim().replace(/[^0-9]/g, '');

    if (cleanMobile.length < 10) {
      throw new BadRequestException('Mobile number must be at least 10 digits.');
    }

    // Check if student already completed this challenge
    const existing = await this.challengeModel.findOne({ email: cleanEmail });
    if (existing && existing.submittedAt) {
      return {
        success: false,
        alreadySubmitted: true,
        message: 'You have already completed the Diwali Coding Challenge!',
        data: {
          studentName: existing.studentName,
          score: existing.score,
          correctCount: existing.correctCount,
          isQualifiedForDemo: existing.isQualifiedForDemo,
          demoTicketCode: existing.demoTicketCode,
          qrCodeDataUrl: existing.qrCodeDataUrl,
          isRedeemed: existing.isRedeemed,
        },
      };
    }

    // Create or update unsubmitted enrollment
    const student = await this.challengeModel.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          studentName: dto.studentName.trim(),
          email: cleanEmail,
          mobileNo: cleanMobile,
          collegeOrSchool: dto.collegeOrSchool?.trim() || '',
          courseInterested: dto.courseInterested.trim(),
          referralSource: dto.referralSource?.trim() || 'Campus Diwali Poster QR',
        },
      },
      { upsert: true, new: true },
    );

    return {
      success: true,
      message: 'Student enrollment successful! Challenge unlocked.',
      student: {
        studentName: student.studentName,
        email: student.email,
        courseInterested: student.courseInterested,
      },
      totalQuestions: 20,
      marksPerQuestion: 5,
      totalMarks: 100,
      passingCutoff: 80,
      timeLimitMinutes: 20,
    };
  }

  // ============================================================
  // 3. SUBMIT ANSWERS & EVALUATE SCORE
  // ============================================================
  async submitAnswers(dto: SubmitDiwaliChallengeDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const student = await this.challengeModel.findOne({ email: cleanEmail });

    if (!student) {
      throw new NotFoundException(
        'Student enrollment not found. Please fill out the enrollment form first.',
      );
    }

    if (student.submittedAt) {
      return {
        success: true,
        alreadySubmitted: true,
        message: 'You have already submitted this challenge.',
        score: student.score,
        correctCount: student.correctCount,
        isQualifiedForDemo: student.isQualifiedForDemo,
        demoTicketCode: student.demoTicketCode,
        qrCodeDataUrl: student.qrCodeDataUrl,
      };
    }

    // Map and grade each answer (5 marks each)
    let correctCount = 0;
    const answerMap = new Map<number, number>();
    dto.answers.forEach((a) => answerMap.set(a.questionId, a.selectedOption));

    const evaluatedAnswers = DIWALI_CHALLENGE_QUESTIONS.map((q) => {
      const selected = answerMap.has(q.id) ? answerMap.get(q.id)! : -1;
      const isCorrect = selected === q.correctOption;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        questionText: q.question,
        selectedOption: selected,
        correctOption: q.correctOption,
        isCorrect,
      };
    });

    const score = correctCount * 5; // e.g. 16 * 5 = 80
    const isQualifiedForDemo = score >= 80; // Pass requirement: 80+ marks!

    let demoTicketCode = '';
    let qrCodeDataUrl = '';

    if (isQualifiedForDemo) {
      // Generate unique demo ticket code
      const randomDigits = Math.floor(10000 + Math.random() * 90000);
      demoTicketCode = `WGW-DEMO-${randomDigits}`;

      // Create QR verification code
      const qrPayload = JSON.stringify({
        ticket: demoTicketCode,
        student: student.studentName,
        email: student.email,
        score,
        benefit: '1-Week Free Live Demo Batch',
        campus: 'WeGrow B-School',
      });

      qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 2,
        width: 256,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      });
    }

    // Save student test results
    student.answers = evaluatedAnswers;
    student.correctCount = correctCount;
    student.score = score;
    student.isQualifiedForDemo = isQualifiedForDemo;
    student.demoTicketCode = demoTicketCode;
    student.qrCodeDataUrl = qrCodeDataUrl;
    student.submittedAt = new Date();
    await student.save();

    // Send result email (with Demo Pass if qualified)
    await this.sendResultEmail(student, score, correctCount, isQualifiedForDemo, demoTicketCode, qrCodeDataUrl);

    return {
      success: true,
      message: isQualifiedForDemo
        ? `Outstanding! You scored ${score}/100 and unlocked a 1-Week Free Live Demo Batch!`
        : `Challenge completed! You scored ${score}/100. Great effort!`,
      student: {
        studentName: student.studentName,
        email: student.email,
        courseInterested: student.courseInterested,
      },
      score,
      correctCount,
      totalQuestions: 20,
      maxScore: 100,
      isQualifiedForDemo,
      demoTicketCode: demoTicketCode || undefined,
      qrCodeDataUrl: qrCodeDataUrl || undefined,
      rewardDetails: isQualifiedForDemo
        ? {
            title: '1-Week Free Live Demo Batch Access',
            scholarship: '₹5,000 Direct Fee Waiver on Course Admission',
            location: 'WeGrow B-School Campus / Online Interactive Lab',
            schedule: 'Upcoming Batch: Starts Every Monday (9:30 AM & 6:00 PM)',
            instructions: 'Present this digital pass or QR code at reception to activate your batch access.',
          }
        : {
            title: 'Diwali Tech Participant Pass',
            benefit: 'Free AI & Coding Starter Toolkit + Campus Open-House Invitation',
          },
      answersReview: evaluatedAnswers.map((a) => ({
        questionId: a.questionId,
        isCorrect: a.isCorrect,
        selectedOption: a.selectedOption,
        correctOption: a.correctOption,
      })),
    };
  }

  // ============================================================
  // 4. VERIFY DEMO TICKET (CAMPUS DESK CHECK)
  // ============================================================
  async verifyTicket(ticketCode: string) {
    const cleanCode = ticketCode.trim().toUpperCase();
    const submission = await this.challengeModel.findOne({
      demoTicketCode: cleanCode,
    });

    if (!submission) {
      throw new NotFoundException(`No ticket found with code: ${cleanCode}`);
    }

    return {
      success: true,
      ticketCode: submission.demoTicketCode,
      isRedeemed: submission.isRedeemed,
      redeemedAt: submission.redeemedAt,
      redeemedBy: submission.redeemedBy,
      student: {
        name: submission.studentName,
        email: submission.email,
        mobileNo: submission.mobileNo,
        collegeOrSchool: submission.collegeOrSchool,
        courseInterested: submission.courseInterested,
        score: submission.score,
        correctCount: submission.correctCount,
        completedAt: submission.submittedAt,
      },
      benefit: {
        title: submission.benefitTitle,
        isQualified: submission.isQualifiedForDemo,
      },
    };
  }

  // ============================================================
  // 5. REDEEM DEMO TICKET (CAMPUS STAFF ACTION)
  // ============================================================
  async redeemTicket(dto: RedeemDemoTicketDto, staffName = 'Campus Front Desk') {
    const cleanCode = dto.ticketCode.trim().toUpperCase();
    const submission = await this.challengeModel.findOne({
      demoTicketCode: cleanCode,
    });

    if (!submission) {
      throw new NotFoundException(`Ticket ${cleanCode} does not exist.`);
    }

    if (submission.isRedeemed) {
      throw new BadRequestException(
        `Ticket ${cleanCode} was already redeemed on ${submission.redeemedAt?.toLocaleString()}.`,
      );
    }

    submission.isRedeemed = true;
    submission.redeemedAt = new Date();
    submission.redeemedBy = staffName;
    if (dto.staffNote) {
      submission.benefitTitle = `${submission.benefitTitle || ''} [Note: ${dto.staffNote}]`.trim();
    }
    await submission.save();

    return {
      success: true,
      message: `Demo Ticket ${cleanCode} successfully redeemed for ${submission.studentName}!`,
      studentName: submission.studentName,
      redeemedAt: submission.redeemedAt,
    };
  }

  // ============================================================
  // 6. ADMIN: GET ALL SUBMISSIONS (WITH SEARCH & FILTERS)
  // ============================================================
  async adminGetSubmissions(query: QueryDiwaliChallengeDto) {
    const filter: any = {};

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { studentName: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { mobileNo: { $regex: s, $options: 'i' } },
        { collegeOrSchool: { $regex: s, $options: 'i' } },
        { demoTicketCode: { $regex: s, $options: 'i' } },
      ];
    }

    if (query.course && query.course.trim()) {
      filter.courseInterested = { $regex: query.course.trim(), $options: 'i' };
    }

    if (query.isQualified !== undefined && query.isQualified !== '') {
      filter.isQualifiedForDemo = String(query.isQualified) === 'true';
    }

    if (query.isRedeemed !== undefined && query.isRedeemed !== '') {
      filter.isRedeemed = String(query.isRedeemed) === 'true';
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, submissions, totalQualified, totalRedeemed] =
      await Promise.all([
        this.challengeModel.countDocuments(filter),
        this.challengeModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.challengeModel.countDocuments({ isQualifiedForDemo: true }),
        this.challengeModel.countDocuments({ isRedeemed: true }),
      ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalEnrolled: await this.challengeModel.countDocuments(),
        totalAttempted: await this.challengeModel.countDocuments({ submittedAt: { $ne: null } }),
        totalQualified,
        totalRedeemed,
      },
      submissions,
    };
  }

  // ============================================================
  // 7. ADMIN STATS SUMMARY
  // ============================================================
  async adminGetStats() {
    const totalEnrolled = await this.challengeModel.countDocuments();
    const totalAttempted = await this.challengeModel.countDocuments({
      submittedAt: { $ne: null },
    });
    const totalQualified = await this.challengeModel.countDocuments({
      isQualifiedForDemo: true,
    });
    const totalRedeemed = await this.challengeModel.countDocuments({
      isRedeemed: true,
    });

    const averageScoreResult = await this.challengeModel.aggregate([
      { $match: { submittedAt: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } },
    ]);

    const courseBreakdown = await this.challengeModel.aggregate([
      { $group: { _id: '$courseInterested', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return {
      totalEnrolled,
      totalAttempted,
      totalQualified,
      totalRedeemed,
      qualificationRate: totalAttempted > 0 ? `${((totalQualified / totalAttempted) * 100).toFixed(1)}%` : '0%',
      averageScore: averageScoreResult.length > 0 ? Math.round(averageScoreResult[0].avgScore) : 0,
      courseBreakdown,
    };
  }

  // ============================================================
  // HELPER: SEND RESULT & DEMO PASS EMAIL VIA RESEND
  // ============================================================
  private async sendResultEmail(
    student: DiwaliChallengeDocument,
    score: number,
    correctCount: number,
    isQualified: boolean,
    demoTicketCode: string,
    qrCodeDataUrl: string,
  ) {
    try {
      if (!process.env.RESEND_API_KEY) {
        this.logger.warn(`No RESEND_API_KEY configured for challenge email: ${student.email}`);
        return;
      }

      const mailFrom =
        process.env.MAIL_FROM || 'WeGrow B School <noreply@wegrowbschool.in>';

      const headerTitle = isQualified
        ? '🎉 1-WEEK FREE DEMO PASS UNLOCKED!'
        : '🌟 DIWALI CODING CHALLENGE RESULT';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Diwali Challenge Result — WeGrow B-School</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0a0514;padding:30px 10px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#180e2b 0%,#0f071e 100%);border-radius:20px;border:1px solid #3d2366;overflow:hidden;box-shadow:0 16px 44px rgba(0,0,0,0.8);">
          
          <!-- Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 50%,#b45309 100%);padding:30px 24px;text-align:center;">
              <div style="font-size:32px;margin-bottom:6px;">🪔 ⚡ 💻</div>
              <div style="font-size:24px;font-weight:900;letter-spacing:1px;color:#ffffff;text-shadow:0 2px 4px rgba(0,0,0,0.3);">
                ${headerTitle}
              </div>
              <div style="font-size:13px;font-weight:700;color:#fffbeb;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">
                WeGrow B-School &bull; Campus Diwali Quest
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:34px 28px;text-align:center;">
              <p style="color:#94a3b8;font-size:16px;margin:0 0 10px;">
                Hello <strong style="color:#ffffff;">${student.studentName}</strong>,
              </p>
              <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Thank you for scanning the campus Diwali QR and completing the 20-Question Challenge!
              </p>

              <!-- Score Card -->
              <div style="background:#130b24;border:2px solid ${isQualified ? '#f59e0b' : '#64748b'};border-radius:16px;padding:22px;margin-bottom:26px;">
                <div style="font-size:12px;font-weight:800;color:${isQualified ? '#f59e0b' : '#94a3b8'};letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">
                  Your Final Challenge Score
                </div>
                <div style="font-size:42px;font-weight:900;color:#ffffff;font-family:monospace;">
                  ${score} <span style="font-size:20px;color:#94a3b8;">/ 100</span>
                </div>
                <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">
                  (${correctCount} out of 20 questions correct &bull; 5 marks each)
                </div>
              </div>

              ${
                isQualified
                  ? `
              <!-- Qualified Free Demo Ticket -->
              <div style="background:#090412;border:1px dashed #f59e0b;border-radius:14px;padding:20px;margin-bottom:26px;text-align:left;">
                <div style="font-size:16px;font-weight:900;color:#ffe066;margin-bottom:8px;">
                  🎟️ 1-Week Free Live Demo Pass Unlocked!
                </div>
                <div style="font-size:13px;color:#cbd5e1;line-height:1.6;margin-bottom:16px;">
                  Because you scored <strong>80 or higher</strong>, you have earned full access to a 1-Week Live Demo Batch in <strong>${student.courseInterested}</strong> + a ₹5,000 published course scholarship!
                </div>
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="60%" style="vertical-align:top;">
                      <div style="font-size:11px;font-weight:800;color:#f59e0b;text-transform:uppercase;">Demo Ticket Code</div>
                      <div style="font-size:20px;font-weight:900;color:#fff;font-family:monospace;margin:4px 0 10px;">${demoTicketCode}</div>
                      <div style="font-size:12px;color:#94a3b8;"><strong>Batch:</strong> Starts every Monday</div>
                      <div style="font-size:12px;color:#94a3b8;"><strong>Mode:</strong> Campus Lab / Live Interactive</div>
                    </td>
                    <td width="40%" align="center">
                      <img src="${qrCodeDataUrl}" alt="Demo QR Code" width="115" height="115" style="border-radius:8px;background:#fff;padding:4px;" />
                    </td>
                  </tr>
                </table>
              </div>
              `
                  : `
              <!-- Non-Qualified Encouragement Card -->
              <div style="background:#0e061a;border-radius:14px;padding:18px;margin-bottom:24px;text-align:left;">
                <div style="font-size:14px;font-weight:800;color:#ffe066;margin-bottom:6px;">
                  🎁 Special Participation Perk:
                </div>
                <div style="font-size:13px;color:#cbd5e1;line-height:1.5;">
                  You were close! Visit the WeGrow B-School Innovation Lab this week with this email to get your free AI starter kit and a personalized profile review with our mentors.
                </div>
              </div>
              `
              }

              <!-- Campus Location Info -->
              <div style="text-align:left;background:#140c24;border-radius:12px;padding:18px;border-left:4px solid #f59e0b;">
                <div style="font-size:14px;font-weight:800;color:#ffffff;margin-bottom:6px;">📍 WeGrow B-School Campus</div>
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                  Innovation &amp; Leadership Hub, Bengaluru / Chennai<br />
                  Helpline: +91 98400 12345 &bull; <a href="https://www.wegrowbschool.in" style="color:#f59e0b;text-decoration:none;">www.wegrowbschool.in</a>
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#06020c;padding:18px 24px;text-align:center;border-top:1px solid #1f1138;font-size:11px;color:#64748b;">
              &copy; 2026 WeGrow B-School. Scan the Diwali QR Campus Skill Drive.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await this.resend.emails.send({
        from: mailFrom,
        to: [student.email],
        subject: isQualified
          ? `🎉 You Scored ${score}/100! Your 1-Week Free Live Demo Pass — WeGrow B-School`
          : `🌟 Your Diwali Challenge Score: ${score}/100 — WeGrow B-School`,
        html,
      });

      this.logger.log(`Challenge result email sent to ${student.email}`);
    } catch (err) {
      this.logger.error(`Failed to send challenge email to ${student.email}`, err);
    }
  }
}
