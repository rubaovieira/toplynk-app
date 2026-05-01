import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { PatchPushPreferencesDto } from './dto/patch-push-preferences.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { RevokePushTokenDto } from './dto/revoke-push-token.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('preferences')
  @UseGuards(AuthGuard('jwt'))
  async getPreferences(
    @Req() req: Request & { user: AuthUserPayload },
  ): Promise<{ pushNotifyMessages: boolean; pushNotifySocial: boolean }> {
    return this.push.getPreferences(req.user.sub);
  }

  @Patch('preferences')
  @UseGuards(AuthGuard('jwt'))
  async patchPreferences(
    @Req() req: Request & { user: AuthUserPayload },
    @Body() dto: PatchPushPreferencesDto,
  ): Promise<{ pushNotifyMessages: boolean; pushNotifySocial: boolean }> {
    return this.push.patchPreferences(req.user.sub, dto);
  }

  @Post('tokens')
  @UseGuards(AuthGuard('jwt'))
  async register(
    @Req() req: Request & { user: AuthUserPayload },
    @Body() dto: RegisterPushTokenDto,
  ): Promise<{ ok: true }> {
    await this.push.registerToken(req.user.sub, dto.token, dto.platform, dto.provider ?? 'expo');
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
