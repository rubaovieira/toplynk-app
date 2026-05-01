import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { ChatsService } from './chats.service';
import { OpenConversationDto } from './dto/open-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@Req() req: Request & { user: AuthUserPayload }) {
    return this.chats.listForViewer(req.user.sub);
  }

  @Post('open')
  @UseGuards(AuthGuard('jwt'))
  open(@Req() req: Request & { user: AuthUserPayload }, @Body() dto: OpenConversationDto) {
    return this.chats.openConversation(req.user.sub, dto.peerId);
  }

  @Get(':conversationId/messages')
  @UseGuards(AuthGuard('jwt'))
  messages(
    @Req() req: Request & { user: AuthUserPayload },
    @Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string,
  ) {
    return this.chats.listMessages(conversationId, req.user.sub);
  }

  @Post(':conversationId/messages')
  @UseGuards(AuthGuard('jwt'))
  send(
    @Req() req: Request & { user: AuthUserPayload },
    @Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chats.sendMessage(conversationId, req.user.sub, dto.body);
  }
}
