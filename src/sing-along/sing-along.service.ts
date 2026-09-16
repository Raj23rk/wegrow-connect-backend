import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
import { ScanSingAlongDto } from './dto/scan-sing-along.dto';
import { Response } from 'express';
import { NotificationsService } from '../notifications/notifications.service';
import * as QRCode from 'qrcode';

@Injectable()
export class SingAlongService {
  private readonly logger = new Logger(SingAlongService.name);

  // In-memory cache for stats to eliminate DB hits on consecutive dashboard reloads
  private statsCache: { data: any; expiresAt: number } | null = null;
  private cachedMascotBase64: string | null = null;

  constructor(
    @InjectModel(SingAlongBooking.name)
    private readonly bookingModel: Model<SingAlongBookingDocument>,
    @InjectModel(SingAlongCounter.name)
    private readonly counterModel: Model<SingAlongCounterDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to get or prefetch Mascot image as Base64 Data URI to prevent any broken images or CORS errors
   */
  private async getMascotBase64(): Promise<string> {
    if (this.cachedMascotBase64) return this.cachedMascotBase64;
    try {
      const res = await fetch('https://www.wegrowbschool.in/mascot.webp');
      if (res.ok) {
        const buf = await res.arrayBuffer();
        this.cachedMascotBase64 = `data:image/webp;base64,${Buffer.from(buf).toString('base64')}`;
        return this.cachedMascotBase64;
      }
    } catch (err: any) {
      this.logger.warn(`Could not prefetch mascot image for base64 embed: ${err?.message}`);
    }
    return 'https://www.wegrowbschool.in/mascot.webp';
  }

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
    const eventId = (dto.eventId || 'SINGALONG-SEP-27-2026').trim();
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

      if (newBooking.email && newBooking.status === SingAlongBookingStatus.CONFIRMED) {
        this.sendTicketEmail(newBooking.bookingId).catch((e) =>
          this.logger.error(`Failed to send ticket email: ${e?.message}`),
        );
      }

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

        if (fallbackBooking.email && fallbackBooking.status === SingAlongBookingStatus.CONFIRMED) {
          this.sendTicketEmail(fallbackBooking.bookingId).catch((e) =>
            this.logger.error(`Failed to send ticket email: ${e?.message}`),
          );
        }

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
  // SEND / RESEND TICKET CONFIRMATION EMAIL
  // =========================================================================
  async sendTicketEmail(idOrBookingId: string) {
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
      .lean();

    if (!booking) {
      throw new NotFoundException(`No booking found for identifier "${term}".`);
    }

    if (!booking.email) {
      throw new BadRequestException(
        `Booking ${booking.bookingId} has no associated email address.`,
      );
    }

    const success = await this.notificationsService.sendSingAlongTicketEmail({
      email: booking.email,
      fullName: booking.fullName || 'Guest Attendee',
      phone: booking.phone || '',
      bookingId: booking.bookingId,
      ticketQty: booking.ticketQty || 1,
      unitPrice: booking.unitPrice || 199,
      totalAmount: booking.totalAmount || 199,
      paymentMethod: booking.paymentMethod || 'CASHFREE',
      utr: booking.utr || '',
      orderId: booking.orderId || '',
      eventId: booking.eventId || 'SINGALONG-SEP-27-2026',
      verificationToken: `SINGALONG-VERIFY:${booking.bookingId}`,
    });

    if (success) {
      await this.bookingModel.updateOne(
        { bookingId: booking.bookingId },
        { $set: { emailSent: true } },
      );
      this.logger.log(`Ticket email sent successfully for ${booking.bookingId} to ${booking.email}`);
    }

    return {
      success,
      message: success
        ? `Ticket confirmation email sent to ${booking.email}`
        : `Failed to send email to ${booking.email}`,
      bookingId: booking.bookingId,
      email: booking.email,
    };
  }

  // =========================================================================
  // RENDER STANDALONE PRINTABLE TICKET PASS (FOR BROWSER & PDF DOWNLOAD)
  // =========================================================================
  // =========================================================================
  // RENDER STANDALONE PRINTABLE TICKET PASS (FOR BROWSER & PDF DOWNLOAD)
  // =========================================================================
  async getTicketHtml(idOrBookingId: string, forExport = false): Promise<string> {
    const term = (idOrBookingId || '').trim();
    if (!term) {
      throw new BadRequestException('Booking identifier is required.');
    }

    const cleanId = term.replace(/^SINGALONG-VERIFY:/i, '').trim().toUpperCase();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    const booking = await this.bookingModel
      .findOne(
        isMongoId
          ? { $or: [{ bookingId: cleanId }, { _id: cleanId }] }
          : { bookingId: cleanId },
      )
      .lean();

    if (!booking) {
      throw new NotFoundException(`No booking found for identifier "${term}".`);
    }

    const token = `SINGALONG-VERIFY:${booking.bookingId}`;
    const redirectUrl = `https://www.wegrowbschool.in/sing-along?bookingId=${booking.bookingId}`;

    // Generate local Base64 PNG QR Code so it NEVER fails and has zero CORS/network issues
    let qrUrl = '';
    try {
      qrUrl = await QRCode.toDataURL(redirectUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 240,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch {
      qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(redirectUrl)}&size=240&ecLevel=H&margin=1`;
    }

    const mascotSrc = await this.getMascotBase64();

    const formattedDate = new Date((booking as any).createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sing Along Ticket Pass - ${booking.bookingId}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${forExport ? '0' : '20px 10px'};
      background: ${forExport ? '#ffffff' : '#f4f4f5'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1c1917;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    
    /* TOP ACTION BAR (PDF / IMAGE / PRINT) */
    .action-bar {
      width: 100%;
      max-width: 540px;
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .action-btn {
      flex: 1;
      min-width: 150px;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      text-decoration: none;
    }
    .action-btn:active { transform: scale(0.98); }
    .action-btn:disabled { opacity: 0.7; cursor: wait; }
    .btn-pdf {
      background: linear-gradient(135deg, #4338ca 0%, #312e81 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(67, 56, 202, 0.35);
    }
    .btn-img {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.35);
    }
    .btn-print {
      background: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .ticket-container {
      width: 100%;
      max-width: 540px;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: ${forExport ? 'none' : '0 10px 30px rgba(0,0,0,0.1)'};
      overflow: hidden;
      border: 1px solid #fed7aa;
    }

    /* HEADER: ROYAL INDIGO (IMAGE 2) */
    .ticket-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #4338ca 100%);
      padding: 24px 20px 20px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-title {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 4px 0 2px 0;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .header-subtitle {
      font-size: 14px;
      font-weight: 600;
      color: #c7d2fe;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .mascot-left {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 2px solid #a855f7;
      background: #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: block;
    }

    .content {
      padding: 22px 18px;
    }

    /* EVENT BAR */
    .event-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      background: #fffbeb;
      border: 1px solid #fef08a;
      border-radius: 12px;
      padding: 10px 12px;
      margin-bottom: 20px;
      gap: 6px;
    }
    .event-bar-item {
      font-size: 12px;
      font-weight: 700;
      color: #854d0e;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* TICKET CARD (EXACT IMAGE 3) */
    .pass-card {
      background: #ffffff;
      border: 2px dashed #f59e0b;
      border-radius: 16px;
      padding: 22px;
      margin-bottom: 20px;
    }
    .pass-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #fed7aa;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .pass-title {
      font-size: 18px;
      font-weight: 800;
      color: #78350f;
    }
    .pass-subtitle {
      font-size: 12px;
      color: #92400e;
      font-weight: 600;
      margin-top: 3px;
    }
    .booking-id-badge {
      font-family: monospace;
      font-size: 15px;
      font-weight: 800;
      color: #78350f;
      background: #fef3c7;
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid #fcd34d;
      letter-spacing: 0.5px;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    .info-table td {
      padding: 7px 0;
      font-size: 14px;
      vertical-align: top;
    }
    .info-table td.label {
      width: 42%;
      color: #78716c;
      font-weight: 600;
    }
    .info-table td.value {
      width: 58%;
      color: #1c1917;
      font-weight: 700;
    }

    /* QR CONTAINER */
    .qr-box {
      text-align: center;
      padding: 16px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
    }
    .qr-box img {
      display: block;
      margin: 0 auto;
      border-radius: 8px;
    }
    .qr-code-text {
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      color: #92400e;
      margin-top: 10px;
      letter-spacing: 0.5px;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none !important; }
      .ticket-container { box-shadow: none; border: 1px solid #ddd; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  ${
    forExport
      ? ''
      : `<!-- TOP ACTION BAR -->
  <div class="action-bar no-print">
    <button id="btn-pdf" class="action-btn btn-pdf" onclick="downloadTicket('pdf')">
      📥 Download PDF Ticket
    </button>
    <button id="btn-img" class="action-btn btn-img" onclick="downloadTicket('image')">
      🖼️ Download Image (PNG)
    </button>
    <button class="action-btn btn-print" onclick="window.print()">
      🖨️ Print Ticket
    </button>
  </div>`
  }

  <div class="ticket-container" id="ticket-pass-card">
    <!-- HEADER: ROYAL INDIGO (IMAGE 2) -->
    <div class="ticket-header">
      <div class="header-badge">&#127925; OFFICIAL TICKET PASS</div>
      
      <table class="header-table">
        <tr>
          <td align="left" width="58" style="vertical-align: middle;">
            <img src="${mascotSrc}" alt="WeGrow Mascot" class="mascot-left" />
          </td>
          <td align="center" style="vertical-align: middle; padding-right: 58px;">
            <div class="header-title">WeGrow Sing Along 2026</div>
            <div class="header-subtitle">Live Music Event</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="content">
      <!-- EVENT HIGHLIGHTS BAR -->
      <div class="event-bar">
        <div class="event-bar-item"><span>📍</span> Arasan Turf, Sivakasi</div>
        <div class="event-bar-item"><span>📅</span> Sun, Sep 27, 2026</div>
        <div class="event-bar-item"><span>✨</span> Instant QR Pass</div>
        <div class="event-bar-item"><span>📞</span> <a href="tel:+919344037331" style="color:#16a34a; text-decoration:none;">+91 93440 37331</a></div>
      </div>

      ${
        booking.isActive === false
          ? `<div style="background:#fee2e2; border:1px solid #f87171; color:#991b1b; padding:12px; border-radius:10px; margin-bottom:16px; font-weight:700; text-align:center;">
              ⚠️ This ticket has been cancelled or deactivated. Entry will not be allowed at the gate.
             </div>`
          : ''
      }

      <!-- PASS CARD (IMAGE 3) -->
      <div class="pass-card">
        <div class="pass-title-row">
          <div>
            <div class="pass-title">Sing Along Entry Pass</div>
            <div class="pass-subtitle">WeGrow B School Live Music Celebration</div>
          </div>
          <div class="booking-id-badge">${booking.bookingId}</div>
        </div>

        <table class="info-table">
          <tr><td class="label">Attendee Name</td><td class="value">${booking.fullName}</td></tr>
          <tr><td class="label">Mobile Number</td><td class="value">${booking.phone}</td></tr>
          <tr><td class="label">Ticket Quantity</td><td class="value">${booking.ticketQty} ${booking.ticketQty > 1 ? 'Tickets (Admit ' + booking.ticketQty + ')' : 'Ticket (Admit 1)'}</td></tr>
          <tr><td class="label">Amount Paid</td><td class="value" style="color:#059669; font-size:16px;">₹${booking.totalAmount}</td></tr>
          <tr><td class="label">Venue</td><td class="value" style="color:#78350f;">Arasan Turf, Sivakasi</td></tr>
          <tr><td class="label">Event Date</td><td class="value" style="color:#78350f;">Sunday, 27 September 2026</td></tr>
          <tr><td class="label">Payment Method</td><td class="value">${booking.paymentMethod || 'CASHFREE (upi)'}</td></tr>
          ${booking.utr ? `<tr><td class="label">Reference / UTR</td><td class="value" style="font-family:monospace;">${booking.utr}</td></tr>` : ''}
          ${booking.orderId ? `<tr><td class="label">Order ID</td><td class="value" style="font-family:monospace; font-size:13px;">${booking.orderId}</td></tr>` : ''}
          <tr><td class="label">Confirmation Date</td><td class="value">${formattedDate}</td></tr>
        </table>

        <!-- QR CODE -->
        <div class="qr-box">
          <img src="${qrUrl}" alt="Gate QR Pass" width="200" height="200" />
          <div class="qr-code-text">${token}</div>
          <div style="font-size:11px; color:#78716c; margin-top:4px;">Scan on-gate scanner for instant admission</div>
        </div>
      </div>

      <div style="margin-top:16px; text-align:center; font-size:12px; color:#78716c;">
        <strong>WeGrow B School</strong> &bull; Empowering Skills. Transforming Futures.<br>
        <a href="https://www.wegrowbschool.in" style="color:#4338ca; text-decoration:none; font-weight:700;">www.wegrowbschool.in</a>
        <div style="margin-top:14px; padding-top:10px; border-top:1px dashed #e2e8f0; font-size:11px; color:#94a3b8;">
          Event Staff / Gatekeeper? <a href="/api/v1/sing-along/admin/scanner" style="color:#4338ca; font-weight:700; text-decoration:none;">📱 Open Mobile Gate Scanner</a>
        </div>
      </div>
    </div>
  </div>

  ${
    forExport
      ? ''
      : `<script>
    async function downloadTicket(type) {
      const isPdf = type === 'pdf';
      const btn = document.getElementById(isPdf ? 'btn-pdf' : 'btn-img');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = isPdf ? '⏳ Preparing PDF...' : '⏳ Preparing Image...';
      
      const downloadPath = '/api/v1/sing-along/ticket/${booking.bookingId}/' + (isPdf ? 'pdf' : 'image');
      const fileName = 'SingAlong_Ticket_${booking.bookingId}.' + (isPdf ? 'pdf' : 'png');

      try {
        const res = await fetch(downloadPath);
        if (!res.ok) throw new Error('Download failed: ' + res.statusText);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        btn.innerHTML = isPdf ? '✅ PDF Downloaded' : '✅ Image Downloaded';
      } catch (err) {
        console.warn('Direct fetch failed, navigating to download endpoint...', err);
        window.location.href = downloadPath;
      } finally {
        setTimeout(() => {
          btn.innerHTML = origText;
          btn.disabled = false;
        }, 3000);
      }
    }

    // Auto-trigger direct PDF or Image download if query param is set
    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const dl = (params.get('download') || params.get('format') || '').toLowerCase();
      if (dl === 'pdf') {
        setTimeout(() => downloadTicket('pdf'), 300);
      } else if (dl === 'img' || dl === 'image' || dl === 'png') {
        setTimeout(() => downloadTicket('image'), 300);
      }
    });
  </script>`
  }
</body>
</html>
    `;
  }

  // =========================================================================
  // GENERATE BINARY TICKET PDF VIA PUPPETEER (SERVER-SIDE 100% RELIABLE)
  // =========================================================================
  async getTicketPdf(idOrBookingId: string): Promise<Buffer> {
    const html = await this.getTicketHtml(idOrBookingId, true);
    let browser: any = null;
    try {
      const puppeteerModule = await import('puppeteer');
      const puppeteer = puppeteerModule.default || puppeteerModule;
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
      });
      return Buffer.from(pdf);
    } catch (err: any) {
      this.logger.error(`Failed to generate ticket PDF: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException(`Failed to generate PDF: ${err?.message}`);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  // =========================================================================
  // GENERATE BINARY TICKET PNG IMAGE VIA PUPPETEER (SERVER-SIDE)
  // =========================================================================
  async getTicketImage(idOrBookingId: string): Promise<Buffer> {
    const html = await this.getTicketHtml(idOrBookingId, true);
    let browser: any = null;
    try {
      const puppeteerModule = await import('puppeteer');
      const puppeteer = puppeteerModule.default || puppeteerModule;
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 580, height: 1000, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
      const element = await page.$('#ticket-pass-card');
      const screenshot = element
        ? await element.screenshot({ type: 'png' })
        : await page.screenshot({ type: 'png', fullPage: true });
      return Buffer.from(screenshot);
    } catch (err: any) {
      this.logger.error(`Failed to generate ticket Image: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException(`Failed to generate Image: ${err?.message}`);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  // =========================================================================
  // GENERATE PURE PNG QR CODE BUFFER (NEVER FAILS, DIRECT FOR EMAIL & PASS)
  // =========================================================================
  async getTicketQrBuffer(idOrBookingId: string): Promise<Buffer> {
    const cleanId = this.extractBookingId(idOrBookingId);
    const redirectUrl = `https://www.wegrowbschool.in/sing-along?bookingId=${cleanId}`;
    return QRCode.toBuffer(redirectUrl, {
      type: 'png',
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  // =========================================================================
  // SERVE OFFICIAL WEGROW MASCOT PNG BUFFER (FOR EMAILS & HEADERS)
  // =========================================================================
  async getMascotPngBuffer(): Promise<Buffer> {
    const fs = await import('fs');
    const path = await import('path');
    const mascotPath = path.join(process.cwd(), 'src/sing-along/assets/mascot.png');
    if (fs.existsSync(mascotPath)) {
      return fs.readFileSync(mascotPath);
    }
    const res = await fetch('https://www.wegrowbschool.in/mascot.webp');
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }

  // =========================================================================
  // VERIFY BOOKING BY BOOKING ID OR MONGODB _ID (PUBLIC / SCANNER)
  // =========================================================================
  async verifyBooking(idOrBookingId: string) {
    const term = (idOrBookingId || '').trim();
    if (!term) {
      throw new BadRequestException('Booking identifier is required.');
    }

    const cleanId = this.extractBookingId(term);
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    const booking: any = await this.bookingModel
      .findOne(
        isMongoId
          ? { $or: [{ bookingId: cleanId }, { _id: cleanId }] }
          : { bookingId: cleanId },
      )
      .select('-__v')
      .lean();

    if (!booking) {
      throw new NotFoundException(`No booking found for reference "${term}".`);
    }

    // Explicit check on isActive
    if (!booking.isActive) {
      return {
        isValid: false,
        isActive: false,
        status: 'INACTIVE',
        message: `❌ Ticket ${booking.bookingId} (${booking.fullName}) is INACTIVE / DEACTIVATED. Check-in is not permitted.`,
        booking,
      };
    }

    return {
      isValid: true,
      isActive: true,
      booking,
      verificationToken: `SINGALONG-VERIFY:${booking.bookingId}`,
    };
  }

  // =========================================================================
  // ADMIN MOBILE SCANNER WEB APP (FULL CAMERA SCANNER FOR MOBILE PHONES)
  // =========================================================================
  async getAdminScannerHtml(): Promise<string> {
    const mascotSrc = await this.getMascotBase64();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>WeGrow Sing Along 2026 &bull; Admin Gate Scanner</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#090d16">
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      margin: 0;
      padding: 0;
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* TOP NAV HEADER */
    .app-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-logo {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 2px solid #a855f7;
      background: #fff;
    }
    .header-text h1 {
      font-size: 15px;
      margin: 0;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.2px;
    }
    .header-text p {
      font-size: 11px;
      margin: 2px 0 0 0;
      color: #a5b4fc;
      font-weight: 600;
    }
    .badge-admin {
      background: rgba(168, 85, 247, 0.2);
      border: 1px solid #a855f7;
      color: #d8b4fe;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
    }
    .btn-logout {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }

    .container {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 500px;
      width: 100%;
      margin: 0 auto;
    }

    /* LOGIN CARD */
    .card {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .login-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
      text-align: center;
    }
    .login-sub {
      font-size: 13px;
      color: #94a3b8;
      text-align: center;
      margin-bottom: 22px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #cbd5e1;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-input {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: #818cf8;
    }
    .btn-submit {
      width: 100%;
      background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
      color: #ffffff;
      border: none;
      padding: 14px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .alert-box {
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 14px;
      display: none;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }

    /* SCANNER VIEW */
    .scanner-view {
      width: 100%;
      display: none;
      flex-direction: column;
      align-items: center;
    }

    /* STATS STRIP */
    .stats-strip {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .stats-item {
      font-size: 12px;
      color: #94a3b8;
    }
    .stats-item strong {
      color: #38bdf8;
      font-size: 14px;
    }

    /* CAMERA VIEWFINDER */
    .reader-wrapper {
      width: 100%;
      position: relative;
      background: #000;
      border-radius: 18px;
      overflow: hidden;
      border: 2px solid #3b82f6;
      box-shadow: 0 0 25px rgba(59, 130, 246, 0.3);
      margin-bottom: 16px;
      min-height: 280px;
    }
    #reader {
      width: 100% !important;
      border: none !important;
    }
    #reader video {
      width: 100% !important;
      height: auto !important;
      border-radius: 16px;
      object-fit: cover;
    }
    .laser-line {
      position: absolute;
      top: 25%;
      left: 10%;
      right: 10%;
      height: 2px;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e, 0 0 20px #22c55e;
      animation: scanLaser 2.2s infinite ease-in-out;
      pointer-events: none;
      z-index: 10;
    }
    @keyframes scanLaser {
      0% { top: 20%; opacity: 0.9; }
      50% { top: 80%; opacity: 1; }
      100% { top: 20%; opacity: 0.9; }
    }

    /* CAMERA CONTROLS */
    .controls-row {
      display: flex;
      gap: 10px;
      width: 100%;
      margin-bottom: 16px;
    }
    .btn-ctrl {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
      padding: 10px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-ctrl.active {
      background: #3b82f6;
      color: #fff;
      border-color: #60a5fa;
    }

    /* MANUAL ENTRY */
    .manual-box {
      width: 100%;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
    }
    .manual-row {
      display: flex;
      gap: 8px;
    }
    .manual-input {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      color: #fff;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 14px;
      text-transform: uppercase;
      outline: none;
    }
    .btn-verify {
      background: #10b981;
      color: #fff;
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }

    /* RESULT MODAL / CARD */
    #result-card {
      display: none;
      width: 100%;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      animation: popIn 0.25s ease-out;
    }
    @keyframes popIn {
      0% { transform: scale(0.95); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .res-success {
      background: #064e3b;
      border: 2px solid #10b981;
      color: #ecfdf5;
    }
    .res-warning {
      background: #78350f;
      border: 2px solid #f59e0b;
      color: #fef3c7;
    }
    .res-error {
      background: #7f1d1d;
      border: 2px solid #ef4444;
      color: #fee2e2;
    }
    .res-title {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .res-details {
      background: rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      padding: 12px;
      margin: 12px 0;
      font-size: 13px;
      line-height: 1.6;
    }
    .res-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .res-row .lbl { opacity: 0.8; }
    .res-row .val { font-weight: 700; }
    .btn-next {
      width: 100%;
      background: #ffffff;
      color: #0f172a;
      border: none;
      padding: 12px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      margin-top: 8px;
    }
  </style>
</head>
<body>

  <!-- TOP HEADER -->
  <header class="app-header">
    <div class="header-left">
      <img src="${mascotSrc}" alt="Logo" class="header-logo" />
      <div class="header-text">
        <h1>WeGrow Sing Along</h1>
        <p>Gate Admission Scanner</p>
      </div>
    </div>
    <div id="user-badge-container" style="display:none; align-items:center; gap:8px;">
      <span class="badge-admin">ADMIN</span>
      <button class="btn-logout" onclick="logoutAdmin()">Logout</button>
    </div>
  </header>

  <div class="container">

    <!-- 1. LOGIN SCREEN -->
    <div id="login-card" class="card">
      <div class="login-title">🔐 Gate Admin Login</div>
      <div class="login-sub">Log in with your administrator account to verify and check in ticket passes</div>

      <div id="login-error" class="alert-box alert-error"></div>

      <form onsubmit="handleLogin(event)">
        <div class="form-group">
          <label>Admin Email</label>
          <input type="email" id="login-email" class="form-input" placeholder="admin@wegrowbschool.in" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-password" class="form-input" placeholder="••••••••" required />
        </div>
        <button type="submit" id="btn-login-submit" class="btn-submit">
          <span>🚀 Open Camera Scanner</span>
        </button>
      </form>
    </div>

    <!-- 2. SCANNER SCREEN -->
    <div id="scanner-view" class="scanner-view">

      <!-- STATS STRIP -->
      <div class="stats-strip">
        <div class="stats-item">Session Checked In: <strong id="stat-count">0</strong></div>
        <div class="stats-item">Status: <span style="color:#22c55e; font-weight:700;">● Active</span></div>
      </div>

      <!-- SCAN RESULT CARD -->
      <div id="result-card">
        <div id="res-title" class="res-title"></div>
        <div id="res-msg" style="font-size:14px; font-weight:600; margin-bottom:8px;"></div>
        <div id="res-details" class="res-details"></div>
        <button class="btn-next" onclick="dismissResultAndResume()">📷 Scan Next Ticket</button>
      </div>

      <!-- VIEWFINDER WRAPPER -->
      <div class="reader-wrapper">
        <div class="laser-line" id="laser"></div>
        <div id="reader"></div>
      </div>

      <!-- CONTROLS -->
      <div class="controls-row">
        <button class="btn-ctrl" id="btn-torch" onclick="toggleTorch()">🔦 Torch</button>
        <button class="btn-ctrl" id="btn-flip" onclick="flipCamera()">🔄 Flip Camera</button>
        <button class="btn-ctrl" id="btn-sound" onclick="toggleSound()">🔊 Sound: ON</button>
      </div>

      <!-- MANUAL CODE ENTRY -->
      <div class="manual-box">
        <div style="font-size:12px; font-weight:700; color:#94a3b8; margin-bottom:8px;">MANUAL VERIFICATION (IF QR UNREADABLE)</div>
        <div class="manual-row">
          <input type="text" id="manual-code" class="manual-input" placeholder="e.g. SA26-010" />
          <button class="btn-verify" onclick="handleManualVerify()">Verify</button>
        </div>
      </div>

    </div>

  </div>

  <script>
    let html5QrCode = null;
    let isScanning = false;
    let currentFacingMode = 'environment';
    let torchOn = false;
    let soundEnabled = true;
    let checkedInCount = 0;
    let scanCooldown = false;

    // AUDIO SYNTHESIZER
    function playSound(type) {
      if (!soundEnabled) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        } else {
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.25);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        }
      } catch (e) {}
    }

    // CHECK AUTH ON LOAD
    window.addEventListener('DOMContentLoaded', () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        showScanner();
      } else {
        showLogin();
      }
    });

    function showLogin() {
      document.getElementById('login-card').style.display = 'block';
      document.getElementById('scanner-view').style.display = 'none';
      document.getElementById('user-badge-container').style.display = 'none';
    }

    function showScanner() {
      document.getElementById('login-card').style.display = 'none';
      document.getElementById('scanner-view').style.display = 'flex';
      document.getElementById('user-badge-container').style.display = 'flex';
      startScanner();
    }

    // LOGIN ACTION
    async function handleLogin(e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      const btn = document.getElementById('btn-login-submit');
      const errBox = document.getElementById('login-error');

      errBox.style.display = 'none';
      btn.disabled = true;
      btn.innerHTML = '⏳ Authenticating...';

      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || 'Invalid email or password');
        }

        const role = json.data?.user?.role;
        if (role !== 'ADMIN') {
          throw new Error('Access Denied: Only Admin accounts are authorized to operate the Gate Scanner.');
        }

        const token = json.data?.accessToken;
        if (!token) throw new Error('No authentication token received');

        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(json.data.user));
        showScanner();
      } catch (err) {
        errBox.innerText = err.message || 'Login failed';
        errBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🚀 Open Camera Scanner</span>';
      }
    }

