import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Expo, { type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { Repository } from 'typeorm';

import { DeviceToken } from './device-token.entity';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(DeviceToken)
    private readonly tokens: Repository<DeviceToken>,
  ) {}

  async registerToken(userId: string, expoToken: string, platform: string): Promise<void> {
    if (!Expo.isExpoPushToken(expoToken)) {
      throw new BadRequestException('Token de push inválido');
    }
    const p = platform.toLowerCase().trim();
    if (!['ios', 'android', 'web'].includes(p)) {
      throw new BadRequestException('Plataforma inválida');
    }
    const now = new Date();
    const existing = await this.tokens.findOne({ where: { expoToken } });
    if (existing) {
      existing.userId = userId;
      existing.platform = p;
      existing.lastSeenAt = now;
      await this.tokens.save(existing);
      return;
    }
    await this.tokens.save(
      this.tokens.create({
        userId,
        expoToken,
        platform: p,
        lastSeenAt: now,
      }),
    );
  }

  async removeToken(userId: string, expoToken: string): Promise<void> {
    await this.tokens.delete({ userId, expoToken });
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const rows = await this.tokens.find({ where: { userId } });
    if (!rows.length) {
      return;
    }
    const messages: ExpoPushMessage[] = rows.map((r) => ({
      to: r.expoToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      channelId: 'default',
    }));
    const chunks = this.expo.chunkPushNotifications(messages);
    let offset = 0;
    for (const chunk of chunks) {
      let tickets: ExpoPushTicket[];
      try {
        tickets = await this.expo.sendPushNotificationsAsync(chunk);
      } catch (e) {
        this.logger.warn(`Expo push send failed: ${e instanceof Error ? e.message : String(e)}`);
        offset += chunk.length;
        continue;
      }
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const row = rows[offset + i];
        if (ticket.status === 'error') {
          const err = ticket.details?.error;
          if (err === 'DeviceNotRegistered' || err === 'InvalidCredentials') {
            await this.tokens.delete({ id: row.id });
          } else {
            this.logger.debug(`Push ticket error for user ${userId}: ${ticket.message}`);
          }
        }
      }
      offset += chunk.length;
    }
  }
}
