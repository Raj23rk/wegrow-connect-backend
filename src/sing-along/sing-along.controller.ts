import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SingAlongService } from './sing-along.service';
import { CreateSingAlongBookingDto } from './dto/create-sing-along-booking.dto';
import { QuerySingAlongBookingDto } from './dto/query-sing-along-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import type { Response } from 'express';

@ApiTags('Sing Along Ticketing')
@Controller('sing-along')
export class SingAlongController {
  constructor(private readonly singAlongService: SingAlongService) {}

  // =====================================================
  // BOOK TICKETS (PUBLIC)
  // =====================================================
  @Post('book')
  @ApiOperation({ summary: 'Book Sing Along Tickets (Public)' })
  async book(@Body() dto: CreateSingAlongBookingDto) {
    const data = await this.singAlongService.bookTicket(dto);
    return {
      success: true,
      message: 'Tickets booked successfully',
      data,
    };
  }

  // Alias for root POST /api/v1/sing-along
  @Post()
  @ApiOperation({ summary: 'Book Sing Along Tickets (Public Alias)' })
  async bookRoot(@Body() dto: CreateSingAlongBookingDto) {
    return this.book(dto);
  }

  // =====================================================
  // VERIFY BOOKING BY BOOKING ID OR DB ID (PUBLIC / GATE)
  // =====================================================
  @Get('verify/:id')
  @ApiOperation({
    summary: 'Verify Sing Along Ticket by Booking ID or QR Token',
  })
  async verify(@Param('id') id: string) {
    return this.singAlongService.verifyBooking(id);
  }

  // =====================================================
  // GATE CHECK-IN ATTENDEE (SCANNER)
  // =====================================================
  @Post('checkin/:id')
  @ApiOperation({ summary: 'Check-in attendee at event gate' })
  async checkIn(@Param('id') id: string) {
    return this.singAlongService.checkIn(id);
  }

  // =====================================================
  // GET STATS (ADMIN)
  // =====================================================
  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticketing sales & revenue statistics (Admin)' })
  async getStats() {
    return this.singAlongService.getStats();
  }

  // =====================================================
  // EXPORT CSV (ADMIN)
  // =====================================================
  @Get('export-csv')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all ticket bookings to CSV (Admin)' })
  async exportCsv(@Res() res: Response) {
    return this.singAlongService.exportCsv(res);
  }

  // =====================================================
  // GET ALL BOOKINGS (ADMIN)
  // =====================================================
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all bookings with pagination & search (Admin)',
  })
  async findAll(@Query() query: QuerySingAlongBookingDto) {
    return this.singAlongService.findAll(query);
  }
}
