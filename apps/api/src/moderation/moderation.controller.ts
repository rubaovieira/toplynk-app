import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ModerationService } from './moderation.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('users/me/blocks')
  listBlocks(@Req() req: Request & { user: AuthUserPayload }) {
    return this.moderation.listBlocked(req.user.sub);
  }

  @Post('users/:id/block')
  @HttpCode(200)
  block(
    @Req() req: Request & { user: AuthUserPayload },
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.moderation.blockUser(req.user.sub, id);
  }

  @Delete('users/:id/block')
  unblock(
    @Req() req: Request & { user: AuthUserPayload },
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.moderation.unblockUser(req.user.sub, id);
  }

  @Post('reports')
  @HttpCode(201)
  report(@Req() req: Request & { user: AuthUserPayload }, @Body() dto: CreateReportDto) {
    return this.moderation.createReport(req.user.sub, dto);
  }
}
