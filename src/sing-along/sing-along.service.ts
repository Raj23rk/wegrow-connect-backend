import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SingAlongBooking,
  SingAlongBookingDocument,
  SingAlongBookingStatus,
} from './schemas/sing-along-booking.schema';
import { CreateSingAlongBookingDto } from './dto/create-sing-along-booking.dto';
import { QuerySingAlongBookingDto } from './dto/query-sing-along-booking.dto';
import { UpdateSingAlongBookingDto } from './dto/update-sing-along-booking.dto';
import { Response } from 'express';

@Injectable()
export class SingAlongService {
  constructor(
    @InjectModel(SingAlongBooking.name)
    private readonly bookingModel: Model<SingAlongBookingDocument>,
  ) {}

  /**
   * Generate sequential booking ID starting from SA26-001 (e.g. SA26-001, SA26-002, ...)
   */
  private async generateBookingId(): Promise<string> {
    const recentBookings = await this.bookingModel
      .find({ bookingId: { $regex: /^SA26-\d+$/i } })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('bookingId')
      .lean();

    let maxNum = 0;
    for (const b of recentBookings) {
      const match = b.bookingId?.match(/^SA26-(\d+)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    }

    const count = await this.bookingModel.countDocuments();
    if (count > maxNum) {
      maxNum = count;
    }

    let nextNum = maxNum + 1;
    let candidate = `SA26-${String(nextNum).padStart(3, '0')}`;

    while (await this.bookingModel.exists({ bookingId: candidate })) {
      nextNum += 1;
      candidate = `SA26-${String(nextNum).padStart(3, '0')}`;
    }

    return candidate;
  }

  // =========================================================================
  // BOOK TICKETS (PUBLIC)
  // Single-round-trip Mongo create with duplicate bookingId collision retry
  // =========================================================================
  async bookTicket(dto: CreateSingAlongBookingDto) {
    const fullName = (dto.fullName || '').trim();
    if (!fullName) {
      throw new BadRequestException('Full name is required.');
    }

    const phone = (dto.phone || '').trim();
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      throw new BadRequestException(
        'A valid 10-digit Indian mobile / WhatsApp number is required.',
      );
    }

    const ticketQty = Math.max(1, Math.min(10, Number(dto.ticketQty) || 1));
    const unitPrice = 199;
    const totalAmount = ticketQty * unitPrice;
    const utr = (dto.utr || '').trim();
    const eventId = (dto.eventId || 'SINGALONG-SEP-13-2026').trim();
    const email = dto.email ? dto.email.toLowerCase().trim() : '';

    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const bookingId = await this.generateBookingId();

      try {
        const newBooking = await this.bookingModel.create({
          bookingId,
          fullName,
          phone,
          email,
          ticketQty,
          unitPrice,
          totalAmount,
          utr,
          paymentScreenshot: dto.paymentScreenshot || '',
          paymentMethod:
            dto.paymentMethod ||
            (utr && utr.startsWith('pay_')
              ? 'RAZORPAY'
              : 'kumarrk23dev-1@okaxis'),
          status: dto.status || SingAlongBookingStatus.CONFIRMED,
          eventId,
          attended: false,
          isActive: true,
          notes:
            dto.notes ||
            (utr && utr.startsWith('pay_')
              ? `Paid via Razorpay (${utr})`
              : 'UPI QR Payment'),
        });


        return {
          id: newBooking._id,
          bookingId: newBooking.bookingId,
          fullName: newBooking.fullName,
          phone: newBooking.phone,
          email: newBooking.email,
          ticketQty: newBooking.ticketQty,
          unitPrice: newBooking.unitPrice,
          totalAmount: newBooking.totalAmount,
          utr: newBooking.utr,
          status: newBooking.status,
          eventId: newBooking.eventId,
          verificationToken: `SINGALONG-VERIFY:${newBooking.bookingId}`,
          createdAt: (newBooking as any).createdAt,
        };
      } catch (err: any) {
        if (err.code === 11000) {
          const keyPattern = err.keyPattern || {};
          if (keyPattern.bookingId) {
            // Collision on bookingId, retry with fresh ID
            continue;
          }
        }
        throw err;
      }
    }

