import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SingPaymentService } from './sing-payment.service';
import {
  CreateSingPaymentOrderDto,
  SubmitSingUtrDto,
  VerifySingPaymentDto,
} from './dto/create-sing-payment-order.dto';

@ApiTags('Sing Along Cashfree Payment')
@Controller('sing-payment')
export class SingPaymentController {
  constructor(private readonly singPaymentService: SingPaymentService) {}

  // =====================================================
  // 1. CREATE PAYMENT ORDER
  // =====================================================
  @Post('create-order')
  @ApiOperation({
    summary: 'Create Cashfree order & payment_session_id for Sing Along',
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
  // Configured in Cashfree Dashboard:
  // https://wegrow-connect-backend-1.onrender.com/api/v1/sing-payment/webhook
  // =====================================================
  @Post('webhook')
  @ApiOperation({
    summary: 'Cashfree webhook listener for Sing Along ticket payments',
  })
  async handleWebhook(
    @Body() body: any,
    @Req() req: Request,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const rawBody = (req as any).rawBody || body;
    return this.singPaymentService.handleWebhook(body, rawBody, headers);
  }

  // =====================================================
  // 3. CHECK ORDER PAYMENT STATUS (Polling from frontend QR / Checkout)
  // =====================================================
  @Get('status/:orderId')
  @ApiOperation({
    summary: 'Get payment status of an order by Order ID',
  })
  async getStatus(@Param('orderId') orderId: string) {
    return this.singPaymentService.getPaymentStatus(orderId);
  }

  // =====================================================
  // 4. VERIFY PAYMENT (Active verification from frontend)
  // =====================================================
  @Post('verify')
  @ApiOperation({
    summary: 'Verify payment by Order ID and return confirmed booking',
  })
  async verifyOrder(@Body() dto: VerifySingPaymentDto) {
    return this.singPaymentService.getPaymentStatus(dto.orderId);
  }

  // =====================================================
  // 5. SUBMIT MANUAL UPI TRANSACTION ID / UTR
  // =====================================================
  @Post('submit-utr')
  @ApiOperation({
    summary: 'Submit 12-digit UPI Transaction ID / UTR after QR scan',
  })
  async submitUtr(@Body() dto: SubmitSingUtrDto) {
    return this.singPaymentService.submitUtr(dto);
  }
}
