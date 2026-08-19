import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

import { SubscriptionsService } from './subscriptions.service';

import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ============================================================
  // PUBLIC: GET ALL ACTIVE PLANS
  // GET /subscriptions/plans
  // ============================================================

  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans returned' })
  getAllPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  // ============================================================
  // ADMIN: CREATE PLAN
  // POST /subscriptions/plans
  // ============================================================

  @Post('plans')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create a subscription plan' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  // ============================================================
  // ADMIN: UPDATE PLAN
  // PUT /subscriptions/plans/:id
  // ============================================================

  @Put('plans/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update a subscription plan' })
  updatePlan(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  // ============================================================
  // ADMIN: ALL SUBSCRIPTIONS
  // GET /subscriptions/all
  // ============================================================

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all subscriptions' })
  getAllSubscriptions(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.subscriptionsService.getAllSubscriptions(page, limit);
  }

  // ============================================================
  // USER: CREATE RAZORPAY ORDER
  // POST /subscriptions/create-order
  // ============================================================

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User: Create Razorpay payment order' })
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.subscriptionsService.createOrder(req.user.userId, dto);
  }

  // ============================================================
  // USER: VERIFY PAYMENT
  // POST /subscriptions/verify-payment
  // ============================================================

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User: Verify Razorpay payment and activate subscription' })
  verifyPayment(@Request() req: any, @Body() dto: VerifyPaymentDto) {
    return this.subscriptionsService.verifyPayment(req.user.userId, dto);
  }

  // ============================================================
  // USER: MY SUBSCRIPTIONS
  // GET /subscriptions/my
  // ============================================================

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User: Get my subscription history' })
  getMySubscriptions(@Request() req: any) {
    return this.subscriptionsService.getMySubscriptions(req.user.userId);
  }

  // ============================================================
  // USER: MY STATUS
  // GET /subscriptions/status
  // ============================================================

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User: Get my current subscription status' })
  getMyStatus(@Request() req: any) {
    return this.subscriptionsService.getMyStatus(req.user.userId);
  }
}
