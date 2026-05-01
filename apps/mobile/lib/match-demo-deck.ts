/** Tipos e helpers visuais para cartões de discovery / matches (dados vêm da API). */

export type MatchProfile = {
  id: string;
  name: string;
  headline: string;
  tagline: string;
  distanceKm: number;
  languageKey: 'pt' | 'en' | 'es';
  /** 0–100 — score da IA + proximidade */
  compatibility: number;
  /** Seeds para https://picsum.photos/seed/{seed}/... */
  photoSeeds: string[];
  bio?: string;
  activityAreaIds?: string[];
  interestIds?: string[];
  /** Cidade/região (API). */
  cityLabel?: string;
};

/** Seed curto → Picsum; `data:` ou URL absoluta → usa como está (fotos reais do perfil). */
export function photoUri(seedOrUri: string, w = 720, h = 960): string {
  const s = seedOrUri.trim();
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }
  return `https://picsum.photos/seed/${encodeURIComponent(s)}/${w}/${h}`;
}
