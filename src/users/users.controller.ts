import {
  Controller,
  Get,
  Put,
  Delete,
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


@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {

  constructor(
    private readonly usersService: UsersService,
  ) { }


  // GET PROFILE
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
  })
  async getProfile(
    @Req() req: Request & {
      user: {
        userId: string
      }
    }
  ) {

    const user =
      await this.usersService.findById(
        req.user.userId
      );

    return {
      message: 'Profile retrieved successfully',
      data: user
    };
  }



  // UPDATE PROFILE
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile'
  })
  async updateProfile(
    @Req() req: Request & {
      user: {
        userId: string
      }
    },
    @Body() updateDto: UpdateProfileDto,
  ) {

    const user =
      await this.usersService.updateProfile(
        req.user.userId,
        updateDto,
      );


    return {
      message: 'Profile updated successfully',
      data: user,
    };
  }




  // DELETE PROFILE
  @UseGuards(JwtAuthGuard)
  @Delete('profile')
  @ApiOperation({
    summary: 'Delete user profile'
  })
  async deleteProfile(
    @Req() req: Request & {
      user: {
        userId: string
      }
    },
  ) {

    const result =
      await this.usersService.deleteProfile(
        req.user.userId,
      );


    return result;
  }

}