import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import type { AppNotificationRow } from './notifications.service';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async list(
    @Req() req: Request & { user: AuthUserPayload },
    @Query() query: NotificationsQueryDto,
  ): Promise<{ items: AppNotificationRow[] }> {
    const limit = query.limit ?? 30;
    const items = await this.notifications.listForUser(req.user.sub, limit);
    return { items };
  }
}