    function logoutAdmin() {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(() => {});
      }
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      showLogin();
    }

    // CAMERA SCANNER INITIALIZATION
    async function startScanner() {
      if (isScanning) return;
      try {
        html5QrCode = new Html5Qrcode("reader");
        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: currentFacingMode },
          config,
          onScanSuccess,
          () => {} // ignore frame misses
        );
        isScanning = true;
        document.getElementById('laser').style.display = 'block';
      } catch (err) {
        console.warn('Camera launch failed:', err);
        // Fallback or retry with generic environment
        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: 250 },
            onScanSuccess,
            () => {}
          );
          isScanning = true;
        } catch (e) {
          alert('Could not open camera: ' + (e.message || 'Please check browser camera permissions.'));
        }
      }
    }

    async function onScanSuccess(decodedText) {
      if (scanCooldown) return;
      scanCooldown = true;

      // Vibrate phone
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      await processTicket(decodedText);
    }

    async function processTicket(qrData) {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        logoutAdmin();
        return;
      }

      const resCard = document.getElementById('result-card');
      const resTitle = document.getElementById('res-title');
      const resMsg = document.getElementById('res-msg');
      const resDetails = document.getElementById('res-details');

      try {
        const res = await fetch('/api/v1/sing-along/admin/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ qrData, autoCheckIn: true }),
        });

        const json = await res.json();

        resCard.className = '';
        resCard.style.display = 'block';

        if (res.status === 401 || res.status === 403) {
          logoutAdmin();
          alert('Session expired or unauthorized. Please log in again.');
          return;
        }

        const attendee = json.attendee || {};

        if (json.success && !json.alreadyAttended) {
          // 1. SUCCESS: FRESH CHECK-IN
          playSound('success');
          checkedInCount++;
          document.getElementById('stat-count').innerText = checkedInCount;

          resCard.classList.add('res-success');
          resTitle.innerHTML = '✅ ADMISSION GRANTED';
          resMsg.innerText = json.message || 'Ticket checked in successfully!';
          resDetails.innerHTML = 
            '<div class="res-row"><span class="lbl">Attendee:</span><span class="val">' + (attendee.fullName || 'Guest') + '</span></div>' +
            '<div class="res-row"><span class="lbl">Booking ID:</span><span class="val">' + (attendee.bookingId || qrData) + '</span></div>' +
            '<div class="res-row"><span class="lbl">Pass Count:</span><span class="val">' + (attendee.ticketQty || 1) + ' Ticket(s)</span></div>' +
            '<div class="res-row"><span class="lbl">Amount:</span><span class="val">₹' + (attendee.totalAmount || 199) + '</span></div>' +
            '<div class="res-row"><span class="lbl">Phone:</span><span class="val">' + (attendee.phone || '-') + '</span></div>' +
            '<div class="res-row"><span class="lbl">Gate Time:</span><span class="val">' + new Date().toLocaleTimeString('en-IN') + '</span></div>';
        } else if (json.alreadyAttended) {
          // 2. WARNING: ALREADY CHECKED IN
          playSound('error');
          resCard.classList.add('res-warning');
          resTitle.innerHTML = '⚠️ ALREADY CHECKED IN';
          resMsg.innerText = json.message || 'This ticket was already checked in earlier!';
          resDetails.innerHTML = 
            '<div class="res-row"><span class="lbl">Attendee:</span><span class="val">' + (attendee.fullName || '-') + '</span></div>' +
            '<div class="res-row"><span class="lbl">Booking ID:</span><span class="val">' + (attendee.bookingId || qrData) + '</span></div>' +
            '<div class="res-row"><span class="lbl">Check-In Time:</span><span class="val">' + (attendee.attendedAt ? new Date(attendee.attendedAt).toLocaleTimeString('en-IN') : 'Earlier today') + '</span></div>';
        } else {
          // 3. ERROR: INACTIVE / CANCELLED / NOT FOUND
          playSound('error');
          resCard.classList.add('res-error');
          resTitle.innerHTML = '❌ ADMISSION DENIED';
          resMsg.innerText = json.message || 'Ticket is inactive or not found!';
          resDetails.innerHTML = 
            '<div class="res-row"><span class="lbl">Status:</span><span class="val">' + (json.status || 'REJECTED') + '</span></div>' +
            '<div class="res-row"><span class="lbl">Reference:</span><span class="val">' + (attendee.bookingId || qrData) + '</span></div>' +
            (attendee.fullName ? '<div class="res-row"><span class="lbl">Attendee:</span><span class="val">' + attendee.fullName + '</span></div>' : '');
        }
      } catch (err) {
        playSound('error');
        resCard.className = 'res-error';
        resCard.style.display = 'block';
        resTitle.innerHTML = '❌ SCAN ERROR';
        resMsg.innerText = err.message || 'Failed to verify ticket with server.';
        resDetails.innerHTML = '';
      }
    }

    function dismissResultAndResume() {
      document.getElementById('result-card').style.display = 'none';
      setTimeout(() => {
        scanCooldown = false;
      }, 500);
    }

    async function handleManualVerify() {
      const code = document.getElementById('manual-code').value.trim();
      if (!code) {
        alert('Please enter a booking ID (e.g. SA26-010)');
        return;
      }
      await processTicket(code);
      document.getElementById('manual-code').value = '';
    }

    // CAMERA TOGGLE HELPERS
    async function flipCamera() {
      if (!html5QrCode) return;
      try {
        await html5QrCode.stop();
        isScanning = false;
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        await startScanner();
      } catch (e) {
        console.warn('Flip failed:', e);
      }
    }

    async function toggleTorch() {
      try {
        if (!html5QrCode) return;
        torchOn = !torchOn;
        await html5QrCode.applyVideoConstraints({
          advanced: [{ torch: torchOn }]
        });
        const btn = document.getElementById('btn-torch');
        btn.classList.toggle('active', torchOn);
      } catch (e) {
        alert('Flashlight is not supported on this device/browser.');
      }
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      const btn = document.getElementById('btn-sound');
      btn.innerText = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      btn.classList.toggle('active', soundEnabled);
    }
  </script>
