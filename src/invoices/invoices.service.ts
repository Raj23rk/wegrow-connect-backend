import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Invoice,
  InvoiceDocument,
  InvoiceStatus,
} from './schemas/invoice.schema';

import { User, UserDocument } from '../users/schemas/user.schema';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';

import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,

    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
  ) {}

  // ============================================================
  // GENERATE UNIQUE INVOICE NUMBER
  // Format: INV-YYYY-XXXXX
  // ============================================================

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceModel.countDocuments();
    const serial = String(count + 1).padStart(5, '0');
    return `INV-${year}-${serial}`;
  }

  // ============================================================
  // ADMIN: CREATE INVOICE
  // ============================================================

  async createInvoice(dto: CreateInvoiceDto) {
    try {
      // --------------------------------------------------------
      // 1. VALIDATE USER ID
      // --------------------------------------------------------

      if (!dto.userId) {
        throw new BadRequestException('User ID is required');
      }

      if (!Types.ObjectId.isValid(dto.userId)) {
        throw new BadRequestException(`Invalid user ID: ${dto.userId}`);
      }

      const user = await this.userModel.findById(dto.userId).lean();

      if (!user) {
        throw new NotFoundException(`User not found with ID: ${dto.userId}`);
      }

      // --------------------------------------------------------
      // 2. VALIDATE EVENT ID (IF PROVIDED)
      // --------------------------------------------------------

      let eventIdObj: Types.ObjectId | null = null;
      let eventTitle = dto.title || '';

      if (dto.eventId) {
        if (!Types.ObjectId.isValid(dto.eventId)) {
          throw new BadRequestException(`Invalid event ID: ${dto.eventId}`);
        }
        const event = await this.eventModel.findById(dto.eventId).lean();
        if (event) {
          eventIdObj = new Types.ObjectId(dto.eventId);
          if (!eventTitle) {
            eventTitle = `Invoice for ${event.title}`;
          }
        }
      }

      // --------------------------------------------------------
      // 3. VALIDATE BOOKING ID (IF PROVIDED)
      // --------------------------------------------------------

      let bookingIdObj: Types.ObjectId | null = null;

      if (dto.bookingId) {
        if (!Types.ObjectId.isValid(dto.bookingId)) {
          throw new BadRequestException(`Invalid booking ID: ${dto.bookingId}`);
        }
        const booking = await this.bookingModel.findById(dto.bookingId).lean();
        if (booking) {
          bookingIdObj = new Types.ObjectId(dto.bookingId);
          if (!eventIdObj && booking.event) {
            eventIdObj = new Types.ObjectId(booking.event.toString());
            const event = await this.eventModel.findById(booking.event).lean();
            if (event && !eventTitle) {
              eventTitle = `Invoice for ${event.title}`;
            }
          }
        }
      }

      // --------------------------------------------------------
      // 4. PROCESS ITEMS & AMOUNT CALCULATIONS
      // --------------------------------------------------------

      let items: any[] = [];
      let subtotal = 0;

      if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
        items = dto.items.map((item) => {
          const quantity = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          const itemAmount =
            item.amount !== undefined
              ? Number(item.amount)
              : Math.round(quantity * unitPrice * 100) / 100;

          return {
            description: item.description || 'Service',
            quantity,
            unitPrice,
            amount: itemAmount,
          };
        });

        subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      } else {
        const fallbackAmount =
          dto.amount !== undefined
            ? Number(dto.amount)
            : dto.total !== undefined
              ? Number(dto.total)
              : 0;

        subtotal = fallbackAmount;

        items = [
          {
            description:
              dto.title || dto.description || 'Event Registration Fee',
            quantity: 1,
            unitPrice: fallbackAmount,
            amount: fallbackAmount,
          },
        ];
      }

      const taxPercent =
        dto.taxPercent !== undefined ? Number(dto.taxPercent) : 0;
      const tax =
        dto.tax !== undefined
          ? Number(dto.tax)
          : Math.round(((subtotal * taxPercent) / 100) * 100) / 100;
      const discount = dto.discount !== undefined ? Number(dto.discount) : 0;

      const total =
        dto.total !== undefined
          ? Number(dto.total)
          : Math.round((subtotal + tax - discount) * 100) / 100;

      // --------------------------------------------------------
      // 5. GENERATE INVOICE NUMBER
      // --------------------------------------------------------

      const invoiceNumber = await this.generateInvoiceNumber();

      // --------------------------------------------------------
      // 6. DATES & STATUS
      // --------------------------------------------------------

      const issuedDate = dto.issuedDate ? new Date(dto.issuedDate) : new Date();
      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : new Date(issuedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const status = dto.status || InvoiceStatus.PAID;

      // --------------------------------------------------------
      // 7. CREATE INVOICE RECORD
      // --------------------------------------------------------

      const invoiceData: any = {
        userId: new Types.ObjectId(dto.userId),
        eventId: eventIdObj,
        bookingId: bookingIdObj,
        subscriptionId:
          dto.subscriptionId && Types.ObjectId.isValid(dto.subscriptionId)
            ? new Types.ObjectId(dto.subscriptionId)
            : null,
        invoiceNumber,
        title: eventTitle || 'Event Invoice',
        description: dto.description || '',
        items,
        subtotal,
        taxPercent,
        tax,
        discount,
        total,
        currency: dto.currency || 'INR',
        status,
        paymentMethod: dto.paymentMethod || 'ONLINE',
        notes: dto.notes || '',
        issuedDate,
        dueDate,
        paidAt: status === InvoiceStatus.PAID ? new Date() : null,
        isActive: true,
      };

      const createdInvoice = await this.invoiceModel.create(invoiceData);

      this.logger.log(
        `Invoice created successfully: ${createdInvoice.invoiceNumber}`,
      );

      // Populate user, event, booking for response
      const populatedInvoice = await this.invoiceModel
        .findById(createdInvoice._id)
        .populate('userId', 'firstName lastName email phone role name')
        .populate('eventId', 'title description image location date price type')
        .populate('bookingId', 'status isActive createdAt')
        .lean();

      return populatedInvoice;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        'Failed to create invoice',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to create invoice',
      );
    }
  }

  // ============================================================
  // ADMIN: FIND ALL INVOICES (PAGINATED WITH SEARCH)
  // ============================================================

  async findAll(page = 1, limit = 10, search?: string, status?: string) {
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter: any = { isActive: true };

    if (status && status.trim()) {
      filter.status = status.trim().toUpperCase();
    }

    let invoices = await this.invoiceModel
      .find(filter)
      .populate('userId', 'firstName lastName email phone name role')
      .populate('eventId', 'title description image location date price type')
      .populate('bookingId', 'status isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Format user names
    invoices = invoices.map((inv: any) => {
      if (inv.userId) {
        const firstName = inv.userId.firstName || '';
        const lastName = inv.userId.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        inv.userId.name = inv.userId.name || fullName || 'User';
        inv.user = inv.userId; // alias user for consistency
      }
      if (inv.eventId) {
        inv.event = inv.eventId; // alias event for consistency
      }
      if (inv.bookingId) {
        inv.booking = inv.bookingId; // alias booking
      }
      return inv;
    });

    // Search filter
    if (search && search.trim()) {
      const searchText = search.trim().toLowerCase();
      invoices = invoices.filter((inv: any) => {
        const userName = inv.user?.name?.toLowerCase() || '';
        const email = inv.user?.email?.toLowerCase() || '';
        const phone = inv.user?.phone?.toLowerCase() || '';
        const invNum = inv.invoiceNumber?.toLowerCase() || '';
        const title = inv.title?.toLowerCase() || '';
        const eventTitle = inv.event?.title?.toLowerCase() || '';

        return (
          userName.includes(searchText) ||
          email.includes(searchText) ||
          phone.includes(searchText) ||
          invNum.includes(searchText) ||
          title.includes(searchText) ||
          eventTitle.includes(searchText)
        );
      });
    }

    const total = invoices.length;
    const paidCount = invoices.filter(
      (inv: any) => inv.status === InvoiceStatus.PAID,
    ).length;
    const pendingCount = invoices.filter(
      (inv: any) => inv.status === InvoiceStatus.PENDING,
    ).length;
    const issuedCount = invoices.filter(
      (inv: any) => inv.status === InvoiceStatus.ISSUED,
    ).length;
    const cancelledCount = invoices.filter(
      (inv: any) => inv.status === InvoiceStatus.CANCELLED,
    ).length;

    const skip = (page - 1) * limit;
    const paginatedInvoices = invoices.slice(skip, skip + limit);

    return {
      success: true,
      invoices: paginatedInvoices,
      counts: {
        total,
        paid: paidCount,
        pending: pendingCount,
        issued: issuedCount,
        cancelled: cancelledCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // USER (STUDENT / BUSINESS): MY INVOICES
  // ============================================================

  async findMyInvoices(
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

    let invoices = await this.invoiceModel
      .find(filter)
      .populate('userId', 'firstName lastName email phone name role')
      .populate('eventId', 'title description image location date price type')
      .populate('bookingId', 'status isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Format user & event aliases
    invoices = invoices.map((inv: any) => {
      if (inv.userId) {
        const firstName = inv.userId.firstName || '';
        const lastName = inv.userId.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        inv.userId.name = inv.userId.name || fullName || 'User';
        inv.user = inv.userId;
      }
      if (inv.eventId) {
        inv.event = inv.eventId;
      }
      if (inv.bookingId) {
        inv.booking = inv.bookingId;
      }
      return inv;
    });

    if (search && search.trim()) {
      const searchText = search.trim().toLowerCase();
      invoices = invoices.filter((inv: any) => {
        const invNum = inv.invoiceNumber?.toLowerCase() || '';
        const title = inv.title?.toLowerCase() || '';
        const eventTitle = inv.event?.title?.toLowerCase() || '';

        return (
          invNum.includes(searchText) ||
          title.includes(searchText) ||
          eventTitle.includes(searchText)
        );
      });
    }

    const total = invoices.length;
    const skip = (page - 1) * limit;
    const paginatedInvoices = invoices.slice(skip, skip + limit);

    return {
      success: true,
      invoices: paginatedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // FIND SINGLE INVOICE BY ID
  // ============================================================

  async findOne(invoiceId: string, userId?: string, isAdmin?: boolean) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new NotFoundException('Invalid invoice ID');
    }

    const invoice: any = await this.invoiceModel
      .findById(invoiceId)
      .populate('userId', 'firstName lastName email phone name role')
      .populate('eventId', 'title description image location date price type')
      .populate('bookingId', 'status isActive createdAt')
      .lean();

    if (!invoice || !invoice.isActive) {
      throw new NotFoundException('Invoice not found');
    }

    // Check ownership if not admin
    if (!isAdmin && userId && invoice.userId._id.toString() !== userId) {
      throw new ForbiddenException('Access denied to this invoice');
    }

    if (invoice.userId) {
      const firstName = invoice.userId.firstName || '';
      const lastName = invoice.userId.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      invoice.userId.name = invoice.userId.name || fullName || 'User';
      invoice.user = invoice.userId;
    }

    if (invoice.eventId) {
      invoice.event = invoice.eventId;
    }

    if (invoice.bookingId) {
      invoice.booking = invoice.bookingId;
    }

    return invoice;
  }
}