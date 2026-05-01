import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';
import {
  bioFullFromSetup,
  cityLabelFromSetup,
  headlineTaglineFromSetup,
  pickPhotoRefsFromSetup,
  stringIdsFromSetup,
} from '../users/public-profile.mapper';

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

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async findNearby(
    viewerId: string,
    radiusKm: number,
    limit: number,
    minInterestOverlap: number,
  ): Promise<DiscoveryCard[]> {
    const viewer = await this.users.findOne({ where: { id: viewerId } });
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

    const others = await this.users
      .createQueryBuilder('u')
      .where('u.id != :id', { id: viewerId })
      .andWhere(`u.setup_profile::jsonb ? 'latitude'`)
      .andWhere(`u.setup_profile::jsonb ? 'longitude'`)
      .getMany();

    type PoolRow = { user: User; distanceKm: number; overlap: number };
    const pool: PoolRow[] = [];

    for (const u of others) {
      const sp = u.setupProfile;
      if (!sp || typeof sp !== 'object' || Array.isArray(sp)) continue;
      const s = sp as Record<string, unknown>;
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const d = haversineKm(vlat, vlng, lat, lng);
      if (d > radiusKm) continue;
      const theirInterests = Array.isArray(s.interestIds)
        ? s.interestIds.filter((x): x is string => typeof x === 'string')
        : [];
      const overlap = interestOverlap(viewerInterests, theirInterests);
      if (overlap < minInterestOverlap) continue;
      pool.push({ user: u, distanceKm: d, overlap });
    }

    const [vecRow] = await this.users.query(
      `SELECT profile_embedding::text AS t FROM users WHERE id = $1::uuid`,
      [viewerId],
    );
    const viewerVecStr = typeof vecRow?.t === 'string' ? vecRow.t : null;

    const embById = new Map<string, number>();
    if (viewerVecStr && pool.length > 0) {
      const ids = pool.map((p) => p.user.id);
      const embRows: { id: string; d: string | number }[] = await this.users.query(
        `SELECT id::text AS id, profile_embedding <=> $1::vector AS d FROM users WHERE id = ANY($2::uuid[]) AND profile_embedding IS NOT NULL`,
        [viewerVecStr, ids],
      );
      for (const row of embRows) {
        const dist = typeof row.d === 'number' ? row.d : parseFloat(String(row.d));
        if (Number.isFinite(dist)) embById.set(row.id, dist);
      }
    }

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
      const s =
        r.user.setupProfile && typeof r.user.setupProfile === 'object' && !Array.isArray(r.user.setupProfile)
          ? (r.user.setupProfile as Record<string, unknown>)
          : undefined;
      const { headline, tagline } = headlineTaglineFromSetup(s, r.user.displayName);
      let compatibility = Math.max(35, Math.min(98, Math.round(100 - r.distanceKm * 3 + r.overlap * 5)));
      if (r.embDist != null && Number.isFinite(r.embDist)) {
        compatibility = Math.max(40, Math.min(99, Math.round(100 - r.embDist * 45)));
      }
      out.push({
        id: r.user.id,
        name: r.user.displayName,
        headline,
        tagline,
        distanceKm: Math.round(r.distanceKm * 10) / 10,
        compatibility,
        photoSeeds: pickPhotoRefsFromSetup(s, r.user.id),
        bio: bioFullFromSetup(s),
        activityAreaIds: stringIdsFromSetup(s, 'activityAreaIds'),
        interestIds: stringIdsFromSetup(s, 'interestIds'),
        cityLabel: cityLabelFromSetup(s),
      });
    }

    return out;
  }
}
