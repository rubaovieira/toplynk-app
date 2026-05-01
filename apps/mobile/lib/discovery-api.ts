import { apiJsonHeaders } from '@/lib/api-headers';

import type { MatchProfile } from '@/lib/match-demo-deck';

export type DiscoveryNearbyParams = {
  baseUrl: string;
  radiusKm?: number;
  limit?: number;
  minInterestOverlap?: number;
  /** Para textos no deck (`pt` | `en` | `es`). */
  languageKey?: 'pt' | 'en' | 'es';
};

/** Resposta da API alinhada com `MatchProfile` (exceto languageKey, preenchido no ecrã). */
type DiscoveryApiCard = {
  id: string;
  name: string;
  headline: string;
  tagline: string;
  distanceKm: number;
  compatibility: number;
  photoSeeds: string[];
  bio?: string;
  activityAreaIds?: string[];
  interestIds?: string[];
  cityLabel?: string;
};

export async function fetchDiscoveryNearby(params: DiscoveryNearbyParams): Promise<MatchProfile[]> {
  const base = params.baseUrl.replace(/\/$/, '');
  const q = new URLSearchParams();
  if (params.radiusKm != null) q.set('radiusKm', String(params.radiusKm));
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.minInterestOverlap != null) q.set('minInterestOverlap', String(params.minInterestOverlap));
  const qs = q.toString();
  const url = `${base}/discovery/nearby${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: await apiJsonHeaders() });
  if (!res.ok) {
    throw new Error(`discovery ${res.status}`);
  }
  const data = (await res.json()) as DiscoveryApiCard[];
  if (!Array.isArray(data)) return [];
  const lang = params.languageKey ?? 'pt';
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    headline: c.headline,
    tagline: c.tagline,
    distanceKm: c.distanceKm,
    compatibility: c.compatibility,
    photoSeeds: Array.isArray(c.photoSeeds) ? c.photoSeeds : [],
    languageKey: lang,
    bio: typeof c.bio === 'string' && c.bio.trim() ? c.bio.trim() : undefined,
    activityAreaIds:
      Array.isArray(c.activityAreaIds) && c.activityAreaIds.length ? [...c.activityAreaIds] : undefined,
    interestIds: Array.isArray(c.interestIds) && c.interestIds.length ? [...c.interestIds] : undefined,
    cityLabel: typeof c.cityLabel === 'string' && c.cityLabel.trim() ? c.cityLabel.trim() : undefined,
  }));
}
