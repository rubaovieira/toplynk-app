import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { headlineTaglineFromSetup, pickPhotoRefsFromSetup } from '../users/public-profile.mapper';
import { User } from '../users/user.entity';
import { ContentReport } from './content-report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UserBlock } from './user-block.entity';

export type BlockedUserRow = {
  id: string;
  name: string;
  headline: string;
  photoSeed: string;
  blockedAt: string;
};

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(UserBlock)
    private readonly blocks: Repository<UserBlock>,
    @InjectRepository(ContentReport)
    private readonly reports: Repository<ContentReport>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async blockUser(blockerId: string, blockedId: string): Promise<{ ok: true }> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Não podes bloquear a ti mesmo');
    }
    const target = await this.users.findOne({ where: { id: blockedId } });
    if (!target) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    await this.blocks
      .createQueryBuilder()
      .insert()
      .into(UserBlock)
      .values({ blockerId, blockedId })
      .orIgnore()
      .execute();
    return { ok: true };
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<{ ok: true }> {
    await this.blocks.delete({ blockerId, blockedId });
    return { ok: true };
  }

  /** Ids bloqueados em qualquer direção (eu bloqueei ou fui bloqueado) — para excluir do discovery. */
  async blockedIdsFor(userId: string): Promise<Set<string>> {
    const rows = await this.blocks.find({
      where: [{ blockerId: userId }, { blockedId: userId }],
      select: { blockerId: true, blockedId: true },
    });
    const out = new Set<string>();
    for (const r of rows) {
      out.add(r.blockerId === userId ? r.blockedId : r.blockerId);
    }
    return out;
  }

  /** Há bloqueio entre os dois (qualquer direção)? — para vedar chat. */
  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const count = await this.blocks.count({
      where: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    });
    return count > 0;
  }

  async listBlocked(blockerId: string): Promise<BlockedUserRow[]> {
    const rows = await this.blocks.find({
      where: { blockerId },
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.blockedId);
    const targets = await this.users.findBy({ id: In(ids) });
    const byId = new Map(targets.map((u) => [u.id, u]));
    const out: BlockedUserRow[] = [];
    for (const r of rows) {
      const u = byId.get(r.blockedId);
      if (!u) continue;
      const sp =
        u.setupProfile && typeof u.setupProfile === 'object' && !Array.isArray(u.setupProfile)
          ? (u.setupProfile as Record<string, unknown>)
          : undefined;
      const { headline } = headlineTaglineFromSetup(sp, u.displayName);
      const seeds = pickPhotoRefsFromSetup(sp, u.id);
      out.push({
        id: u.id,
        name: u.displayName,
        headline,
        photoSeed: seeds[0] ?? `u-${u.id.slice(0, 8)}-a`,
        blockedAt: r.createdAt.toISOString(),
      });
    }
    return out;
  }

  async createReport(reporterId: string, dto: CreateReportDto): Promise<{ ok: true; id: string }> {
    if (dto.reportedUserId === reporterId) {
      throw new BadRequestException('Não podes denunciar a ti mesmo');
    }
    const target = await this.users.findOne({ where: { id: dto.reportedUserId } });
    if (!target) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    const report = this.reports.create({
      reporterId,
      reportedUserId: dto.reportedUserId,
      conversationId: dto.conversationId ?? null,
      messageId: dto.messageId ?? null,
      reason: dto.reason,
      details: dto.details?.trim() ? dto.details.trim().slice(0, 2000) : null,
      status: 'pending',
    });
    const saved = await this.reports.save(report);
    this.logger.warn(
      `[moderation] nova denúncia ${saved.id} reporter=${reporterId} reported=${dto.reportedUserId} reason=${dto.reason}`,
    );
    return { ok: true, id: saved.id };
  }
}
