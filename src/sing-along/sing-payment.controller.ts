import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SingPaymentService } from './sing-payment.service';
import {
  CreateSingPaymentOrderDto,
  SubmitSingUtrDto,
  VerifySingPaymentDto,
} from './dto/create-sing-payment-order.dto';

@ApiTags('Sing Along Cashfree Payment')
@Controller('sing-payment')
export class SingPaymentController {
  constructor(
    private readonly singPaymentService: SingPaymentService,
    private readonly configService: ConfigService,
  ) {}

  // =====================================================
  // 1. CREATE PAYMENT ORDER (Cashfree Order & payment_session_id)
  // =====================================================
  @Post('create-order')
  @ApiOperation({
    summary: 'Create Cashfree payment order & session ID for Sing Along',
  })
  async createOrder(@Body() dto: CreateSingPaymentOrderDto) {
    const data = await this.singPaymentService.createOrder(dto);
    return {
      success: true,
      message: 'Payment order created successfully',
      data,
    };
  }

  // =====================================================
  // 2. CASHFREE WEBHOOK LISTENER
  // Handles POST /api/v1/sing-payment AND POST /api/v1/sing-payment/webhook
  // =====================================================
  @Post()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cashfree Webhook listener for Sing Along ticket payments',
  })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
    @Req() req?: Request,
  ) {
    return this.singPaymentService.handleCashfreeWebhook(
      body,
      signature,
      timestamp,
      req,
    );
  }

  @Get()
  @Get('webhook')
  @ApiOperation({
    summary: 'Health check for Cashfree webhook endpoint',
  })
  async webhookHealth() {
    return {
      status: 'ok',
      message: 'Cashfree Webhook listener is active and operational',
      timestamp: new Date().toISOString(),
    };
  }

  // =====================================================
  // 3. PAYU BROWSER CALLBACK (SURL / FURL Redirect handler - legacy fallback)
  // =====================================================
  @Post('payu-callback')
  @ApiOperation({
    summary: 'PayU SURL/FURL browser callback handler (legacy)',
  })
  async handlePayuCallback(@Body() body: any, @Res() res: Response) {
    const result = await this.singPaymentService.handlePayuCallback(body);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://www.wegrowbschool.in';

    if (result.status === 'SUCCESS') {
      return res.redirect(
        `${frontendUrl}/sing-along?payment=success&bookingId=${result.bookingId}&txnid=${result.txnid}`,
      );
    } else {
      return res.redirect(
        `${frontendUrl}/sing-along?payment=failed&txnid=${result.txnid}`,
      );
    }
  }

  // =====================================================
  // 4. CHECK ORDER PAYMENT STATUS (Real-time polling from frontend)
  // =====================================================
  @Get('status/:orderId')
  @ApiOperation({
    summary: 'Get payment status of an order by Order ID in real-time',
  })
  async getStatus(@Param('orderId') orderId: string) {
    return this.singPaymentService.getPaymentStatus(orderId);
  }

  // =====================================================
  // 5. VERIFY PAYMENT (Active verification from frontend)
  // =====================================================
  @Post('verify')
  @ApiOperation({
    summary: 'Verify payment by Order ID and return confirmed booking',
  })
  async verifyOrder(@Body() dto: VerifySingPaymentDto) {
    return this.singPaymentService.getPaymentStatus(dto.orderId);
  }

  // =====================================================
  // 6. SUBMIT MANUAL UPI TRANSACTION ID / UTR
  // =====================================================
  @Post('submit-utr')
  @ApiOperation({
    summary: 'Submit 12-digit UPI Transaction ID / UTR after QR scan',
  })
  async submitUtr(@Body() dto: SubmitSingUtrDto) {
    return this.singPaymentService.submitUtr(dto);
  }
}
