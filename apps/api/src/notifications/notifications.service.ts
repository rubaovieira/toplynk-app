import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppNotification } from './app-notification.entity';

export type AppNotificationRow = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(AppNotification)
    private readonly repo: Repository<AppNotification>,
  ) {}

  async createForUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        userId,
        title,
        body,
        data: data ?? null,
      }),
    );
  }

  async listForUser(userId: string, limit: number): Promise<AppNotificationRow[]> {
    const lim = Math.min(Math.max(limit, 1), 100);
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: lim,
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      data: r.data,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
