import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PushService } from '../push/push.service';
import { pickPhotoRefsFromSetup } from '../users/public-profile.mapper';
import { User } from '../users/user.entity';
import { ChatGateway } from './chat.gateway';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

export type OpenConversationResult = {
  conversationId: string;
  peerId: string;
  peerName: string;
};

export type ConversationListRow = {
  conversationId: string;
  peerId: string;
  peerName: string;
  /** Primeira foto do perfil (seed Picsum, `data:` ou URL). */
  peerPhotoSeed: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};

export type MessageRow = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly push: PushService,
  ) {}

  async openConversation(viewerId: string, peerId: string): Promise<OpenConversationResult> {
    if (viewerId === peerId) {
      throw new BadRequestException('Não podes conversar contigo mesmo');
    }
    const peer = await this.users.findOne({ where: { id: peerId } });
    if (!peer) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    const [userAId, userBId] = orderedPair(viewerId, peerId);
    let row = await this.conversations.findOne({ where: { userAId, userBId } });
    if (!row) {
      row = this.conversations.create({ userAId, userBId });
      await this.conversations.save(row);
    }
    return {
      conversationId: row.id,
      peerId: peer.id,
      peerName: peer.displayName,
    };
  }

  async listForViewer(viewerId: string): Promise<ConversationListRow[]> {
    const rows = await this.conversations
      .createQueryBuilder('c')
      .where('c.user_a_id = :uid OR c.user_b_id = :uid', { uid: viewerId })
      .orderBy('c.updated_at', 'DESC')
      .getMany();

    const out: ConversationListRow[] = [];
    for (const c of rows) {
      const peerId = c.userAId === viewerId ? c.userBId : c.userAId;
      const peer = await this.users.findOne({ where: { id: peerId } });
      const peerName = peer?.displayName ?? 'Utilizador';
      const sp =
        peer &&
        peer.setupProfile &&
        typeof peer.setupProfile === 'object' &&
        !Array.isArray(peer.setupProfile)
          ? (peer.setupProfile as Record<string, unknown>)
          : undefined;
      const seeds = pickPhotoRefsFromSetup(sp, peerId);
      const peerPhotoSeed = seeds[0] ?? `u-${peerId.slice(0, 8)}-a`;
      const last = await this.messages.findOne({
        where: { conversationId: c.id },
        order: { createdAt: 'DESC' },
      });
      out.push({
        conversationId: c.id,
        peerId,
        peerName,
        peerPhotoSeed,
        lastMessageBody: last?.body ?? null,
        lastMessageAt: last?.createdAt?.toISOString() ?? null,
      });
    }
    return out;
  }

  async viewerCanAccessConversation(conversationId: string, viewerId: string): Promise<boolean> {
    try {
      await this.assertParticipant(conversationId, viewerId);
      return true;
    } catch {
      return false;
    }
  }

  private async assertParticipant(conversationId: string, viewerId: string): Promise<Conversation> {
    const c = await this.conversations.findOne({ where: { id: conversationId } });
    if (!c) {
      throw new NotFoundException('Conversa não encontrada');
    }
    if (c.userAId !== viewerId && c.userBId !== viewerId) {
      throw new ForbiddenException('Sem acesso a esta conversa');
    }
    return c;
  }

  async listMessages(conversationId: string, viewerId: string): Promise<MessageRow[]> {
    await this.assertParticipant(conversationId, viewerId);
    const list = await this.messages.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return list.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async sendMessage(conversationId: string, viewerId: string, body: string): Promise<MessageRow> {
    const c = await this.assertParticipant(conversationId, viewerId);
    const text = body.trim();
    if (!text) {
      throw new BadRequestException('Mensagem vazia');
    }
    const msg = this.messages.create({
      conversationId: c.id,
      senderId: viewerId,
      body: text.slice(0, 4000),
    });
    const saved = await this.messages.save(msg);
    c.updatedAt = new Date();
    await this.conversations.save(c);
    const row: MessageRow = {
      id: saved.id,
      senderId: saved.senderId,
      body: saved.body,
      createdAt: saved.createdAt.toISOString(),
    };
    this.chatGateway.emitNewMessage(c.id, row);
    const peerId = c.userAId === viewerId ? c.userBId : c.userAId;
    const sender = await this.users.findOne({ where: { id: viewerId } });
    const title = sender?.displayName?.trim() || 'Mensagem';
    void this.push
      .sendToUser(peerId, {
        title,
        body: text.slice(0, 140),
        data: {
          type: 'message',
          /** Deep link: a rota `/chat/[id]` usa o id do outro utilizador, não o da conversa. */
          peerId: viewerId,
          conversationId: c.id,
          messageId: saved.id,
        },
      })
      .catch(() => undefined);
    return row;
  }
}
