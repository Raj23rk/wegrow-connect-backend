import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('Payments & Razorpay')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // =====================================================
  // GET PUBLIC RAZORPAY CONFIG
  // =====================================================
  @Get('config')
  @ApiOperation({ summary: 'Get public Razorpay Key ID for client checkout' })
  getConfig() {
    return {
      success: true,
      data: this.paymentsService.getConfig(),
    };
  }

  // =====================================================
  // CREATE PAYMENT ORDER
  // =====================================================
  @Post('create-order')
  @ApiOperation({ summary: 'Create a new Razorpay payment order' })
  async createOrder(@Body() dto: CreatePaymentOrderDto) {
    const data = await this.paymentsService.createOrder(dto);
    return {
      success: true,
      message: 'Razorpay order created successfully',
      data,
    };
  }

  // =====================================================
  // VERIFY PAYMENT SIGNATURE
  // =====================================================
  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature & capture' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    const data = await this.paymentsService.verifyPayment(dto);
    return {
      success: true,
      message: 'Payment verified successfully',
      data,
    };
  }

  // =====================================================
  // GET PAYMENT BY ID / ORDER ID
  // =====================================================
  @Get(':id')
  @ApiOperation({ summary: 'Get payment status by Order ID or Payment ID' })
  async getPayment(@Param('id') id: string) {
    const data = await this.paymentsService.getPayment(id);
    return {
      success: true,
      data,
    };
  }

  // =====================================================
  // WEBHOOK LISTENER
  // =====================================================
  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay webhook listener' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
