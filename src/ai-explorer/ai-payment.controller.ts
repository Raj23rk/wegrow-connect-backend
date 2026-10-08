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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiPaymentService } from './ai-payment.service';
import {
  CreateAiPaymentOrderDto,
  SubmitAiUtrDto,
  VerifyAiPaymentDto,
} from './dto/create-ai-payment-order.dto';

@ApiTags('AI Explorer Payment Gateway')
@Controller('ai-explorer')
export class AiPaymentController {
  constructor(private readonly aiPaymentService: AiPaymentService) {}

  // =====================================================
  // 1. CREATE PAYMENT ORDER (Cashfree Order & Session)
  // =====================================================
  @Post('create-order')
  @ApiOperation({ summary: 'Create payment order session for AI Explorer enrollment' })
  async createOrder(@Body() dto: CreateAiPaymentOrderDto) {
    const data = await this.aiPaymentService.createOrder(dto);
    return {
      success: true,
      message: 'Payment order created successfully',
      data,
    };
  }

  // =====================================================
  // 2. CASHFREE WEBHOOK LISTENER
  // =====================================================
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cashfree Webhook listener for AI Explorer payments' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
    @Req() req?: any,
  ) {
    return this.aiPaymentService.handleCashfreeWebhook(
      body,
      signature,
      timestamp,
      req,
    );
  }

  // =====================================================
  // 3. CHECK PAYMENT STATUS (Real-time polling)
  // =====================================================
  @Get('payment/status/:orderId')
  @ApiOperation({ summary: 'Get payment status of an order in real-time' })
  async getStatus(@Param('orderId') orderId: string) {
    return this.aiPaymentService.getPaymentStatus(orderId);
  }

  // =====================================================
  // 4. VERIFY PAYMENT (Active verification from frontend)
  // =====================================================
  @Post('verify-payment')
  @ApiOperation({ summary: 'Verify payment by Order ID' })
  async verifyOrder(@Body() dto: VerifyAiPaymentDto) {
    return this.aiPaymentService.getPaymentStatus(dto.orderId);
  }

  // =====================================================
  // 5. SUBMIT MANUAL UPI TRANSACTION ID / UTR
  // =====================================================
  @Post('submit-utr')
  @ApiOperation({ summary: 'Submit manual 12-digit UPI UTR reference' })
  async submitUtr(@Body() dto: SubmitAiUtrDto) {
    return this.aiPaymentService.submitUtr(dto);
  }
}
