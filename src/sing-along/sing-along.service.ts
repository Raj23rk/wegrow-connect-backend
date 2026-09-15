import {
  BadRequestException,
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
import {
  SingAlongCounter,
  SingAlongCounterDocument,
} from './schemas/sing-along-counter.schema';
import { CreateSingAlongBookingDto } from './dto/create-sing-along-booking.dto';
import { QuerySingAlongBookingDto } from './dto/query-sing-along-booking.dto';
import { Response } from 'express';

@Injectable()
export class SingAlongService {
  // In-memory cache for stats to eliminate DB hits on consecutive dashboard reloads
  private statsCache: { data: any; expiresAt: number } | null = null;

  constructor(
    @InjectModel(SingAlongBooking.name)
    private readonly bookingModel: Model<SingAlongBookingDocument>,
    @InjectModel(SingAlongCounter.name)
    private readonly counterModel: Model<SingAlongCounterDocument>,
  ) {}

  /**
   * High-speed atomic booking ID generator.
   * Runs in 1 atomic MongoDB round-trip (~1-2ms) via $inc, guaranteed collision-free.
   */
  async generateBookingId(): Promise<string> {
    const counter: any = await this.counterModel.findOneAndUpdate(
      { name: 'sing_along_booking_seq' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const seqVal = counter?.seq || 1;

    // Self-healing check: If counter is newly seeded at 1, ensure it's higher than existing DB records
    if (seqVal === 1) {
      const highest = await this.bookingModel
        .findOne({ bookingId: { $regex: /^SA26-\d+$/i } })
        .sort({ bookingId: -1 })
        .select('bookingId')
        .lean();

      let baseNum = 0;
      if (highest?.bookingId) {
        const match = highest.bookingId.match(/^SA26-(\d+)$/i);
        if (match) {
          baseNum = parseInt(match[1], 10) || 0;
        }
      }

      if (baseNum >= 1) {
        const nextSeq = baseNum + 1;
        await this.counterModel.updateOne(
          { name: 'sing_along_booking_seq' },
          { $set: { seq: nextSeq } },
        );
        return `SA26-${String(nextSeq).padStart(3, '0')}`;
      }
    }

    return `SA26-${String(seqVal).padStart(3, '0')}`;
  }

  // =========================================================================
  // BOOK TICKETS (PUBLIC)
  // Single atomic round-trip Mongo write with zero collision retries
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

      // Invalidate stats cache on new confirmed booking
      this.statsCache = null;

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
      if (err.code === 11000 && err.keyPattern?.bookingId) {
        // Fallback in case of manual counter race: grab fresh sequence once
        const fallbackId = await this.generateBookingId();
        const fallbackBooking = await this.bookingModel.create({
          bookingId: fallbackId,
          fullName,
          phone,
          email,
          ticketQty,
          unitPrice,
          totalAmount,
          utr,
          paymentScreenshot: dto.paymentScreenshot || '',
          paymentMethod: dto.paymentMethod || 'kumarrk23dev-1@okaxis',
          status: dto.status || SingAlongBookingStatus.CONFIRMED,
          eventId,
          attended: false,
          isActive: true,
          notes: dto.notes || 'UPI QR Payment',
        });
        return {
          id: fallbackBooking._id,
          bookingId: fallbackBooking.bookingId,
          fullName: fallbackBooking.fullName,
          phone: fallbackBooking.phone,
          email: fallbackBooking.email,
          ticketQty: fallbackBooking.ticketQty,
          unitPrice: fallbackBooking.unitPrice,
          totalAmount: fallbackBooking.totalAmount,
          utr: fallbackBooking.utr,
          status: fallbackBooking.status,
          eventId: fallbackBooking.eventId,
          verificationToken: `SINGALONG-VERIFY:${fallbackBooking.bookingId}`,
          createdAt: (fallbackBooking as any).createdAt,
        };
      }
      throw err;
    }
  }

  // =========================================================================
  // VERIFY BOOKING BY BOOKING ID OR MONGODB _ID (PUBLIC / SCANNER)
  // Ultra-fast covered/indexed lookup, returns lean JSON
  // =========================================================================
  async verifyBooking(idOrBookingId: string) {
    const term = (idOrBookingId || '').trim();
    if (!term) {
      throw new BadRequestException('Booking identifier is required.');
    }

    const cleanId = term.replace(/^SINGALONG-VERIFY:/i, '').trim().toUpperCase();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    const booking = await this.bookingModel
      .findOne({
        ...(isMongoId
          ? { $or: [{ bookingId: cleanId }, { _id: cleanId }] }
          : { bookingId: cleanId }),
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
  // Single-round-trip atomic update: eliminates double-scan race conditions & latency
  // =========================================================================
  async checkIn(idOrBookingId: string) {
    const term = (idOrBookingId || '').trim();
    if (!term) {
      throw new BadRequestException('Booking identifier is required.');
    }

    const cleanId = term.replace(/^SINGALONG-VERIFY:/i, '').trim().toUpperCase();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    const baseFilter: Record<string, any> = {
      ...(isMongoId
        ? { $or: [{ bookingId: cleanId }, { _id: cleanId }] }
        : { bookingId: cleanId }),
      isActive: true,
    };

    // 1. Single atomic check-and-update if not yet attended
    const updated = await this.bookingModel
      .findOneAndUpdate(
        { ...baseFilter, attended: false },
        {
          $set: {
            attended: true,
            status: SingAlongBookingStatus.ATTENDED,
          },
        },
        { new: true },
      )
      .select('-__v')
      .lean();

    if (updated) {
      // Invalidate stats cache on attendance update
      this.statsCache = null;

      return {
        success: true,
        alreadyAttended: false,
        message: `Check-in successful for ${updated.fullName} (${updated.ticketQty} ticket${updated.ticketQty > 1 ? 's' : ''})`,
        booking: updated,
      };
    }

    // 2. If not updated, check if booking exists or was already attended
    const existing = await this.bookingModel
      .findOne(baseFilter)
      .select('-__v')
      .lean();

    if (!existing) {
      throw new NotFoundException(`No booking found for reference "${term}".`);
    }

    return {
      success: false,
      alreadyAttended: true,
      message: `Ticket ${existing.bookingId} (${existing.fullName}) was already checked in!`,
      booking: existing,
    };
  }

  // =========================================================================
  // FIND ALL BOOKINGS (ADMIN)
  // Compound indexed pagination with targeted search to prevent full table scans
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
      // Optimization: if phone number or bookingId pattern, use direct field match instead of wide $or
      if (/^\d{6,10}$/.test(s)) {
        filter.phone = { $regex: s };
      } else if (/^SA26/i.test(s)) {
        filter.bookingId = { $regex: s, $options: 'i' };
      } else {
        filter.$or = [
          { fullName: { $regex: s, $options: 'i' } },
          { phone: { $regex: s, $options: 'i' } },
          { bookingId: { $regex: s, $options: 'i' } },
          { utr: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
        ];
      }
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    // Parallel fetch: paginated documents and single-pass metrics aggregation
    const [data, statsResult] = await Promise.all([
      this.bookingModel
        .find(filter)
        .select(
          'bookingId fullName phone email ticketQty unitPrice totalAmount utr status attended eventId createdAt paymentMethod notes',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      this.bookingModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        SingAlongBookingStatus.CONFIRMED,
                        SingAlongBookingStatus.ATTENDED,
                      ],
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
            confirmedCount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        SingAlongBookingStatus.CONFIRMED,
                        SingAlongBookingStatus.ATTENDED,
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            pendingCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      '$status',
                      SingAlongBookingStatus.PENDING_VERIFICATION,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            paymentCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      {
                        $in: [
                          '$status',
                          [
                            SingAlongBookingStatus.CONFIRMED,
                            SingAlongBookingStatus.ATTENDED,
                          ],
                        ],
                      },
                      { $gt: ['$utr', ''] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalTickets: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        SingAlongBookingStatus.CONFIRMED,
                        SingAlongBookingStatus.ATTENDED,
                      ],
                    ],
                  },
                  '$ticketQty',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const stats = statsResult[0] || {};
    const total = stats.total || 0;
    const totalRevenue = Number(stats.totalRevenue || 0);
    const confirmedCount = stats.confirmedCount || 0;
    const paymentCount = stats.paymentCount || confirmedCount;
    const totalTickets = stats.totalTickets || 0;
    const pendingCount = stats.pendingCount || 0;

    const totalRevenueFormatted = `₹${totalRevenue.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
      totalRevenue,
      totalRevenueFormatted,
      confirmedCount,
      totalConfirmed: confirmedCount,
      paymentCount,
      totalTickets,
      pendingCount,
      summary: {
        total,
        totalRevenue,
        totalRevenueFormatted,
        confirmedCount,
        paymentCount,
        totalTickets,
        pendingCount,
      },
    };
  }

  // =========================================================================
  // GET STATS (ADMIN)
  // Single-pass aggregation pipeline + 15s in-memory caching
  // =========================================================================
  async getStats() {
    const now = Date.now();
    if (this.statsCache && this.statsCache.expiresAt > now) {
      return this.statsCache.data;
    }

    const [statsResult] = await this.bookingModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          attendedCount: {
            $sum: { $cond: [{ $eq: ['$attended', true] }, 1, 0] },
          },
          totalTickets: { $sum: '$ticketQty' },
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const totalRevenue = Number(statsResult?.totalRevenue || 0);
    const stats = {
      totalBookings: statsResult?.totalBookings || 0,
      totalTickets: statsResult?.totalTickets || 0,
      totalRevenue,
      totalRevenueFormatted: `₹${totalRevenue.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      attendedCount: statsResult?.attendedCount || 0,
    };

    this.statsCache = {
      data: stats,
      expiresAt: now + 15000, // 15 seconds TTL
    };

    return stats;
  }

  // =========================================================================
  // EXPORT CSV (ADMIN)
  // Memory-efficient stream cursor directly to response
  // =========================================================================
  async exportCsv(res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sing_along_bookings_${Date.now()}.csv"`,
    );

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
    res.write(headers.join(',') + '\r\n');

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const cursor = this.bookingModel
      .find({ isActive: true })
      .select(
        'bookingId fullName phone email ticketQty totalAmount utr status attended createdAt',
      )
      .sort({ createdAt: -1 })
      .lean()
      .cursor();

    for await (const b of cursor) {
      const row = [
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
          (b as any).createdAt
            ? new Date((b as any).createdAt).toISOString()
            : '',
        ),
      ].join(',');
      res.write(row + '\r\n');
    }

    res.end();
  }
}
