import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { PushService } from '../push/push.service';
import { TestMatchNotifyDto } from './dto/test-match-notify.dto';

/** Stub: sem persistência de swipes; só para validar push de “match”. */
@Controller('matches')
export class MatchesController {
  constructor(private readonly push: PushService) {}

  @Post('test/notify')
  @UseGuards(AuthGuard('jwt'))
  async testNotify(
    @Req() req: Request & { user: AuthUserPayload },
    @Body() dto: TestMatchNotifyDto,
  ): Promise<{ ok: true }> {
    await this.push.sendToUser(dto.peerId, {
      title: 'Novo match!',
      body: 'Alguém deu match contigo (teste).',
      data: { type: 'match', peerId: req.user.sub },
    });
    return { ok: true as const };
  }
}