    throw new InternalServerErrorException(
      'Could not generate a unique booking reference. Please try again.',
    );
  }

  // =========================================================================
  // VERIFY BOOKING BY BOOKING ID OR MONGODB _ID (PUBLIC / SCANNER)
  // =========================================================================
  async verifyBooking(idOrBookingId: string) {
    const term = (idOrBookingId || '').trim();
    if (!term) {
      throw new BadRequestException('Booking identifier is required.');
    }

    // Clean up if raw QR payload was scanned: SINGALONG-VERIFY:SA26-XXXX -> SA26-XXXX
    const cleanId = term.replace(/^SINGALONG-VERIFY:/i, '').trim().toUpperCase();

    const booking = await this.bookingModel
      .findOne({
        $or: [
          { bookingId: cleanId },
          ...(cleanId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: cleanId }] : []),
        ],
        isActive: true,
      })
      .select('-__v')
      .lean();

    if (!booking) {
      throw new NotFoundException(`No booking found for reference "${term}".`);
    }

    return {
      isValid: true,
      booking,
      verificationToken: `SINGALONG-VERIFY:${booking.bookingId}`,
    };
  }

  // =========================================================================
  // CHECK-IN ATTENDEE (SCANNER / GATE OPERATOR)
  // =========================================================================
  async checkIn(idOrBookingId: string) {
    const { booking } = await this.verifyBooking(idOrBookingId);

    if (booking.attended) {
      return {
        success: false,
        alreadyAttended: true,
        message: `Ticket ${booking.bookingId} (${booking.fullName}) was already checked in!`,
        booking,
      };
    }

    const updated = await this.bookingModel
      .findByIdAndUpdate(
        booking._id,
        {
          attended: true,
          status: SingAlongBookingStatus.ATTENDED,
        },
        { new: true },
      )
      .lean();

    return {
      success: true,
      alreadyAttended: false,
      message: `Check-in successful for ${booking.fullName} (${booking.ticketQty} ticket${booking.ticketQty > 1 ? 's' : ''})`,
      booking: updated,
    };
  }

  // =========================================================================
  // FIND ALL BOOKINGS (ADMIN)
  // =========================================================================
  async findAll(query: QuerySingAlongBookingDto) {
    const { search, status, eventId, page = 1, limit = 50 } = query;
    const filter: Record<string, any> = { isActive: true };

    if (status) {
      filter.status = status;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { fullName: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { bookingId: { $regex: s, $options: 'i' } },
        { utr: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // =========================================================================
  // GET STATS (ADMIN)
  // =========================================================================
  async getStats() {
    const [totalBookings, attendedCount, aggregation] = await Promise.all([
      this.bookingModel.countDocuments({ isActive: true }),
      this.bookingModel.countDocuments({ isActive: true, attended: true }),
      this.bookingModel.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: '$ticketQty' },
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    const totalTickets = aggregation[0]?.totalTickets || 0;
    const totalRevenue = aggregation[0]?.totalRevenue || 0;

    return {
      totalBookings,
      totalTickets,
      totalRevenue,
      attendedCount,
    };
  }

  // =========================================================================
  // EXPORT CSV (ADMIN)
  // =========================================================================
  async exportCsv(res: Response) {
    const bookings = await this.bookingModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Booking ID',
      'Full Name',
      'Phone',
      'Email',
      'Ticket Qty',
      'Total Amount',
      'UTR',
      'Status',
      'Attended',
      'Booked Date',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = bookings.map((b: any) => [
      escapeCsv(b.bookingId),
      escapeCsv(b.fullName),
      escapeCsv(b.phone),
      escapeCsv(b.email || ''),
      escapeCsv(b.ticketQty),
      escapeCsv(b.totalAmount),
      escapeCsv(b.utr || ''),
      escapeCsv(b.status),
      escapeCsv(b.attended ? 'YES' : 'NO'),
      escapeCsv(
        b.createdAt ? new Date(b.createdAt).toISOString() : '',
      ),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sing_along_bookings_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvContent);
  }
}
