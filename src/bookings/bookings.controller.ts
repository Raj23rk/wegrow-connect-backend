import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
    Query,
    Put
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger'
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { NotFoundException } from '@nestjs/common';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
    constructor(
        private readonly bookingsService: BookingsService,
    ) { }

    // ================= CREATE BOOKING =================

    @Post('create-booking')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Book an event',
    })
    @ApiResponse({
        status: 201,
        description: 'Booking created successfully.',
    })
    async create(
        @Req() req: any,
        @Body() dto: CreateBookingDto,
    ) {
        const data = await this.bookingsService.create(
            req.user.userId,
            dto,
        );

        return {
            message: 'Booking created successfully',
            data,
        };
    }

    // ================= MY BOOKINGS =================

    @Get('my-bookings')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async myBookings(
        @Req() req: any,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search?: string,
    ) {
        const result = await this.bookingsService.findMyBookings(
            req.user.userId,
            Number(page),
            Number(limit),
            search,
        );

        return {
            success: true,
            message: 'Bookings fetched successfully',
            bookings: result.bookings,
            pagination: result.pagination,
        };
    }

    // ================= ALL BOOKINGS =================

    @Get('all-bookings')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all bookings (Admin Only)',
    })
    @ApiResponse({
        status: 200,
        description: 'Bookings fetched successfully.',
    })
    @ApiQuery({
        name: 'page',
        required: false,
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        example: 10,
    })
    @ApiQuery({
        name: 'search',
        required: false,
        example: 'Python',
    })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search?: string,
    ) {
        const data = await this.bookingsService.findAll(
            Number(page),
            Number(limit),
            search,
        );

        return {
            message: 'Bookings fetched successfully',
            data,
        };
    }

    // ================= BOOKING DETAILS =================

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get booking by ID',
    })
    @ApiResponse({
        status: 200,
        description: 'Booking fetched successfully.',
    })
    @ApiResponse({
        status: 404,
        description: 'Booking not found.',
    })
    async findOne(@Param('id') id: string) {
        const data = await this.bookingsService.findOne(id);

        return {
            message: 'Booking fetched successfully',
            data,
        };
    }

    // ================= CANCEL BOOKING =================

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cancel booking',
    })
    @ApiResponse({
        status: 200,
        description: 'Booking cancelled successfully.',
    })
    async remove(@Param('id') id: string) {
        await this.bookingsService.cancel(id);

        return {
            message: 'Booking cancelled successfully',
        };
    }

    @Put(':id/status')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update booking status (Admin Only)',
    })
    @ApiResponse({
        status: 200,
        description: 'Booking status updated successfully.',
    })
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateBookingStatusDto,
    ) {
        const data = await this.bookingsService.updateStatus(
            id,
            dto,
        );

        return {
            message: 'Booking status updated successfully',
            data,
        };
    }
}