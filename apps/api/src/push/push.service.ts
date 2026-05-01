import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Expo, { type ExpoPushTicket } from 'expo-server-sdk';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { PatchPushPreferencesDto } from './dto/patch-push-preferences.dto';
import { DeviceToken, type PushProvider } from './device-token.entity';
import { allowsPushForKind, buildExpoPushMessage, pushKindFromPayload } from './push-delivery';
import type { PushPayload } from './push.types';

export type { PushPayload } from './push.types';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(DeviceToken)
    private readonly tokens: Repository<DeviceToken>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async registerToken(
    userId: string,
    token: string,
    platform: string,
    provider: PushProvider = 'expo',
  ): Promise<void> {
    const t = token.trim();
    if (provider === 'expo') {
      if (!Expo.isExpoPushToken(t)) {
        throw new BadRequestException('Token de push inválido (Expo)');
      }
    } else if (t.length < 8 || t.length > 512) {
      throw new BadRequestException('Token de push inválido (OneSignal)');
    }
    const p = platform.toLowerCase().trim();
    if (!['ios', 'android', 'web'].includes(p)) {
      throw new BadRequestException('Plataforma inválida');
    }
    const now = new Date();
    const existing = await this.tokens.findOne({ where: { pushToken: t } });
    if (existing) {
      existing.userId = userId;
      existing.platform = p;
      existing.provider = provider;
      existing.lastSeenAt = now;
      await this.tokens.save(existing);
      return;
    }
    await this.tokens.save(
      this.tokens.create({
        userId,
        pushToken: t,
        provider,
        platform: p,
        lastSeenAt: now,
      }),
    );
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await this.tokens.delete({ userId, pushToken: token.trim() });
  }

  async getPreferences(userId: string): Promise<{ pushNotifyMessages: boolean; pushNotifySocial: boolean }> {
    const u = await this.users.findOne({
      where: { id: userId },
      select: { pushNotifyMessages: true, pushNotifySocial: true },
    });
    if (!u) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    return { pushNotifyMessages: u.pushNotifyMessages, pushNotifySocial: u.pushNotifySocial };
  }

  async patchPreferences(
    userId: string,
    dto: PatchPushPreferencesDto,
  ): Promise<{ pushNotifyMessages: boolean; pushNotifySocial: boolean }> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    if (dto.pushNotifyMessages !== undefined) {
      u.pushNotifyMessages = dto.pushNotifyMessages;
    }
    if (dto.pushNotifySocial !== undefined) {
      u.pushNotifySocial = dto.pushNotifySocial;
    }
    await this.users.save(u);
    return { pushNotifyMessages: u.pushNotifyMessages, pushNotifySocial: u.pushNotifySocial };
  }

  private async sendOneSignalBatch(
    subscriptionIds: string[],
    payload: PushPayload,
  ): Promise<void> {
    const appId = this.config.get<string>('ONESIGNAL_APP_ID')?.trim();
    const restKey = this.config.get<string>('ONESIGNAL_REST_API_KEY')?.trim();
    if (!appId || !restKey || subscriptionIds.length === 0) {
      if (subscriptionIds.length > 0) {
        this.logger.warn('OneSignal: ONESIGNAL_APP_ID ou ONESIGNAL_REST_API_KEY em falta — notificação não enviada.');
      }
      return;
    }
    const body: Record<string, unknown> = {
      app_id: appId,
      include_subscription_ids: subscriptionIds,
      headings: { en: payload.title, pt: payload.title },
      contents: { en: payload.body, pt: payload.body },
      target_channel: 'push',
    };
    if (payload.data && Object.keys(payload.data).length > 0) {
      body.data = Object.fromEntries(
        Object.entries(payload.data).map(([k, v]) => [
          k,
          v === null || v === undefined ? '' : typeof v === 'string' ? v : String(v),
        ]),
      );
    }
    try {
      const res = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Key ${restKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        this.logger.warn(`OneSignal REST ${res.status}: ${txt.slice(0, 300)}`);
      }
    } catch (e) {
      this.logger.warn(`OneSignal send failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const u = await this.users.findOne({
      where: { id: userId },
      select: { pushNotifyMessages: true, pushNotifySocial: true },
    });
    if (!u) {
      return;
    }
    const kind = pushKindFromPayload(payload);
    if (!allowsPushForKind(kind, u)) {
      this.logger.debug(`Push omitido (preferências do utilizador): user=${userId} kind=${kind}`);
      return;
    }

    const rows = await this.tokens.find({ where: { userId } });
    if (!rows.length) {
      return;
    }

    const expoRows = rows.filter((r) => r.provider === 'expo');
    const osIds = rows.filter((r) => r.provider === 'onesignal').map((r) => r.pushToken);

    if (osIds.length > 0) {
      await this.sendOneSignalBatch(osIds, payload);
      /** Um dispositivo não deve acumular Expo + OneSignal: evita duas notificações iguais. */
      return;
    }

    if (!expoRows.length) {
      return;
    }

    const messages = expoRows.map((r) => buildExpoPushMessage(r.pushToken, payload, kind));
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
        const row = expoRows[offset + i];
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
