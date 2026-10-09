import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AiExplorerPrebookingService } from './ai-explorer-prebooking.service';
import { CreateAiExplorerPrebookingDto } from './dto/create-ai-explorer-prebooking.dto';
import {
  CreateAiPrebookingOrderDto,
  SubmitAiPrebookingUtrDto,
  VerifyAiPrebookingPaymentDto,
} from './dto/create-ai-prebooking-order.dto';
import { QueryAiExplorerPrebookingDto } from './dto/query-ai-explorer-prebooking.dto';
import { UpdateAiExplorerPrebookingDto } from './dto/update-ai-explorer-prebooking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('AI Explorer Pre-Booking (₹1000 Advance Seat Reservation)')
@Controller('ai-explorer/prebooking')
export class AiExplorerPrebookingController {
  constructor(
    private readonly prebookingService: AiExplorerPrebookingService,
  ) {}

  // =========================================================================
  // 1. CREATE PAYMENT ORDER (Cashfree Order & Session at ₹1000/student)
  // =========================================================================
  @Post('create-order')
  @ApiOperation({ summary: 'Create Cashfree payment order session for AI Explorer pre-booking' })
  async createOrder(@Body() dto: CreateAiPrebookingOrderDto) {
    const data = await this.prebookingService.createOrder(dto);
    return {
      success: true,
      message: 'Payment order created successfully for AI Explorer Pre-booking',
      data,
    };
  }

  // =========================================================================
  // 2. CASHFREE WEBHOOK LISTENER
  // =========================================================================
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cashfree Webhook listener for pre-booking payments' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
    @Req() req?: any,
  ) {
    return this.prebookingService.handleCashfreeWebhook(
      body,
      signature,
      timestamp,
      req,
    );
  }

  // =========================================================================
  // 3. CHECK PAYMENT STATUS (Real-time polling)
  // =========================================================================
  @Get(['payment/status/:orderId', 'status/:orderId'])
  @ApiOperation({ summary: 'Get payment status of a prebooking order in real-time' })
  async getStatus(@Param('orderId') orderId: string) {
    return this.prebookingService.getPaymentStatus(orderId);
  }

  // =========================================================================
  // 4. VERIFY PAYMENT (Active verification from frontend)
  // =========================================================================
  @Post('verify-payment')
  @ApiOperation({ summary: 'Verify pre-booking payment by Order ID' })
  async verifyOrder(@Body() dto: VerifyAiPrebookingPaymentDto) {
    return this.prebookingService.getPaymentStatus(dto.orderId);
  }

  // =========================================================================
  // 5. SUBMIT MANUAL UPI TRANSACTION ID / UTR
  // =========================================================================
  @Post('submit-utr')
  @ApiOperation({ summary: 'Submit manual 12-digit UPI UTR reference for pre-booking' })
  async submitUtr(@Body() dto: SubmitAiPrebookingUtrDto) {
    return this.prebookingService.submitUtr(dto);
  }

  // =========================================================================
  // 6. PUBLIC DIRECT PRE-BOOKING ENROLLMENT / REGISTRATION
  // =========================================================================
  @Post('enroll')
  @ApiOperation({ summary: 'Submit direct AI Explorer pre-booking form (Public)' })
  async enroll(@Body() dto: CreateAiExplorerPrebookingDto) {
    const data = await this.prebookingService.enrollPrebooking(dto);
    return {
      success: true,
      message: 'AI Explorer Pre-booking registered successfully!',
      data,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Submit AI Explorer pre-booking alias (Public)' })
  async enrollAlias(@Body() dto: CreateAiExplorerPrebookingDto) {
    return this.enroll(dto);
  }

  // =========================================================================
  // 7. PUBLIC VERIFICATION BY PRE-BOOKING ID OR DB ID
  // =========================================================================
  @Get('verify/:id')
  @ApiOperation({ summary: 'Verify AI Explorer pre-booking by ID or Pre-booking ID (Public)' })
  async verify(@Param('id') id: string) {
    return this.prebookingService.verifyPrebooking(id);
  }

  // =========================================================================
  // 8. SERVE PRE-BOOKING LANDING HTML PAGE
  // =========================================================================
  @Get(['page', 'prebooking-page'])
  @ApiOperation({ summary: 'Get AI Explorer pre-booking HTML landing page' })
  async getPrebookingPage(@Res() res: Response) {
    const fs = await import('fs');
    const path = await import('path');
    const htmlPath = path.join(process.cwd(), 'public', 'ai-explorer-prebooking.html');
    if (fs.existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(htmlPath);
    }
    return res.status(HttpStatus.NOT_FOUND).send('Pre-booking page not found');
  }

  // =========================================================================
  // 9. ADMIN STATS & ANALYTICS (ADMIN ONLY)
  // Static route placed BEFORE dynamic :id routes
  // =========================================================================
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall AI Explorer pre-booking analytics & revenue stats (Admin Only)' })
  async getStats() {
    return this.prebookingService.getStats();
  }

  // =========================================================================
  // 10. ADMIN EXPORT TO CSV (ADMIN ONLY)
  // Static route placed BEFORE dynamic :id routes
  // =========================================================================
  @Get('admin/export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all AI Explorer pre-bookings as CSV file (Admin Only)' })
  async exportCsv(@Res() res: Response) {
    const csvData = await this.prebookingService.exportCsv();
    const filename = `ai_explorer_prebookings_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvData);
  }

  // =========================================================================
  // 11. ADMIN LIST PRE-BOOKINGS (WITH PAGINATION, SEARCH, FILTERS)
  // =========================================================================
  @Get(['admin/prebookings', 'admin/list', 'admin'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated list of all pre-bookings with search & filters (Admin Only)' })
  async findAll(@Query() query: QueryAiExplorerPrebookingDto) {
    return this.prebookingService.findAll(query);
  }

  // =========================================================================
  // 12. ADMIN RESEND CONFIRMATION EMAIL
  // =========================================================================
  @Post(['admin/resend-email/:id', 'admin/send-email/:id'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend pre-booking confirmation email (Admin Only)' })
  async resendEmail(
    @Param('id') id: string,
    @Body('email') email?: string,
  ) {
    return this.prebookingService.resendConfirmationEmail(id, email);
  }

  @Post('admin/send-email')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend pre-booking confirmation email by ID payload (Admin Only)' })
  async resendEmailBody(
    @Body() body: { id?: string; prebookingId?: string; email?: string },
  ) {
    const idToUse = body?.prebookingId || body?.id || '';
    return this.prebookingService.resendConfirmationEmail(idToUse, body?.email);
  }

  // =========================================================================
  // 13. ADMIN GET PRE-BOOKING BY ID
  // =========================================================================
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get AI Explorer pre-booking details by ID (Admin Only)' })
  async findOne(@Param('id') id: string) {
    return this.prebookingService.findOne(id);
  }

  // =========================================================================
  // 14. ADMIN UPDATE PRE-BOOKING
  // =========================================================================
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update AI Explorer pre-booking status, notes, or payment (Admin Only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAiExplorerPrebookingDto,
  ) {
    return this.prebookingService.update(id, dto);
  }

  // =========================================================================
  // 15. ADMIN DELETE PRE-BOOKING
  // =========================================================================
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete pre-booking (Admin Only)' })
  async remove(@Param('id') id: string) {
    return this.prebookingService.remove(id);
  }
}
