import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  UseGuards,
  Req,
  Body,
  Param,
  Query,
} from '@nestjs/common';

import { AdminGuard } from '../guards/admin.guard';

import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { UsersService } from './users.service';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Request } from 'express';

import { UpdateProfileDto } from './dto/update-profile.dto';

import { ForgotPasswordDto } from './dto/forgot-password.dto';

import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    const user = await this.usersService.findById(req.user.userId);

    return {
      message: 'Profile retrieved successfully',
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
    const user = await this.usersService.updateProfile(
      req.user.userId,
      updateDto,
    );

    return {
      message: 'Profile updated successfully',
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
    const result = await this.usersService.deleteProfile(req.user.userId);

    return result;
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  // NO JWT REQUIRED
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Send password reset link to email',
  })
  async forgotPassword(
    @Body()
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  // NO JWT REQUIRED
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password using reset token',
  })
  async resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(resetPasswordDto);
  }
  // ============================================================
  // ADMIN - CREATE USER
  // ============================================================

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Post('admin/create')
  @ApiOperation({
    summary: 'Admin create new user',
  })
  async adminCreateUser(
    @Body()
    dto: AdminCreateUserDto,
  ) {
    const user = await this.usersService.adminCreateUser(dto);

    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  // ============================================================
  // ADMIN - GET ALL USERS
  // ============================================================

  // @UseGuards(JwtAuthGuard, AdminGuard)
  // @ApiBearerAuth()
  // @Get('admin/all')
  // @ApiOperation({
  //   summary: 'Admin get all users',
  // })
  // async adminFindAll(
  //   @Query('page') page?: string,
  //   @Query('limit') limit?: string,
  //   @Query('search') search?: string,
  //   @Query('role') role?: string,
  // ) {
  //   return this.usersService.adminFindAll(
  //     Number(page) || 1,
  //     Number(limit) || 10,
  //     search,
  //     role,
  //   );
  // }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get('admin/all')
  @ApiOperation({
    summary: 'Get all users for admin',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Raj',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    example: 'STUDENT',
  })
  async adminFindAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.adminFindAll(
      Number(page) || 1,
      Number(limit) || 10,
      search,
      role,
    );
  }

  // ============================================================
  // ADMIN - GET USER
  // ============================================================

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get('admin/:id')
  @ApiOperation({
    summary: 'Admin get user by ID',
  })
  async adminFindOne(@Param('id') id: string) {
    return this.usersService.adminFindOne(id);
  }

  // ============================================================
  // ADMIN - UPDATE USER
  // ============================================================

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Put('admin/:id')
  @ApiOperation({
    summary: 'Admin update user',
  })
  async adminUpdateUser(
    @Param('id') id: string,
    @Body()
    dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto);
  }

  // ============================================================
  // ADMIN - DELETE USER
  // ============================================================

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Delete('admin/:id')
  @ApiOperation({
    summary: 'Admin delete user',
  })
  async adminDeleteUser(@Param('id') id: string) {
    return this.usersService.adminDeleteUser(id);
  }
}