</body>
</html>
    `;
  }

  // =========================================================================
  // UNIVERSAL BOOKING ID PARSER & EXTRACTOR
  // =========================================================================
  extractBookingId(input: string): string {
    if (!input) return '';
    let str = input.trim();

    // 1. URL query param: bookingId=SA26-010
    const queryMatch = str.match(/[?&]bookingId=([a-zA-Z0-9_-]+)/i);
    if (queryMatch) return queryMatch[1].toUpperCase();

    // 2. URL path: /(scan|ticket|verify)/SA26-010
    const pathMatch = str.match(/(?:scan|ticket|verify)\/([a-zA-Z0-9_-]+)/i);
    if (pathMatch) return pathMatch[1].toUpperCase();

    // 3. Token prefix: SINGALONG-VERIFY:SA26-010
    str = str.replace(/^SINGALONG-VERIFY:/i, '').trim();

    // 4. Regex pattern matching SA26-XXX
    const saMatch = str.match(/\b(SA26-\d+)\b/i);
    if (saMatch) return saMatch[1].toUpperCase();

    return str.toUpperCase();
  }

  // =========================================================================
  // ADMIN SCANNER API: Scan QR Code & View / Check-in Attendee Details
  // =========================================================================
  async adminScanTicket(dto: ScanSingAlongDto) {
    const rawData = (dto.qrData || '').trim();
    if (!rawData) {
      throw new BadRequestException('QR scan data or booking ID is required.');
    }

    const bookingId = this.extractBookingId(rawData);
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(bookingId);

    const filter: Record<string, any> = isMongoId
      ? { $or: [{ bookingId }, { _id: bookingId }] }
      : { bookingId };

    const booking: any = await this.bookingModel.findOne(filter).select('-__v').lean();
    if (!booking) {
      throw new NotFoundException(
        `Ticket not found! Scanned reference: "${bookingId}". Please verify the booking ID or QR code.`,
      );
    }

    // Explicit check on isActive: Only true enables admin side checkin!
    if (!booking.isActive) {
      return {
        success: false,
        alreadyAttended: false,
        status: 'INACTIVE_OR_CANCELLED',
        message: `❌ Ticket ${booking.bookingId} (${booking.fullName}) is INACTIVE / DEACTIVATED. Check-in is NOT permitted.`,
        attendee: {
          bookingId: booking.bookingId,
          fullName: booking.fullName,
          phone: booking.phone,
          status: booking.status,
          isActive: false,
        },
      };
    }

    const autoCheckIn = dto.autoCheckIn !== false;

    // 1. Check if already checked in
    if (booking.attended || booking.status === SingAlongBookingStatus.ATTENDED) {
      return {
        success: true,
        alreadyAttended: true,
        status: 'ALREADY_CHECKED_IN',
        message: `⚠️ Ticket already checked in! Attended at: ${
          booking.attendedAt ? new Date(booking.attendedAt).toLocaleString('en-IN') : 'Earlier today'
        }.`,
        attendee: {
          bookingId: booking.bookingId,
          fullName: booking.fullName,
          phone: booking.phone,
          email: booking.email,
          ticketQty: booking.ticketQty,
          unitPrice: booking.unitPrice,
          totalAmount: booking.totalAmount,
          paymentMethod: booking.paymentMethod,
          utr: booking.utr,
          orderId: booking.orderId,
          status: booking.status,
          attended: true,
          attendedAt: booking.attendedAt,
          isActive: true,
        },
      };
    }

    // 2. Perform atomic check-in
    if (autoCheckIn) {
      const now = new Date();
      const updated: any = await this.bookingModel
        .findOneAndUpdate(
          { _id: booking._id, attended: false, isActive: true },
          {
            $set: {
              attended: true,
              status: SingAlongBookingStatus.ATTENDED,
              attendedAt: now,
            },
          },
          { new: true },
        )
        .select('-__v')
        .lean();

      this.statsCache = null;

      return {
        success: true,
        alreadyAttended: false,
        status: 'CHECK_IN_SUCCESS',
        message: `✅ Gate Check-In Successful! Welcome, ${booking.fullName}! (${booking.ticketQty} ticket${booking.ticketQty > 1 ? 's' : ''})`,
        attendee: {
          bookingId: updated?.bookingId || booking.bookingId,
          fullName: updated?.fullName || booking.fullName,
          phone: updated?.phone || booking.phone,
          email: updated?.email || booking.email,
          ticketQty: updated?.ticketQty || booking.ticketQty,
          unitPrice: updated?.unitPrice || booking.unitPrice,
          totalAmount: updated?.totalAmount || booking.totalAmount,
          paymentMethod: updated?.paymentMethod || booking.paymentMethod,
          utr: updated?.utr || booking.utr,
          orderId: updated?.orderId || booking.orderId,
          status: SingAlongBookingStatus.ATTENDED,
          attended: true,
          attendedAt: now,
          isActive: true,
        },
      };
    }

    // 3. Preview mode (autoCheckIn: false)
    return {
      success: true,
      alreadyAttended: false,
      status: 'VERIFIED',
      message: `Ticket verified: ${booking.fullName} (${booking.ticketQty} pass${booking.ticketQty > 1 ? 'es' : ''})`,
      attendee: {
        bookingId: booking.bookingId,
        fullName: booking.fullName,
        phone: booking.phone,
        email: booking.email,
        ticketQty: booking.ticketQty,
        unitPrice: booking.unitPrice,
        totalAmount: booking.totalAmount,
        paymentMethod: booking.paymentMethod,
        utr: booking.utr,
        orderId: booking.orderId,
        status: booking.status,
        attended: booking.attended,
        attendedAt: booking.attendedAt,
        isActive: true,
      },
    };
  }

  // =========================================================================
  // CHECK-IN ATTENDEE (SCANNER / GATE OPERATOR)
  // =========================================================================
  async checkIn(idOrBookingId: string) {
    const term = (idOrBookingId || '').trim();
    if (!term) {
      throw new BadRequestException('Booking identifier is required.');
    }

    const cleanId = this.extractBookingId(term);
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(cleanId);

    const baseFilter: Record<string, any> = isMongoId
      ? { $or: [{ bookingId: cleanId }, { _id: cleanId }] }
      : { bookingId: cleanId };

    const existing: any = await this.bookingModel
      .findOne(baseFilter)
      .select('-__v')
      .lean();

    if (!existing) {
      throw new NotFoundException(`No booking found for reference "${term}".`);
    }

    if (!existing.isActive) {
      return {
        success: false,
        alreadyAttended: false,
        status: 'INACTIVE',
        message: `❌ Ticket ${existing.bookingId} (${existing.fullName}) is INACTIVE / DEACTIVATED. Check-in is NOT permitted.`,
        booking: existing,
      };
    }

    const now = new Date();

    // Single atomic check-and-update if not yet attended
    const updated = await this.bookingModel
      .findOneAndUpdate(
        { ...baseFilter, attended: false, isActive: true },
        {
          $set: {
            attended: true,
            status: SingAlongBookingStatus.ATTENDED,
            attendedAt: now,
          },
        },
        { new: true },
      )
      .select('-__v')
      .lean();

    if (updated) {
      this.statsCache = null;

      return {
        success: true,
        alreadyAttended: false,
        message: `Check-in successful for ${updated.fullName} (${updated.ticketQty} ticket${updated.ticketQty > 1 ? 's' : ''})`,
        booking: updated,
      };
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
