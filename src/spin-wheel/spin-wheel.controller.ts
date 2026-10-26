import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SpinWheelService } from './spin-wheel.service';
import { SendSpinOtpDto } from './dto/send-otp.dto';
import { VerifySpinOtpDto } from './dto/verify-otp.dto';
import { SpinWheelDto } from './dto/spin-wheel.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';
import { QuerySpinParticipantsDto } from './dto/query-participants.dto';

@ApiTags('Spin & Win — Skill Edition')
@Controller('spin-wheel')
export class SpinWheelController {
  constructor(private readonly spinWheelService: SpinWheelService) {}

  // =====================================================
  // 1. GET ACTIVE REWARDS
  // =====================================================
  @Get('rewards')
  @ApiOperation({
    summary: 'Get active rewards and wheel sector configuration',
  })
  async getRewards() {
    const rewards = await this.spinWheelService.getRewards();
    return {
      success: true,
      message: 'Active rewards fetched successfully',
      data: rewards,
    };
  }

  // =====================================================
  // 2. SEND OTP (STUDENT REGISTRATION)
  // =====================================================
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit student details and dispatch email verification OTP',
  })
  async sendOtp(@Body() dto: SendSpinOtpDto) {
    const result = await this.spinWheelService.sendOtp(dto);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  // =====================================================
  // 3. VERIFY EMAIL OTP
  // =====================================================
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email OTP to unlock the digital spinning wheel',
  })
  async verifyOtp(@Body() dto: VerifySpinOtpDto) {
    const result = await this.spinWheelService.verifyOtp(dto);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  // =====================================================
  // 4. SPIN THE WHEEL
  // =====================================================
  @Post('spin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Spin the wheel and claim learning reward with WeGrow B-School campus visit voucher',
  })
  async spin(@Body() dto: SpinWheelDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '';
    const userAgent = (req.headers['user-agent'] as string) || '';
    const result = await this.spinWheelService.spin(dto, ip, userAgent);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  // =====================================================
  // 5. CAMPUS DESK: VERIFY VOUCHER
  // =====================================================
  @Get('verify-voucher/:code')
  @ApiOperation({
    summary: 'Verify student voucher code and display campus claim status',
  })
  async verifyVoucher(@Param('code') code: string) {
    const result = await this.spinWheelService.verifyVoucher(code);
    return {
      success: result.success,
      message: 'Voucher verified',
      data: result,
    };
  }

  // =====================================================
  // 6. CAMPUS DESK: REDEEM VOUCHER
  // =====================================================
  @Post('redeem-voucher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Campus staff marks student reward voucher as redeemed on campus visit',
  })
  async redeemVoucher(@Body() dto: RedeemVoucherDto) {
    const result = await this.spinWheelService.redeemVoucher(dto);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  // =====================================================
  // 7. ADMIN STATS & BUDGET SUMMARY
  // =====================================================
  @Get('admin/stats')
  @ApiOperation({
    summary:
      'Get aggregate statistics, spin distribution, and budget analytics',
  })
  async getStats() {
    const stats = await this.spinWheelService.getStats();
    return {
      success: true,
      message: 'Admin stats retrieved',
      data: stats,
    };
  }

  // =====================================================
  // 8. ADMIN: GET ALL REGISTERED PARTICIPANTS DATA
  // =====================================================
  @Get(['admin/participants', 'admin/students', 'admin/registrations'])
  @ApiOperation({
    summary:
      'Get all registered participants data with search, course filter, spin status, redemption status, and pagination',
  })
  async findAllParticipants(@Query() query: QuerySpinParticipantsDto) {
    const data = await this.spinWheelService.findAllParticipants(query);
    return {
      success: true,
      message: 'Registered participants data retrieved successfully',
      data,
    };
  }
}
