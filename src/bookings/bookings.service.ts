import {
    Injectable,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
    Booking,
    BookingDocument,
    BookingStatus,
} from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { NotificationsService } from '../notifications/notifications.service';


@Injectable()
export class BookingsService {
      private readonly logger = new Logger(BookingsService.name);

    constructor(
        @InjectModel(Booking.name)
        private readonly bookingModel: Model<BookingDocument>,
                private readonly notificationsService: NotificationsService,
        
    ) { }

    // ================= CREATE BOOKING =================

    // async create(userId: string, dto: CreateBookingDto) {
    //     const alreadyBooked = await this.bookingModel.findOne({
    //         user: userId,
    //         event: dto.event,
    //         isActive: true,
    //     });

    //     if (alreadyBooked) {
    //         throw new BadRequestException('Already booked this event');
    //     }

    //     const booking = await this.bookingModel.create({
    //         user: userId,
    //         event: dto.event,
    //         status: BookingStatus.PENDING,
    //     });

    //     return await this.bookingModel
    //         .findById(booking._id)
    //         .populate('user', 'name email phone')
    //         .populate(
    //             'event',
    //             'title description image location date type',
    //         );
    // }
    async create(
  userId: string,
  dto: CreateBookingDto,
) {
  try {
    // ============================================================
    // 1. CHECK ALREADY BOOKED
    // ============================================================

    const alreadyBooked =
      await this.bookingModel.findOne({
        user: userId,
        event: dto.event,
        isActive: true,
      });

    if (alreadyBooked) {
      throw new BadRequestException(
        'Already booked this event',
      );
    }

    // ============================================================
    // 2. CREATE BOOKING
    // ============================================================

    const booking =
      await this.bookingModel.create({
        user: userId,
        event: dto.event,
        status: BookingStatus.PENDING,
      });

    this.logger.log(
      `Booking created successfully: ${booking._id}`,
    );

    // ============================================================
    // 3. GET BOOKING WITH USER + EVENT
    // ============================================================

    const bookingDetails =
      await this.bookingModel
        .findById(booking._id)
        .populate(
          'user',
          'firstName lastName name email phone',
        )
        .populate(
          'event',
          'title description image location date type price',
        );

    if (!bookingDetails) {
      throw new InternalServerErrorException(
        'Booking created but details could not be retrieved',
      );
    }

    // ============================================================
    // 4. GET USER DETAILS
    // ============================================================

    const user = bookingDetails.user as any;
    const event = bookingDetails.event as any;

    if (!user) {
      this.logger.warn(
        `User not found for booking ${booking._id}`,
      );

      return bookingDetails;
    }

    if (!event) {
      this.logger.warn(
        `Event not found for booking ${booking._id}`,
      );

      return bookingDetails;
    }

    // ============================================================
    // 5. USER NAME
    // ============================================================

    const userName =
      `${user.firstName || ''} ${
        user.lastName || ''
      }`.trim() ||
      user.name ||
      'User';

    // ============================================================
    // 6. CREATE DATABASE NOTIFICATION
    // ============================================================

    try {
      const notification =
        await this.notificationsService
          .createBookingNotification(
            user._id.toString(),
            event._id.toString(),
            event.title,
          );

      this.logger.log(
        `Booking notification created: ${notification._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create booking notification for user ${user._id}`,
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }

    // ============================================================
    // 7. SEND BOOKING EMAIL
    // ============================================================

    if (user.email) {
      this.notificationsService
        .sendBookingConfirmationNotification(
          user.email,
          userName,
          event.title,
          event.description,
          event.location,
          event.date?.toString(),
          event.price,
          bookingDetails.status,
        )
        .then(() => {
          this.logger.log(
            `Booking confirmation email sent to ${user.email}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Failed to send booking email to ${user.email}`,
            error instanceof Error
              ? error.stack
              : String(error),
          );
        });
    } else {
      this.logger.warn(
        `User ${user._id} does not have an email`,
      );
    }

    // ============================================================
    // 8. RETURN BOOKING
    // ============================================================

    return bookingDetails;

  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    this.logger.error(
      'Failed to create booking',
      error instanceof Error
        ? error.stack
        : String(error),
    );

    throw new InternalServerErrorException(
      error instanceof Error
        ? error.message
        : 'Failed to create booking',
    );
  }
}

    // ================= MY BOOKINGS =================

    async findMyBookings(
        userId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
    ) {
        const skip = (page - 1) * limit;

        let bookings = await this.bookingModel
            .find({
                user: userId,
                isActive: true,
            })
            .populate('user', 'name email phone')
            .populate(
                'event',
                'title description image location date type',
            )
            .sort({ createdAt: -1 });

        // Search by Event Title
        if (search) {
            bookings = bookings.filter((booking: any) =>
                booking.event?.title
                    ?.toLowerCase()
                    .includes(search.toLowerCase()),
            );
        }

        const total = bookings.length;

        const paginatedBookings = bookings.slice(skip, skip + limit);

        return {
            bookings: paginatedBookings,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ================= ALL BOOKINGS =================

    async findAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
    ) {
        const skip = (page - 1) * limit;

        const filter: any = {
            isActive: true,
        };

        const [bookings, total] = await Promise.all([
            this.bookingModel
                .find(filter)
                .populate('user', 'name email phone')
                .populate(
                    'event',
                    'title description image location date type',
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            this.bookingModel.countDocuments(filter),
        ]);

        // Optional Search (Event Title/User Name)
        let filteredBookings = bookings;

        if (search) {
            filteredBookings = bookings.filter((booking: any) => {
                const userName = booking.user?.name?.toLowerCase() || '';
                const eventTitle = booking.event?.title?.toLowerCase() || '';

                return (
                    userName.includes(search.toLowerCase()) ||
                    eventTitle.includes(search.toLowerCase())
                );
            });
        }

        return {
            bookings: filteredBookings,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ================= BOOKING DETAILS =================

    async findOne(id: string) {
        const booking = await this.bookingModel
            .findById(id)
            .populate('user', 'name email phone')
            .populate(
                'event',
                'title description image location date type',
            );

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        return booking;
    }

    // ================= CANCEL BOOKING =================

    async cancel(id: string) {
        const booking = await this.bookingModel.findByIdAndUpdate(
            id,
            {
                status: BookingStatus.CANCELLED,
                isActive: false,
            },
            {
                new: true,
            },
        );

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        return booking;
    }


    async updateStatus(
        id: string,
        dto: UpdateBookingStatusDto,
    ) {
        const booking = await this.bookingModel
            .findByIdAndUpdate(
                id,
                {
                    status: dto.status,
                },
                {
                    new: true,
                },
            )
            .populate('user', 'name email phone')
            .populate(
                'event',
                'title description image location date type',
            );

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        return booking;
    }
}