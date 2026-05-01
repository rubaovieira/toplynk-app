import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { DiscoverySwipeDto } from './dto/discovery-swipe.dto';
import { DiscoverySwipedQueryDto } from './dto/discovery-swiped-query.dto';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get('nearby')
  @UseGuards(AuthGuard('jwt'))
  async nearby(
    @Req() req: Request & { user: AuthUserPayload },
    @Query() query: DiscoveryQueryDto,
  ) {
    const radiusKm = query.radiusKm ?? 50;
    const limit = query.limit ?? 20;
    const minInterestOverlap = query.minInterestOverlap ?? 0;
    return this.discovery.findNearby(req.user.sub, radiusKm, limit, minInterestOverlap);
  }

  /** Histórico de swipes (aba Matches). */
  @Get('swiped')
  @UseGuards(AuthGuard('jwt'))
  async swiped(
    @Req() req: Request & { user: AuthUserPayload },
    @Query() query: DiscoverySwipedQueryDto,
  ) {
    const limit = query.limit ?? 50;
    return this.discovery.findSwiped(req.user.sub, limit);
  }

  /** Regista pass / like / super no deck do Início; `nearby` deixa de devolver esses perfis. */
  @Post('swipe')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  async swipe(
    @Req() req: Request & { user: AuthUserPayload },
    @Body() dto: DiscoverySwipeDto,
  ) {
    return this.discovery.recordSwipe(req.user.sub, dto.peerId, dto.action);
  }
}
