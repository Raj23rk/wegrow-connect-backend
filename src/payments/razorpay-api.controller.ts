import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('Razorpay Standard Checkout API')
@Controller()
export class RazorpayApiController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // =========================================================================
  // STEP 1: CREATE ORDER
  // Endpoints: POST /api/create-order, POST /create-order, POST /api/v1/create-order
  // =========================================================================
  @Post(['api/create-order', 'create-order', 'api/v1/create-order'])
  @ApiOperation({
    summary: 'STEP 1: Create Razorpay Order with amount in paise',
  })
  async createOrder(@Body() dto: CreatePaymentOrderDto) {
    const data = await this.paymentsService.createOrder(dto);
    return {
      success: true,
      order_id: data.order_id,
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      key_id: data.key_id,
      data,
    };
  }

  // =========================================================================
  // STEP 3: VERIFY SIGNATURE
  // Endpoints: POST /api/verify-payment, POST /verify-payment, POST /api/v1/verify-payment
  // =========================================================================
  @Post(['api/verify-payment', 'verify-payment', 'api/v1/verify-payment'])
  @ApiOperation({
    summary: 'STEP 3: Verify Razorpay signature using HMAC-SHA256',
  })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    const data = await this.paymentsService.verifyPayment(dto);
    return {
      success: true,
      message: 'Payment verified successfully',
      data,
    };
  }

  // =========================================================================
  // PUBLIC CONFIG
  // =========================================================================
  @Get(['api/config', 'api/razorpay-config', 'api/v1/razorpay-config'])
  @ApiOperation({ summary: 'Get public Razorpay Key ID for client checkout' })
  getConfig() {
    return {
      success: true,
      data: this.paymentsService.getConfig(),
    };
  }

  // =========================================================================
  // SERVE STANDALONE CHECKOUT PAGE
  // =========================================================================
  @Get(['checkout', 'checkout.html'])
  @ApiOperation({ summary: 'Serve Razorpay Standard Web Checkout demo page' })
  getCheckoutPage(@Res() res: Response) {
    const filePath = path.join(process.cwd(), 'public', 'checkout.html');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(filePath);
    }
    return res.status(HttpStatus.NOT_FOUND).send('Checkout page not found');
  }
}
