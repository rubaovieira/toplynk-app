import type { MatchProfile } from '@/lib/match-demo-deck';

let lastDiscoveryCards: MatchProfile[] = [];

/** Último resultado de `/discovery/nearby` (Início + Matches) para abrir perfil por UUID. */
export function setDiscoveryCache(cards: MatchProfile[]): void {
  lastDiscoveryCards = Array.isArray(cards) ? [...cards] : [];
}

export function getDiscoveryCachedProfile(id: string): MatchProfile | undefined {
  return lastDiscoveryCards.find((p) => p.id === id);
}
