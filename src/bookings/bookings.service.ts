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
  ) {}

  // ============================================================
  // CREATE BOOKING
  // ============================================================

  async create(userId: string, dto: CreateBookingDto) {
    try {
      // ============================================================
      // 1. CHECK ALREADY BOOKED
      // ============================================================

      const alreadyBooked = await this.bookingModel.findOne({
        user: userId,
        event: dto.event,
        isActive: true,
      });

      if (alreadyBooked) {
        throw new BadRequestException('Already booked this event');
      }

      // ============================================================
      // 2. CREATE BOOKING
      // ============================================================

      const booking = await this.bookingModel.create({
        user: userId,
        event: dto.event,
        status: BookingStatus.PENDING,
        isActive: true,
      });

      this.logger.log(`Booking created successfully: ${booking._id}`);

      // ============================================================
      // 3. GET BOOKING WITH USER + EVENT
      // ============================================================

      const bookingDetails = await this.bookingModel
        .findById(booking._id)
        .populate('user', 'name firstName lastName email phone')
        .populate('event', 'title description image location date type price');

      if (!bookingDetails) {
        throw new InternalServerErrorException(
          'Booking created but details could not be retrieved',
        );
      }

      // ============================================================
      // 4. GET USER + EVENT
      // ============================================================

      const user = bookingDetails.user as any;
      const event = bookingDetails.event as any;

      if (!user) {
        this.logger.warn(`User not found for booking ${booking._id}`);

        return bookingDetails;
      }

      if (!event) {
        this.logger.warn(`Event not found for booking ${booking._id}`);

        return bookingDetails;
      }

      // ============================================================
      // 5. CREATE USER NAME
      // ============================================================

      const userName =
        user.name ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'User';

      // ============================================================
      // 6. CREATE DATABASE NOTIFICATION
      // ============================================================

      try {
        const notification =
          await this.notificationsService.createBookingNotification(
            user._id.toString(),
            event._id.toString(),
            event.title,
          );

        this.logger.log(`Booking notification created: ${notification._id}`);
      } catch (error) {
        this.logger.error(
          `Failed to create booking notification for user ${user._id}`,
          error instanceof Error ? error.stack : String(error),
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
            this.logger.log(`Booking confirmation email sent to ${user.email}`);
          })
          .catch((error) => {
            this.logger.error(
              `Failed to send booking email to ${user.email}`,
              error instanceof Error ? error.stack : String(error),
            );
          });
      } else {
        this.logger.warn(`User ${user._id} does not have an email`);
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
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to create booking',
      );
    }
  }

  // ============================================================
  // MY BOOKINGS
  // ============================================================

  async findMyBookings(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    page = Math.max(Number(page) || 1, 1);

    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const filter: any = {
      user: userId,
      isActive: true,
    };

    // ============================================================
    // GET BOOKINGS
    // ============================================================

    let bookings = await this.bookingModel
      .find(filter)
      .populate('user', 'name firstName lastName email phone')
      .populate('event', 'title description image location date type price')
      .sort({ createdAt: -1 })
      .lean();

    // ============================================================
    // FORMAT USER NAME
    // ============================================================

    bookings = bookings.map((booking: any) => {
      if (booking.user) {
        const firstName = booking.user.firstName || '';

        const lastName = booking.user.lastName || '';

        const fullName = `${firstName} ${lastName}`.trim();

        booking.user.name = booking.user.name || fullName || 'User';

        delete booking.user.firstName;
        delete booking.user.lastName;
      }

      return booking;
    });

    // ============================================================
    // SEARCH
    // ============================================================

    if (search && search.trim()) {
      const searchText = search.trim().toLowerCase();

      bookings = bookings.filter((booking: any) => {
        const userName = booking.user?.name?.toLowerCase() || '';

        const email = booking.user?.email?.toLowerCase() || '';

        const phone = booking.user?.phone?.toLowerCase() || '';

        const eventTitle = booking.event?.title?.toLowerCase() || '';

        return (
          userName.includes(searchText) ||
          email.includes(searchText) ||
          phone.includes(searchText) ||
          eventTitle.includes(searchText)
        );
      });
    }

    // ============================================================
    // TOTAL AFTER SEARCH
    // ============================================================

    const total = bookings.length;

    // ============================================================
    // PAGINATION
    // ============================================================

    const skip = (page - 1) * limit;

    const paginatedBookings = bookings.slice(skip, skip + limit);

    // ============================================================
    // STATUS COUNTS
    // ============================================================

    const pendingCount = bookings.filter(
      (booking: any) => booking.status === BookingStatus.PENDING,
    ).length;

    const confirmedCount = bookings.filter(
      (booking: any) => booking.status === BookingStatus.CONFIRMED,
    ).length;

    const cancelledCount = bookings.filter(
      (booking: any) => booking.status === BookingStatus.CANCELLED,
    ).length;

    // ============================================================
    // RESPONSE
    // ============================================================

    return {
      success: true,

      bookings: paginatedBookings,

      counts: {
        total,
        pending: pendingCount,
        confirmed: confirmedCount,
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
  // ALL BOOKINGS - ADMIN
  // ============================================================

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    // ============================================================
    // PAGINATION
    // ============================================================

    page = Math.max(Number(page) || 1, 1);

    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    // ============================================================
    // BASE FILTER
    // ============================================================

    const filter: any = {
      isActive: true,
    };

    // ============================================================
    // GET ALL ACTIVE BOOKINGS
    //
    // We first get all active bookings so search works
    // correctly before pagination.
    // ============================================================

    let bookings = await this.bookingModel
      .find(filter)
      .populate('user', 'name firstName lastName email phone')
      .populate('event', 'title description image location date type price')
      .sort({ createdAt: -1 })
      .lean();

    // ============================================================
    // FORMAT USER NAME
    // ============================================================

    bookings = bookings.map((booking: any) => {
      if (booking.user) {
        const firstName = booking.user.firstName || '';

        const lastName = booking.user.lastName || '';

        const fullName = `${firstName} ${lastName}`.trim();

        booking.user.name = booking.user.name || fullName || 'User';

        // Remove unnecessary fields
        delete booking.user.firstName;
        delete booking.user.lastName;
      }

      return booking;
    });

    // ============================================================
    // SEARCH
    //
    // Search:
    // - User Name
    // - Email
    // - Phone
    // - Event Title
    // ============================================================

    let filteredBookings = bookings;

    if (search && search.trim()) {
      const searchText = search.trim().toLowerCase();

      filteredBookings = bookings.filter((booking: any) => {
        const userName = booking.user?.name?.toLowerCase() || '';

        const email = booking.user?.email?.toLowerCase() || '';

        const phone = booking.user?.phone?.toLowerCase() || '';

        const eventTitle = booking.event?.title?.toLowerCase() || '';

        return (
          userName.includes(searchText) ||
          email.includes(searchText) ||
          phone.includes(searchText) ||
          eventTitle.includes(searchText)
        );
      });
    }

    // ============================================================
    // TOTAL AFTER SEARCH
    // ============================================================

    const total = filteredBookings.length;

    // ============================================================
    // STATUS COUNTS
    //
    // These counts are based on filtered results.
    // ============================================================

    const pendingCount = filteredBookings.filter(
      (booking: any) => booking.status === BookingStatus.PENDING,
    ).length;

    const confirmedCount = filteredBookings.filter(
      (booking: any) => booking.status === BookingStatus.CONFIRMED,
    ).length;

    const cancelledCount = filteredBookings.filter(
      (booking: any) => booking.status === BookingStatus.CANCELLED,
    ).length;

    // ============================================================
    // PAGINATION
    // ============================================================

    const skip = (page - 1) * limit;

    const paginatedBookings = filteredBookings.slice(skip, skip + limit);

    // ============================================================
    // RESPONSE
    // ============================================================

    return {
      success: true,

      bookings: paginatedBookings,

      counts: {
        total,
        pending: pendingCount,
        confirmed: confirmedCount,
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
  // BOOKING DETAILS
  // ============================================================

  async findOne(id: string) {
    const booking = await this.bookingModel
      .findById(id)
      .populate('user', 'name firstName lastName email phone')
      .populate('event', 'title description image location date type price')
      .lean();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // ============================================================
    // FORMAT USER NAME
    // ============================================================

    const bookingData: any = booking;

    if (bookingData.user) {
      const firstName = bookingData.user.firstName || '';

      const lastName = bookingData.user.lastName || '';

      const fullName = `${firstName} ${lastName}`.trim();

      bookingData.user.name = bookingData.user.name || fullName || 'User';

      delete bookingData.user.firstName;
      delete bookingData.user.lastName;
    }

    return bookingData;
  }

  // ============================================================
  // CANCEL BOOKING
  // ============================================================

  async cancel(id: string) {
    const booking = await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          status: BookingStatus.CANCELLED,

          isActive: false,
        },
        {
          new: true,
        },
      )
      .populate('user', 'name firstName lastName email phone')
      .populate('event', 'title description image location date type price');

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // ============================================================
  // UPDATE BOOKING STATUS
  // ============================================================

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    // ============================================================
    // FIND BOOKING
    // ============================================================

    const booking = await this.bookingModel
      .findById(id)
      .populate('user', 'name firstName lastName email phone')
      .populate('event', 'title description image location date type price');

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // ============================================================
    // UPDATE STATUS
    // ============================================================

    booking.status = dto.status;

    // If cancelled, make inactive
    if (dto.status === BookingStatus.CANCELLED) {
      booking.isActive = false;
    }

    // If confirmed/pending, keep active
    if (
      dto.status === BookingStatus.CONFIRMED ||
      dto.status === BookingStatus.PENDING
    ) {
      booking.isActive = true;
    }

    await booking.save();

    // ============================================================
    // GET USER + EVENT
    // ============================================================

    const user = booking.user as any;
    const event = booking.event as any;

    if (user && event) {
      const userName =
        user.name ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'User';

      // ============================================================
      // SEND STATUS NOTIFICATION
      // ============================================================

      try {
        if (dto.status === BookingStatus.CONFIRMED) {
          await this.notificationsService.createBookingConfirmedNotification(
            user._id.toString(),
            event._id.toString(),
            event.title,
          );
        }

        if (dto.status === BookingStatus.CANCELLED) {
          await this.notificationsService.createBookingCancelledNotification(
            user._id.toString(),
            event._id.toString(),
            event.title,
          );
        }
      } catch (error) {
        this.logger.error(
          'Failed to create status notification',
          error instanceof Error ? error.stack : String(error),
        );
      }

      // ============================================================
      // SEND EMAIL
      //
      // Only if your notification service has
      // sendBookingConfirmationNotification()
      // ============================================================

      if (user.email) {
        try {
          await this.notificationsService.sendBookingConfirmationNotification(
            user.email,
            userName,
            event.title,
            event.description,
            event.location,
            event.date?.toString(),
            event.price,
            booking.status,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send status email to ${user.email}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }

    // ============================================================
    // RETURN UPDATED BOOKING
    // ============================================================

    return booking;
  }
}
