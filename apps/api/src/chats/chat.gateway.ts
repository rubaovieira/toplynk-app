import { Inject, Logger, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';
import { Server, Socket } from 'socket.io';

import { ChatsService, type MessageRow } from './chats.service';

export function convRoom(conversationId: string): string {
  return `conv:${conversationId}`;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly log = new Logger(ChatGateway.name);
  private redisPub: RedisClientType | null = null;
  private redisSub: RedisClientType | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chats: ChatsService,
    private readonly config: ConfigService,
  ) {}

  async afterInit(server: Server): Promise<void> {
    const url = this.config.get<string>('REDIS_URL')?.trim() || 'redis://127.0.0.1:6379';
    try {
      const pubClient = createClient({ url }) as RedisClientType;
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => this.log.error(`Redis pub: ${String(err)}`));
      subClient.on('error', (err) => this.log.error(`Redis sub: ${String(err)}`));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      server.adapter(createAdapter(pubClient, subClient));
      this.redisPub = pubClient;
      this.redisSub = subClient;
      this.log.log(`Socket.IO Redis adapter ok (${url})`);
    } catch (e) {
      this.log.warn(
        `Redis adapter disabled: ${e instanceof Error ? e.message : String(e)}. Use REDIS_URL and a running Redis for multi-instance fan-out.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    const close = async (c: RedisClientType | null) => {
      if (!c) return;
      try {
        await c.quit();
      } catch {
        try {
          c.disconnect();
        } catch {
          /* ignore */
        }
      }
    };
    await close(this.redisPub);
    await close(this.redisSub);
    this.redisPub = null;
    this.redisSub = null;
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const fromAuth = client.handshake.auth?.token;
      const fromQuery = client.handshake.query?.token;
      const raw =
        (typeof fromAuth === 'string' ? fromAuth : '') ||
        (typeof fromQuery === 'string' ? fromQuery : '');
      const token = raw.trim();
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(): void {
    /* rooms são limpos pelo motor do socket.io */
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: true } | { error: string }> {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return { error: 'unauthorized' };
    }
    const cid = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    if (!cid) {
      return { error: 'invalid_conversation' };
    }
    const allowed = await this.chats.viewerCanAccessConversation(cid, userId);
    if (!allowed) {
      return { error: 'forbidden' };
    }
    await client.join(convRoom(cid));
    return { ok: true };
  }

  emitNewMessage(conversationId: string, row: MessageRow): void {
    if (!this.server) {
      return;
    }
    this.server.to(convRoom(conversationId)).emit('chat:message', row);
  }
}
