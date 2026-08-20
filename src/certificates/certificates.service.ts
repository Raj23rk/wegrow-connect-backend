import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Certificate,
  CertificateDocument,
} from './schemas/certificate.schema';

import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../bookings/schemas/booking.schema';

import { Event, EventDocument } from '../events/schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

import {
  generateCertificateHtml,
  CertificateTemplateData,
} from './certificate.template';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

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
  ) {}

  // ============================================================
  // GENERATE UNIQUE CERTIFICATE NUMBER
  // Format: WEGROW-YYYY-XXXXX
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
  // ADMIN: CREATE SINGLE CERTIFICATE FOR A USER
  // ============================================================

  async createSingleCertificate(dto: CreateCertificateDto) {
    try {
      if (!dto.userId || !Types.ObjectId.isValid(dto.userId)) {
        throw new BadRequestException('Invalid user ID');
      }

      if (!dto.eventId || !Types.ObjectId.isValid(dto.eventId)) {
        throw new BadRequestException('Invalid event ID');
      }

      const user = await this.userModel.findById(dto.userId).lean();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const event = await this.eventModel.findById(dto.eventId).lean();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const recipientName =
        dto.recipientName ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Participant';

      const eventTitle = dto.eventTitle || event.title;
      const certNumber = await this.generateCertNumber();

      const eventDate = dto.eventDate ? new Date(dto.eventDate) : event.date || new Date();
      const issuedDate = dto.issuedDate ? new Date(dto.issuedDate) : new Date();

      const certificateData: any = {
        userId: new Types.ObjectId(dto.userId),
        eventId: new Types.ObjectId(dto.eventId),
        bookingId:
          dto.bookingId && Types.ObjectId.isValid(dto.bookingId)
            ? new Types.ObjectId(dto.bookingId)
            : undefined,
        certificateNumber: certNumber,
        recipientName,
        eventTitle,
        description:
          dto.description ||
          'Has demonstrated strong proficiency in responsive design, UI design, and front-end development through full event participation.',
        grade: dto.grade || 'A+',
        startYear: dto.startYear || String(new Date(eventDate).getFullYear()),
        endYear: dto.endYear || String(new Date(eventDate).getFullYear()),
        eventDate,
        issuedDate,
        isDownloaded: false,
        isActive: true,
      };

      const certificate = await this.certificateModel.create(certificateData);

      // Send notification
      try {
        await this.notificationsService.createCertificateNotification(
          dto.userId,
          dto.eventId,
          eventTitle,
          recipientName,
        );
      } catch (err) {
        this.logger.error(
          `Failed to create notification for user ${dto.userId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }

      // Send email if user has email
      if (user.email) {
        this.notificationsService
          .sendCertificateEmail(
            user.email,
            recipientName,
            eventTitle,
            certNumber,
            this.formatDate(issuedDate),
          )
          .catch((err) => {
            this.logger.error(
              `Failed to send certificate email to ${user.email}`,
              err instanceof Error ? err.stack : String(err),
            );
          });
      }

      const populated = await this.certificateModel
        .findById((certificate as any)._id)
        .populate('userId', 'firstName lastName email phone name role')
        .populate('eventId', 'title description image location date price type')
        .populate('bookingId', 'status isActive createdAt')
        .lean();

      return populated;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to create certificate',
      );
    }
  }

  // ============================================================
  // ADMIN: GENERATE CERTIFICATES FOR ALL ATTENDEES OF AN EVENT
  // POST /certificates/generate/:eventId
  // ============================================================

  async generateCertificatesForEvent(eventId: string) {
    try {
      if (!Types.ObjectId.isValid(eventId)) {
        throw new BadRequestException('Invalid event ID');
      }

      const event = await this.eventModel.findById(eventId);
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Find all confirmed or active bookings for this event
      const bookings = await this.bookingModel
        .find({
          event: new Types.ObjectId(eventId),
          isActive: true,
        })
        .populate('user', 'firstName lastName email phone name')
        .lean();

      if (bookings.length === 0) {
        return {
          success: true,
          message: 'No attendees found for this event',
          generated: 0,
          certificates: [],
        };
      }

      this.logger.log(
        `Generating certificates for ${bookings.length} attendees of event: ${event.title}`,
      );

      const generated: any[] = [];
      const failed: any[] = [];

      for (const booking of bookings) {
        try {
          const user = booking.user as any;
          if (!user) continue;

          const userName =
            user.name ||
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            'Participant';

          // Check if certificate already exists for this booking/user for event
          const existing = await this.certificateModel.findOne({
            userId: user._id,
            eventId: new Types.ObjectId(eventId),
            isActive: true,
          });

          if (existing) {
            generated.push({
              certificateId: existing._id,
              certificateNumber: existing.certificateNumber,
              userId: user._id,
              name: userName,
              status: 'already_exists',
            });
            continue;
          }

          const certNumber = await this.generateCertNumber();
          const yearStr = String(new Date(event.date || Date.now()).getFullYear());

          const certificate = await this.certificateModel.create({
            userId: new Types.ObjectId(user._id.toString()),
            eventId: new Types.ObjectId(eventId),
            bookingId: new Types.ObjectId(booking._id.toString()),
            certificateNumber: certNumber,
            recipientName: userName,
            eventTitle: event.title,
            description:
              'Has demonstrated strong proficiency in responsive design, UI design, and front-end development through full event participation.',
            grade: 'A+',
            startYear: yearStr,
            endYear: yearStr,
            eventDate: event.date || new Date(),
            issuedDate: new Date(),
            isDownloaded: false,
            isActive: true,
          });

          // Send notification
          try {
            await this.notificationsService.createCertificateNotification(
              user._id.toString(),
              eventId,
              event.title,
              userName,
            );
          } catch (err) {
            this.logger.error(
              `Failed to send notification for ${user._id}`,
              err instanceof Error ? err.stack : String(err),
            );
          }

          // Send email
          if (user.email) {
            this.notificationsService
              .sendCertificateEmail(
                user.email,
                userName,
                event.title,
                certNumber,
                this.formatDate(new Date()),
              )
              .catch((err) => {
                this.logger.error(
                  `Failed to send email to ${user.email}`,
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
          failed.push({
            bookingId: booking._id,
            error:
              innerErr instanceof Error ? innerErr.message : String(innerErr),
          });
        }
      }

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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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
  // ADMIN: FIND ALL CERTIFICATES (PAGINATED WITH SEARCH)
  // ============================================================

  async findAll(page = 1, limit = 10, search?: string, eventId?: string) {
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter: any = { isActive: true };

    if (eventId && Types.ObjectId.isValid(eventId)) {
      filter.eventId = new Types.ObjectId(eventId);
    }

    let certificates = await this.certificateModel
      .find(filter)
      .populate('userId', 'firstName lastName email phone name role')
      .populate('eventId', 'title description image location date price type')
      .populate('bookingId', 'status isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Format aliases and names
    certificates = certificates.map((cert: any) => {
      if (cert.userId) {
        const firstName = cert.userId.firstName || '';
        const lastName = cert.userId.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        cert.userId.name = cert.userId.name || fullName || cert.recipientName || 'User';
        cert.user = cert.userId;
      }
      if (cert.eventId) {
        cert.event = cert.eventId;
      }
      if (cert.bookingId) {
        cert.booking = cert.bookingId;
      }

      // Attach generated HTML string for frontend rendering convenience
      cert.html = generateCertificateHtml({
        certificateNumber: cert.certificateNumber,
        recipientName: cert.recipientName,
        eventTitle: cert.eventTitle,
        description: cert.description,
        grade: cert.grade,
        startYear: cert.startYear,
        endYear: cert.endYear,
        eventDate: this.formatDate(cert.eventDate),
        issuedDate: this.formatDate(cert.issuedDate),
      });

      return cert;
    });

    if (search && search.trim()) {
      const searchText = search.trim().toLowerCase();
      certificates = certificates.filter((cert: any) => {
        const recipient = cert.recipientName?.toLowerCase() || '';
        const userName = cert.user?.name?.toLowerCase() || '';
        const email = cert.user?.email?.toLowerCase() || '';
        const certNum = cert.certificateNumber?.toLowerCase() || '';
        const eventTitle = cert.eventTitle?.toLowerCase() || '';

        return (
          recipient.includes(searchText) ||
          userName.includes(searchText) ||
          email.includes(searchText) ||
          certNum.includes(searchText) ||
          eventTitle.includes(searchText)
        );
      });
    }

    const total = certificates.length;
    const skip = (page - 1) * limit;
    const paginatedCertificates = certificates.slice(skip, skip + limit);

    return {
      success: true,
      certificates: paginatedCertificates,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // USER (STUDENT / BUSINESS): MY CERTIFICATES
  // ============================================================

  async findMyCertificates(
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
  ) {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter: any = {
      userId: new Types.ObjectId(userId),
      isActive: true,
    };

    let certificates = await this.certificateModel
      .find(filter)
      .populate('userId', 'firstName lastName email phone name role')
      .populate('eventId', 'title description image location date price type')
      .populate('bookingId', 'status isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    certificates = certificates.map((cert: any) => {
      if (cert.userId) {
        const firstName = cert.userId.firstName || '';
        const lastName = cert.userId.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        cert.userId.name = cert.userId.name || fullName || cert.recipientName || 'User';
        cert.user = cert.userId;
      }
      if (cert.eventId) {
        cert.event = cert.eventId;
      }
      if (cert.bookingId) {
        cert.booking = cert.bookingId;
      }

      // Generate exact HTML template for viewing/downloading on frontend
      cert.html = generateCertificateHtml({
        certificateNumber: cert.certificateNumber,
        recipientName: cert.recipientName,
        eventTitle: cert.eventTitle,
        description: cert.description,
        grade: cert.grade,
        startYear: cert.startYear,
        endYear: cert.endYear,
        eventDate: this.formatDate(cert.eventDate),
        issuedDate: this.formatDate(cert.issuedDate),
      });

      return cert;
    });

    if (search && search.trim()) {
      const searchText = search.trim().toLowerCase();
      certificates = certificates.filter((cert: any) => {
        const certNum = cert.certificateNumber?.toLowerCase() || '';
        const eventTitle = cert.eventTitle?.toLowerCase() || '';
        return (
          certNum.includes(searchText) || eventTitle.includes(searchText)
        );
      });
    }

    const total = certificates.length;
    const skip = (page - 1) * limit;
    const paginatedCertificates = certificates.slice(skip, skip + limit);

    return {
      success: true,
      certificates: paginatedCertificates,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // FIND SINGLE CERTIFICATE BY ID
  // ============================================================

  async findOne(certificateId: string, userId?: string, isAdmin?: boolean) {
    if (!Types.ObjectId.isValid(certificateId)) {
      throw new NotFoundException('Invalid certificate ID');
    }

    const cert: any = await this.certificateModel
      .findById(certificateId)
      .populate('userId', 'firstName lastName email phone name role')
      .populate('eventId', 'title description image location date price type')
      .populate('bookingId', 'status isActive createdAt')
      .lean();

    if (!cert || !cert.isActive) {
      throw new NotFoundException('Certificate not found');
    }

    if (!isAdmin && userId && cert.userId._id.toString() !== userId) {
      throw new ForbiddenException('Access denied to this certificate');
    }

    if (cert.userId) {
      const firstName = cert.userId.firstName || '';
      const lastName = cert.userId.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      cert.userId.name = cert.userId.name || fullName || cert.recipientName || 'User';
      cert.user = cert.userId;
    }

    if (cert.eventId) {
      cert.event = cert.eventId;
    }

    if (cert.bookingId) {
      cert.booking = cert.bookingId;
    }

    cert.html = generateCertificateHtml({
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      eventTitle: cert.eventTitle,
      description: cert.description,
      grade: cert.grade,
      startYear: cert.startYear,
      endYear: cert.endYear,
      eventDate: this.formatDate(cert.eventDate),
      issuedDate: this.formatDate(cert.issuedDate),
    });

    return cert;
  }
}
