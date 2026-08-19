import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

import { Certificate, CertificateDocument } from './schemas/certificate.schema';

import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../bookings/schemas/booking.schema';

import { Event, EventDocument } from '../events/schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

import { generateCertificateHtml } from './certificate.template';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  private readonly certDir: string;

  constructor(
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,

    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,

    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly notificationsService: NotificationsService,
  ) {
    // --------------------------------------------------------
    // ENSURE CERTIFICATE DIRECTORY EXISTS
    // --------------------------------------------------------

    this.certDir = path.resolve(
      process.env.CERTIFICATES_PATH || './uploads/certificates',
    );

    if (!fs.existsSync(this.certDir)) {
      fs.mkdirSync(this.certDir, { recursive: true });
      this.logger.log(`Created certificate directory: ${this.certDir}`);
    }
  }

  // ============================================================
  // GENERATE UNIQUE CERTIFICATE NUMBER
  // ============================================================

  private async generateCertNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const count = await this.certificateModel.countDocuments();

    const serial = String(count + 1).padStart(5, '0');

    return `WEGROW-${year}-${serial}`;
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-IN', { month: 'long' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // ============================================================
  // GENERATE PDF FROM HTML
  // ============================================================

  private async generatePdf(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      await page.pdf({
        path: outputPath,
        width: '1123px',
        height: '794px',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
    } finally {
      await browser.close();
    }
  }

  // ============================================================
  // ADMIN: GENERATE CERTIFICATES FOR ALL ATTENDEES OF AN EVENT
  // POST /certificates/generate/:eventId
  // ============================================================

  async generateCertificatesForEvent(eventId: string) {
    try {
      // --------------------------------------------------------
      // 1. FIND EVENT
      // --------------------------------------------------------

      if (!Types.ObjectId.isValid(eventId)) {
        throw new NotFoundException('Invalid event ID');
      }

      const event = await this.eventModel.findById(eventId);

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // --------------------------------------------------------
      // 2. FIND ALL CONFIRMED BOOKINGS FOR THIS EVENT
      // --------------------------------------------------------

      const bookings = await this.bookingModel
        .find({
          event: new Types.ObjectId(eventId),
          status: BookingStatus.CONFIRMED,
          isActive: true,
        })
        .populate('user', 'firstName lastName email')
        .lean();

      if (bookings.length === 0) {
        return {
          success: true,
          message: 'No confirmed attendees found for this event',
          generated: 0,
          certificates: [],
        };
      }

      this.logger.log(
        `Generating certificates for ${bookings.length} attendees of event: ${event.title}`,
      );

      // --------------------------------------------------------
      // 3. GENERATE CERTIFICATE FOR EACH ATTENDEE
      // --------------------------------------------------------

      const generated: any[] = [];
      const failed: any[] = [];

      for (const booking of bookings) {
        try {
          const user = booking.user as any;

          if (!user) continue;

          const userName =
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            'Participant';

          // Check if certificate already issued for this booking
          const existing = await this.certificateModel.findOne({
            bookingId: booking._id,
          });

          if (existing) {
            generated.push({
              certificateId: existing._id,
              userId: user._id,
              name: userName,
              status: 'already_exists',
            });
            continue;
          }

          // Generate unique certificate number
          const certNumber = await this.generateCertNumber();

          // Dates
          const eventDate = this.formatDate(event.date);
          const issuedDate = this.formatDate(new Date());

          // Generate HTML
          const html = generateCertificateHtml({
            certificateNumber: certNumber,
            recipientName: userName,
            eventTitle: event.title,
            eventDate,
            issuedDate,
          });

          // File path
          const fileName = `${certNumber}.pdf`;
          const filePath = path.join(this.certDir, fileName);

          // Generate PDF
          await this.generatePdf(html, filePath);

          this.logger.log(`Certificate PDF generated: ${fileName}`);

          // Save to DB
          const certificate = await this.certificateModel.create({
            userId: new Types.ObjectId(user._id.toString()),
            eventId: new Types.ObjectId(eventId),
            bookingId: new Types.ObjectId(booking._id.toString()),
            certificateNumber: certNumber,
            recipientName: userName,
            eventTitle: event.title,
            eventDate: event.date,
            issuedDate: new Date(),
            filePath: filePath,
            isDownloaded: false,
            isActive: true,
          });

          // Send in-app notification
          try {
            await this.notificationsService.createCertificateNotification(
              user._id.toString(),
              eventId,
              event.title,
              userName,
            );
          } catch (err) {
            this.logger.error(
              `Failed to send certificate notification to user ${user._id}`,
              err instanceof Error ? err.stack : String(err),
            );
          }

          // Send email notification
          if (user.email) {
            this.notificationsService
              .sendCertificateEmail(
                user.email,
                userName,
                event.title,
                certNumber,
                issuedDate,
              )
              .catch((err) => {
                this.logger.error(
                  `Failed to send certificate email to ${user.email}`,
                  err instanceof Error ? err.stack : String(err),
                );
              });
          }

          generated.push({
            certificateId: certificate._id,
            certificateNumber: certNumber,
            userId: user._id,
            name: userName,
            status: 'generated',
          });
        } catch (innerErr) {
          this.logger.error(
            `Failed to generate certificate for booking ${booking._id}`,
            innerErr instanceof Error ? innerErr.stack : String(innerErr),
          );

          failed.push({
            bookingId: booking._id,
            error:
              innerErr instanceof Error ? innerErr.message : String(innerErr),
          });
        }
      }

      // --------------------------------------------------------
      // 4. RETURN SUMMARY
      // --------------------------------------------------------

      return {
        success: true,
        message: `Certificates processed for event: ${event.title}`,
        event: {
          id: event._id,
          title: event.title,
          date: event.date,
        },
        total: bookings.length,
        generated: generated.filter((g) => g.status === 'generated').length,
        alreadyExisted: generated.filter((g) => g.status === 'already_exists')
          .length,
        failed: failed.length,
        certificates: generated,
        errors: failed,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        'Failed to generate certificates',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to generate certificates');
    }
  }

  // ============================================================
  // ADMIN: ALL CERTIFICATES
  // GET /certificates
  // ============================================================

  async findAll(page = 1, limit = 10, eventId?: string) {
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter: any = { isActive: true };

    if (eventId && Types.ObjectId.isValid(eventId)) {
      filter.eventId = new Types.ObjectId(eventId);
    }

    const skip = (page - 1) * limit;

    const [certificates, total] = await Promise.all([
      this.certificateModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('eventId', 'title date')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.certificateModel.countDocuments(filter),
    ]);

    return {
      success: true,
      certificates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // ADMIN: CERTIFICATES BY EVENT
  // GET /certificates/event/:eventId
  // ============================================================

  async findByEvent(eventId: string) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundException('Invalid event ID');
    }

    const certificates = await this.certificateModel
      .find({ eventId: new Types.ObjectId(eventId), isActive: true })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, certificates };
  }

  // ============================================================
  // USER: MY CERTIFICATES
  // GET /certificates/my
  // ============================================================

  async findMyCertificates(userId: string) {
    const certificates = await this.certificateModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .populate('eventId', 'title date location image')
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, certificates };
  }

  // ============================================================
  // USER: DOWNLOAD CERTIFICATE
  // GET /certificates/download/:id
  // Returns the file path for streaming
  // ============================================================

  async downloadCertificate(
    certificateId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{ filePath: string; fileName: string; certNumber: string }> {
    if (!Types.ObjectId.isValid(certificateId)) {
      throw new NotFoundException('Invalid certificate ID');
    }

    const filter: any = {
      _id: new Types.ObjectId(certificateId),
      isActive: true,
    };

    // Non-admin can only download their own
    if (!isAdmin) {
      filter.userId = new Types.ObjectId(userId);
    }

    const certificate = await this.certificateModel.findOne(filter);

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (!certificate.filePath || !fs.existsSync(certificate.filePath)) {
      throw new NotFoundException('Certificate file not found on server');
    }

    // Mark as downloaded
    if (!certificate.isDownloaded) {
      certificate.isDownloaded = true;
      await certificate.save();
    }

    const fileName = `Certificate_${certificate.certificateNumber}.pdf`;

    return {
      filePath: certificate.filePath,
      fileName,
      certNumber: certificate.certificateNumber,
    };
  }
}
