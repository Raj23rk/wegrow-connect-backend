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
import { ScanSingAlongDto } from './dto/scan-sing-along.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@ApiTags('Sing Along Ticketing')
@Controller('sing-along')
export class SingAlongController {
  constructor(
    private readonly singAlongService: SingAlongService,
    private readonly configService: ConfigService,
  ) {}

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
  // ADMIN MOBILE SCANNER WEB APP (CAMERA SCANNER FOR MOBILE PHONES)
  // =====================================================
  @Get('admin/scanner')
  @Get('scanner')
  @ApiOperation({
    summary:
      'Open Mobile Admin Ticket Scanner Web App with Camera, Login, and Instant Gate Check-in',
  })
  async getAdminScannerPage(@Res() res: Response) {
    const html = await this.singAlongService.getAdminScannerHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  // =====================================================
  // ADMIN SCANNER API: SCAN QR & VIEW / CHECK-IN ATTENDEE (ADMIN ONLY)
  // =====================================================
  @Post('admin/scan')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Scan ticket QR code, view attendee details, and mark check-in (Admin Only)',
  })
  async adminScanPost(@Body() dto: ScanSingAlongDto) {
    return this.singAlongService.adminScanTicket(dto);
  }

  @Get('admin/scan')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Scan ticket QR code via GET query, view attendee details, and mark check-in (Admin Only)',
  })
  async adminScanGet(
    @Query('qrData') qrData: string,
    @Query('autoCheckIn') autoCheckIn?: string,
  ) {
    return this.singAlongService.adminScanTicket({
      qrData,
      autoCheckIn: autoCheckIn !== 'false',
    });
  }

  @Get('admin/scan/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Scan ticket by booking ID in URL param, view attendee details, and mark check-in (Admin Only)',
  })
  async adminScanParam(
    @Param('id') id: string,
    @Query('autoCheckIn') autoCheckIn?: string,
  ) {
    return this.singAlongService.adminScanTicket({
      qrData: id,
      autoCheckIn: autoCheckIn !== 'false',
    });
  }

  // =====================================================
  // GATE CHECK-IN ATTENDEE (SCANNER / PUBLIC COMPATIBILITY)
  // =====================================================
  @Post('checkin/:id')
  @ApiOperation({ summary: 'Check-in attendee at event gate' })
  async checkIn(@Param('id') id: string) {
    return this.singAlongService.checkIn(id);
  }

  // =====================================================
  // SEND / RESEND TICKET EMAIL (PUBLIC / ADMIN)
  // =====================================================
  @Post(['admin/send-ticket', 'send-ticket', 'send-mail'])
  @ApiOperation({
    summary:
      'Send or resend Sing Along ticket email with QR code and download options via body payload',
  })
  async sendTicketBody(
    @Body() body: { id?: string; bookingId?: string; email?: string },
  ) {
    const idToUse = body?.bookingId || body?.id || '';
    return this.singAlongService.sendTicketEmail(idToUse, body?.email);
  }

  @Post([
    'admin/send-ticket/:id',
    'send-ticket/:id',
    'send-mail/:id',
    'ticket/:id/send-email',
  ])
  @ApiOperation({
    summary:
      'Send or resend Sing Along ticket email with QR code and download options',
  })
  async sendTicket(
    @Param('id') id: string,
    @Body() body?: { email?: string },
  ) {
    return this.singAlongService.sendTicketEmail(id, body?.email);
  }

  @Get(['send-ticket/:id', 'admin/send-ticket/:id'])
  @ApiOperation({ summary: 'Send ticket email via GET request (Quick action)' })
  async sendTicketGet(
    @Param('id') id: string,
    @Query('email') email?: string,
  ) {
    return this.singAlongService.sendTicketEmail(id, email);
  }

  // =====================================================
  // VIEW / DOWNLOAD PRINTABLE TICKET PASS
  // =====================================================
  @Get('ticket/:id')
  @Get('ticket/:id/download')
  @ApiOperation({ summary: 'View and download official printable Sing Along ticket pass' })
  async getTicketPage(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.singAlongService.getTicketHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Get('ticket/:id/pdf')
  @ApiOperation({ summary: 'Download Sing Along ticket as official PDF attachment' })
  async downloadTicketPdf(@Param('id') id: string, @Res() res: Response) {
    const cleanId = (id || '').replace(/^SINGALONG-VERIFY:/i, '').trim().toUpperCase();
    try {
      const pdfBuffer = await this.singAlongService.getTicketPdf(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="SingAlong_Ticket_${cleanId}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (err: any) {
      // If headless Chrome is not installed in the host container, fallback to the printable ticket pass
      return res.redirect(`/api/v1/sing-along/ticket/${cleanId}`);
    }
  }

  @Get('ticket/:id/image')
  @Get('ticket/:id/png')
  @ApiOperation({ summary: 'Download Sing Along ticket as high-resolution PNG image attachment' })
  async downloadTicketImage(@Param('id') id: string, @Res() res: Response) {
    const cleanId = (id || '').replace(/^SINGALONG-VERIFY:/i, '').trim().toUpperCase();
    try {
      const imgBuffer = await this.singAlongService.getTicketImage(id);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="SingAlong_Ticket_${cleanId}.png"`,
      );
      res.setHeader('Content-Length', imgBuffer.length);
      return res.end(imgBuffer);
    } catch (err: any) {
      return res.redirect(`/api/v1/sing-along/ticket/${cleanId}`);
    }
  }

  @Get('ticket/:id/qr.png')
  @Get('ticket/:id/qr')
  @ApiOperation({ summary: 'Get official raw PNG QR Code image for ticket' })
  async getTicketQrPng(@Param('id') id: string, @Res() res: Response) {
    const qrBuffer = await this.singAlongService.getTicketQrBuffer(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    return res.end(qrBuffer);
  }

  @Get('mascot.png')
  @ApiOperation({ summary: 'Get official WeGrow Mascot PNG image' })
  async getMascotPng(@Res() res: Response) {
    const mascotBuffer = await this.singAlongService.getMascotPngBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    return res.end(mascotBuffer);
  }

  // =====================================================
  // SCAN REDIRECT: Redirects any QR scan to WeGrow B School Website
  // =====================================================
  @Get('scan/:id')
  @ApiOperation({ summary: 'Redirect QR scan directly to WeGrow B School ticket page' })
  async scanRedirect(@Param('id') id: string, @Res() res: Response) {
    const cleanId = (id || '').replace(/^SINGALONG-VERIFY:/i, '').trim().toUpperCase();
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://www.wegrowbschool.in';

    return res.redirect(`${frontendUrl}/sing-along?bookingId=${cleanId}`);
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
  // GET ALL BOOKINGS (ADMIN LIST API)
  // =====================================================
  @Get(['admin/list', 'admin/bookings', 'list', 'bookings', ''])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all bookings with pagination, passFilter & search (Admin)',
  })
  async findAll(@Query() query: QuerySingAlongBookingDto) {
    return this.singAlongService.findAll(query);
  }
}
