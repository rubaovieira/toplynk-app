import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ModerationService } from '../moderation/moderation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { User } from '../users/user.entity';
import {
  bioFullFromSetup,
  cityLabelFromSetup,
  headlineTaglineFromSetup,
  pickPhotoRefsFromSetup,
  stringIdsFromSetup,
} from '../users/public-profile.mapper';
import { DiscoveryIncoming } from './discovery-incoming.entity';
import type { DiscoverySwipeAction } from './discovery-swipe.entity';
import { DiscoverySwipe } from './discovery-swipe.entity';

export type DiscoveryCard = {
  id: string;
  name: string;
  headline: string;
  tagline: string;
  distanceKm: number;
  compatibility: number;
  photoSeeds: string[];
  bio: string;
  activityAreaIds: string[];
  interestIds: string[];
  cityLabel: string;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function interestOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x)).length;
}

type PoolRow = { user: User; distanceKm: number; overlap: number };

type TaggedCard = { card: DiscoveryCard; ts: number };

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(DiscoverySwipe)
    private readonly swipes: Repository<DiscoverySwipe>,
    @InjectRepository(DiscoveryIncoming)
    private readonly incoming: Repository<DiscoveryIncoming>,
    private readonly push: PushService,
    private readonly appNotifications: NotificationsService,
    private readonly moderation: ModerationService,
  ) {}

  private assertViewerGeo(viewer: User): { vlat: number; vlng: number; viewerInterests: string[] } {
    if (!viewer?.setupProfile || typeof viewer.setupProfile !== 'object' || Array.isArray(viewer.setupProfile)) {
      throw new BadRequestException('Perfil incompleto: falta localização no cadastro');
    }
    const vsp = viewer.setupProfile as Record<string, unknown>;
    const vlat = Number(vsp.latitude);
    const vlng = Number(vsp.longitude);
    if (!Number.isFinite(vlat) || !Number.isFinite(vlng)) {
      throw new BadRequestException('Perfil incompleto: falta localização no cadastro');
    }
    const viewerInterests = Array.isArray(vsp.interestIds)
      ? vsp.interestIds.filter((x): x is string => typeof x === 'string')
      : [];
    return { vlat, vlng, viewerInterests };
  }

  /**
   * MANOBRA "mostrar todos" (env `DISCOVERY_SHOW_ALL`): lê a geo do viewer SEM lançar 400.
   * Quando o cadastro não capturou localização, devolve lat/lng nulos — o deck ainda é
   * montado (distância fica desconhecida) em vez de bloquear a tela pedindo localização.
   */
  private readViewerGeoLoose(viewer: User): { vlat: number | null; vlng: number | null; viewerInterests: string[] } {
    const sp =
      viewer?.setupProfile && typeof viewer.setupProfile === 'object' && !Array.isArray(viewer.setupProfile)
        ? (viewer.setupProfile as Record<string, unknown>)
        : undefined;
    if (!sp) return { vlat: null, vlng: null, viewerInterests: [] };
    const vlatRaw = Number(sp.latitude);
    const vlngRaw = Number(sp.longitude);
    const viewerInterests = Array.isArray(sp.interestIds)
      ? sp.interestIds.filter((x): x is string => typeof x === 'string')
      : [];
    return {
      vlat: Number.isFinite(vlatRaw) ? vlatRaw : null,
      vlng: Number.isFinite(vlngRaw) ? vlngRaw : null,
      viewerInterests,
    };
  }

  /**
   * Liga a manobra de lançamento: ignora o raio e mostra TODOS os perfis cadastrados
   * (inclusive quem não concedeu localização). Reversível: basta remover a env e reiniciar.
   */
  private static showAllEnabled(): boolean {
    const v = (process.env.DISCOVERY_SHOW_ALL ?? '').trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }

  private toDiscoveryCard(
    peer: User,
    distanceKm: number,
    overlap: number,
    embDist: number | null,
  ): DiscoveryCard | null {
    const s =
      peer.setupProfile && typeof peer.setupProfile === 'object' && !Array.isArray(peer.setupProfile)
        ? (peer.setupProfile as Record<string, unknown>)
        : undefined;
    if (!s) return null;
    const { headline, tagline } = headlineTaglineFromSetup(s, peer.displayName);
    let compatibility = Math.max(35, Math.min(98, Math.round(100 - distanceKm * 3 + overlap * 5)));
    if (embDist != null && Number.isFinite(embDist)) {
      compatibility = Math.max(40, Math.min(99, Math.round(100 - embDist * 45)));
    }
    return {
      id: peer.id,
      name: peer.displayName,
      headline,
      tagline,
      distanceKm: Math.round(distanceKm * 10) / 10,
      compatibility,
      photoSeeds: pickPhotoRefsFromSetup(s, peer.id),
      bio: bioFullFromSetup(s),
      activityAreaIds: stringIdsFromSetup(s, 'activityAreaIds'),
      interestIds: stringIdsFromSetup(s, 'interestIds'),
      cityLabel: cityLabelFromSetup(s),
    };
  }

  private async loadEmbeddingDistances(viewerId: string, pool: PoolRow[]): Promise<Map<string, number>> {
    const embById = new Map<string, number>();
    if (pool.length === 0) return embById;
    const [vecRow] = await this.users.query(`SELECT profile_embedding::text AS t FROM users WHERE id = $1::uuid`, [
      viewerId,
    ]);
    const viewerVecStr = typeof vecRow?.t === 'string' ? vecRow.t : null;
    if (!viewerVecStr) return embById;
    const ids = pool.map((p) => p.user.id);
    const embRows: { id: string; d: string | number }[] = await this.users.query(
      `SELECT id::text AS id, profile_embedding <=> $1::vector AS d FROM users WHERE id = ANY($2::uuid[]) AND profile_embedding IS NOT NULL`,
      [viewerVecStr, ids],
    );
    for (const row of embRows) {
      const dist = typeof row.d === 'number' ? row.d : parseFloat(String(row.d));
      if (Number.isFinite(dist)) embById.set(row.id, dist);
    }
    return embById;
  }

  private buildPoolForUsers(
    viewer: User,
    vlat: number,
    vlng: number,
    viewerInterests: string[],
    targets: User[],
  ): PoolRow[] {
    const pool: PoolRow[] = [];
    for (const u of targets) {
      const sp = u.setupProfile;
      if (!sp || typeof sp !== 'object' || Array.isArray(sp)) continue;
      const s = sp as Record<string, unknown>;
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const d = haversineKm(vlat, vlng, lat, lng);
      const theirInterests = Array.isArray(s.interestIds)
        ? s.interestIds.filter((x): x is string => typeof x === 'string')
        : [];
      const overlap = interestOverlap(viewerInterests, theirInterests);
      pool.push({ user: u, distanceKm: d, overlap });
    }
    return pool;
  }

  private async taggedFromPool(
    viewerId: string,
    pool: PoolRow[],
    orderIds: string[],
    tsByUserId: Map<string, number>,
  ): Promise<TaggedCard[]> {
    if (pool.length === 0 || orderIds.length === 0) return [];
    const embById = await this.loadEmbeddingDistances(viewerId, pool);
    const poolById = new Map(pool.map((p) => [p.user.id, p]));
    const out: TaggedCard[] = [];
    for (const id of orderIds) {
      const row = poolById.get(id);
      if (!row) continue;
      const ts = tsByUserId.get(id);
      if (ts == null) continue;
      const card = this.toDiscoveryCard(row.user, row.distanceKm, row.overlap, embById.get(row.user.id) ?? null);
      if (card) out.push({ card, ts });
    }
    return out;
  }

  async recordSwipe(viewerId: string, peerId: string, action: DiscoverySwipeAction): Promise<{ ok: true }> {
    if (peerId === viewerId) {
      throw new BadRequestException('peerId inválido');
    }
    const peer = await this.users.findOne({ where: { id: peerId } });
    if (!peer) {
      throw new NotFoundException('Perfil não encontrado');
    }
    await this.swipes.upsert({ viewerId, peerId, action }, ['viewerId', 'peerId']);

    if (action === 'like' || action === 'super') {
      await this.incoming.upsert(
        { recipientId: peerId, actorId: viewerId, action },
        ['recipientId', 'actorId'],
      );

      const actor = await this.users.findOne({ where: { id: viewerId } });
      const name = actor?.displayName?.trim() || 'Alguém';
      const title =
        action === 'super' ? 'Seu perfil em destaque' : 'Alguém se interessou por você';
      const body =
        action === 'super'
          ? `${name} marcou seu perfil como especial. Toque para ver quem é.`
          : `${name} gostou do seu perfil. Que tal dar uma olhada?`;
      const data = { type: action === 'super' ? 'discovery_super' : 'discovery_like', peerId: viewerId } as Record<
        string,
        unknown
      >;

      try {
        await this.appNotifications.createForUser(peerId, title, body, data);
      } catch (e) {
        this.logger.warn(`Gravar notificação in-app falhou: ${e instanceof Error ? e.message : String(e)}`);
      }

      try {
        await this.push.sendToUser(peerId, { title, body, data });
      } catch (e) {
        this.logger.warn(`Push falhou: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return { ok: true };
  }

  /**
   * Histórico da aba Matches: interesses recebidos (like/super) + avaliações que você fez no deck.
   * Quem recebeu o super aparece primeiro na lista de quem o enviou (incoming).
   */
  async findSwiped(viewerId: string, limit: number): Promise<DiscoveryCard[]> {
    const lim = Math.min(Math.max(limit, 1), 100);
    const viewer = await this.users.findOne({ where: { id: viewerId } });
    if (!viewer) throw new NotFoundException();
    const { vlat, vlng, viewerInterests } = this.assertViewerGeo(viewer);

    const blockedIds = await this.moderation.blockedIdsFor(viewerId);

    const incomingRows = await this.incoming.find({
      where: { recipientId: viewerId },
      order: { createdAt: 'DESC' },
      take: lim,
    });

    const outgoingSwipes = await this.swipes.find({
      where: { viewerId },
      order: { createdAt: 'DESC' },
      take: lim,
    });

    const incomingActorIds = [...new Set(incomingRows.map((r) => r.actorId))];
    const outgoingPeerIds = [...new Set(outgoingSwipes.map((s) => s.peerId))];

    const incomingActors =
      incomingActorIds.length > 0 ? await this.users.findBy({ id: In(incomingActorIds) }) : [];
    const outgoingPeers =
      outgoingPeerIds.length > 0 ? await this.users.findBy({ id: In(outgoingPeerIds) }) : [];

    const incomingPool = this.buildPoolForUsers(viewer, vlat, vlng, viewerInterests, incomingActors);
    const outgoingPool = this.buildPoolForUsers(viewer, vlat, vlng, viewerInterests, outgoingPeers);

    const tsIncoming = new Map<string, number>();
    for (const r of incomingRows) {
      tsIncoming.set(r.actorId, r.createdAt.getTime());
    }
    const tsOutgoing = new Map<string, number>();
    for (const s of outgoingSwipes) {
      tsOutgoing.set(s.peerId, s.createdAt.getTime());
    }

    const incomingTagged = await this.taggedFromPool(
      viewerId,
      incomingPool,
      incomingRows.map((r) => r.actorId),
      tsIncoming,
    );
    const outgoingTagged = await this.taggedFromPool(
      viewerId,
      outgoingPool,
      outgoingSwipes.map((s) => s.peerId),
      tsOutgoing,
    );

    const byId = new Map<string, TaggedCard>();
    for (const item of incomingTagged) {
      byId.set(item.card.id, item);
    }
    for (const item of outgoingTagged) {
      if (!byId.has(item.card.id)) {
        byId.set(item.card.id, item);
      }
    }

    return Array.from(byId.values())
      .filter((x) => !blockedIds.has(x.card.id))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, lim)
      .map((x) => x.card);
  }

  async findNearby(
    viewerId: string,
    radiusKm: number,
    limit: number,
    minInterestOverlap: number,
  ): Promise<DiscoveryCard[]> {
    const showAll = DiscoveryService.showAllEnabled();

    const viewer = await this.users.findOne({ where: { id: viewerId } });
    if (!viewer) throw new NotFoundException();
    // Em modo "mostrar todos" não exigimos geo do viewer (evita o 400 que vira tela vazia / CTA de localização).
    const { vlat, vlng, viewerInterests } = showAll
      ? this.readViewerGeoLoose(viewer)
      : this.assertViewerGeo(viewer);

    const swipedRows = await this.swipes.find({
      where: { viewerId },
      select: { peerId: true },
    });
    const excluded = new Set(swipedRows.map((r) => r.peerId));

    // Bloqueios (qualquer direção) nunca aparecem no discovery (Guideline 1.2).
    const blockedIds = await this.moderation.blockedIdsFor(viewerId);
    for (const id of blockedIds) excluded.add(id);

    const qb = this.users
      .createQueryBuilder('u')
      .where('u.id != :id', { id: viewerId })
      // Contas apagadas/anonimizadas (Guideline 5.1.1v) nunca devem aparecer no deck.
      .andWhere('u.deleted_at IS NULL');
    // Fora do modo "mostrar todos", mantém a exigência de geo na própria query (comportamento original).
    if (!showAll) {
      qb.andWhere(`u.setup_profile::jsonb ? 'latitude'`).andWhere(`u.setup_profile::jsonb ? 'longitude'`);
    }
    const others = await qb.getMany();

    const pool: PoolRow[] = [];

    for (const u of others) {
      if (excluded.has(u.id)) continue;
      const sp = u.setupProfile;
      if (!sp || typeof sp !== 'object' || Array.isArray(sp)) continue;
      const s = sp as Record<string, unknown>;
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

      // Distância só é real quando os dois lados têm geo; senão fica 0 (desconhecida) no modo "mostrar todos".
      const d = hasGeo && vlat != null && vlng != null ? haversineKm(vlat, vlng, lat, lng) : 0;

      if (!showAll) {
        if (!hasGeo) continue;
        if (d > radiusKm) continue;
      }

      const theirInterests = Array.isArray(s.interestIds)
        ? s.interestIds.filter((x): x is string => typeof x === 'string')
        : [];
      const overlap = interestOverlap(viewerInterests, theirInterests);
      if (overlap < minInterestOverlap) continue;
      pool.push({ user: u, distanceKm: d, overlap });
    }

    const embById = await this.loadEmbeddingDistances(viewerId, pool);

    const scored = pool.map((p) => ({
      ...p,
      embDist: embById.get(p.user.id) ?? null,
    }));

    scored.sort((a, b) => {
      if (a.embDist != null && b.embDist != null && a.embDist !== b.embDist) return a.embDist - b.embDist;
      if (a.embDist != null && b.embDist == null) return -1;
      if (a.embDist == null && b.embDist != null) return 1;
      return a.distanceKm - b.distanceKm;
    });

    const out: DiscoveryCard[] = [];
    for (const r of scored.slice(0, limit)) {
      const card = this.toDiscoveryCard(r.user, r.distanceKm, r.overlap, r.embDist);
      if (card) out.push(card);
    }

    return out;
  }
}
