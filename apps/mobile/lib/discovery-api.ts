import { apiJsonHeaders } from '@/lib/api-headers';
import { fetchWithTimeout } from '@/lib/api-fetch';

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
  const res = await fetchWithTimeout(url, { headers: await apiJsonHeaders() });
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

export type DiscoverySwipeAction = 'pass' | 'like' | 'super';

export type DiscoverySwipedParams = {
  baseUrl: string;
  limit?: number;
  languageKey?: 'pt' | 'en' | 'es';
};

/** Histórico de swipes (aba Matches). */
export async function fetchDiscoverySwiped(params: DiscoverySwipedParams): Promise<MatchProfile[]> {
  const base = params.baseUrl.replace(/\/$/, '');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  const url = `${base}/discovery/swiped${qs ? `?${qs}` : ''}`;
  const res = await fetchWithTimeout(url, { headers: await apiJsonHeaders() });
  if (!res.ok) {
    throw new Error(`discovery swiped ${res.status}`);
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

export async function postDiscoverySwipe(params: {
  baseUrl: string;
  peerId: string;
  action: DiscoverySwipeAction;
}): Promise<void> {
  const base = params.baseUrl.replace(/\/$/, '');
  const res = await fetchWithTimeout(`${base}/discovery/swipe`, {
    method: 'POST',
    headers: await apiJsonHeaders(),
    body: JSON.stringify({ peerId: params.peerId, action: params.action }),
  });
  if (!res.ok) {
    throw new Error(`discovery swipe ${res.status}`);
  }
}
