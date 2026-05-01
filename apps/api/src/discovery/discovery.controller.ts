import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
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
}
