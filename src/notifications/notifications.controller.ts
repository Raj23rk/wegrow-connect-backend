/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ============================================================
  // API 1
  // GET USER NOTIFICATIONS
  // ============================================================

  // @Get()
  // async getNotifications(
  //   @Req() req: any,

  //   @Query('page') page = '1',

  //   @Query('limit') limit = '20',
  // ) {
  //   const userId = req.user.sub;

  //   return this.notificationsService.getUserNotifications(
  //     userId,

  //     Number(page),

  //     Number(limit),
  //   );
  // }

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    console.log('REQ.USER:', req.user);
    console.log('REQ.USER.USER_ID:', req.user?.userId);

    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    return this.notificationsService.getUserNotifications(
      userId,
      Number(page),
      Number(limit),
    );
  }

  // ============================================================
  // API 2
  // MARK NOTIFICATION AS READ
  // ============================================================

  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string, @Req() req: any) {
    const userId = req.user.userId;

    return this.notificationsService.markAsRead(notificationId, userId);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAdminNotifications(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
  ) {
    return this.notificationsService.getAdminNotifications(
      Number(page),
      Number(limit),
      search,
    );
  }
}
