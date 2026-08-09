import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { UsersService } from './users.service';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Request } from 'express';

import { UpdateProfileDto } from './dto/update-profile.dto';

import { ForgotPasswordDto } from './dto/forgot-password.dto';

import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // ============================================================
  // GET PROFILE
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
  })
  async getProfile(
    @Req()
    req: Request & {
      user: {
        userId: string;
      };
    },
  ) {
    const user =
      await this.usersService.findById(
        req.user.userId,
      );

    return {
      message:
        'Profile retrieved successfully',
      data: user,
    };
  }

  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
  })
  async updateProfile(
    @Req()
    req: Request & {
      user: {
        userId: string;
      };
    },

    @Body()
    updateDto: UpdateProfileDto,
  ) {
    const user =
      await this.usersService.updateProfile(
        req.user.userId,
        updateDto,
      );

    return {
      message:
        'Profile updated successfully',
      data: user,
    };
  }

  // ============================================================
  // DELETE PROFILE
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('profile')
  @ApiOperation({
    summary: 'Delete user profile',
  })
  async deleteProfile(
    @Req()
    req: Request & {
      user: {
        userId: string;
      };
    },
  ) {
    const result =
      await this.usersService.deleteProfile(
        req.user.userId,
      );

    return result;
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  // NO JWT REQUIRED
  @Post('forgot-password')
  @ApiOperation({
    summary:
      'Send password reset link to email',
  })
  async forgotPassword(
    @Body()
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.usersService.forgotPassword(
      forgotPasswordDto,
    );
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  // NO JWT REQUIRED
  @Post('reset-password')
  @ApiOperation({
    summary:
      'Reset password using reset token',
  })
  async resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(
      resetPasswordDto,
    );
  }
}