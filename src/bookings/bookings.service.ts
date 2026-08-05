import {
    Injectable,
    BadRequestException,
    NotFoundException,
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

@Injectable()
export class BookingsService {
    constructor(
        @InjectModel(Booking.name)
        private readonly bookingModel: Model<BookingDocument>,
    ) { }

    // ================= CREATE BOOKING =================

    async create(userId: string, dto: CreateBookingDto) {
        const alreadyBooked = await this.bookingModel.findOne({
            user: userId,
            event: dto.event,
            isActive: true,
        });

        if (alreadyBooked) {
            throw new BadRequestException('Already booked this event');
        }

        const booking = await this.bookingModel.create({
            user: userId,
            event: dto.event,
            status: BookingStatus.PENDING,
        });

        return await this.bookingModel
            .findById(booking._id)
            .populate('user', 'name email phone')
            .populate(
                'event',
                'title description image location date type',
            );
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