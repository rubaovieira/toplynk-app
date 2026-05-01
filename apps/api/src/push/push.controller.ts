import { Body, Controller, Delete, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { RevokePushTokenDto } from './dto/revoke-push-token.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('tokens')
  @UseGuards(AuthGuard('jwt'))
  async register(
    @Req() req: Request & { user: AuthUserPayload },
    @Body() dto: RegisterPushTokenDto,
  ): Promise<{ ok: true }> {
    await this.push.registerToken(req.user.sub, dto.token, dto.platform);
    return { ok: true as const };
  }

  @Delete('tokens')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'))
  async revoke(
    @Req() req: Request & { user: AuthUserPayload },
    @Body() dto: RevokePushTokenDto,
  ): Promise<void> {
    await this.push.removeToken(req.user.sub, dto.token);
  }
}
