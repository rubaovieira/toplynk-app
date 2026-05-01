/** Texto e fotos públicas derivados de `setup_profile` (discovery + perfil de outro utilizador). */

export function pickPhotoRefsFromSetup(
  setup: Record<string, unknown> | null | undefined,
  userId: string,
): string[] {
  const photos = setup?.photosBase64;
  if (Array.isArray(photos) && photos.length > 0) {
    const urls = photos.filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (urls.length > 0) return urls;
  }
  return [`u-${userId.slice(0, 8)}-a`, `u-${userId.slice(0, 8)}-b`];
}

export function headlineTaglineFromSetup(
  setup: Record<string, unknown> | null | undefined,
  displayName: string,
): { headline: string; tagline: string } {
  const role = setup && typeof setup.roleTitle === 'string' ? setup.roleTitle : '';
  const company = setup && typeof setup.company === 'string' ? setup.company : '';
  const headline = [role, company].filter(Boolean).join(' · ') || displayName;
  const bio = setup && typeof setup.bio === 'string' ? setup.bio : '';
  const tagline = bio.length > 120 ? `${bio.slice(0, 117)}…` : bio || headline;
  return { headline, tagline };
}

export function bioFullFromSetup(setup: Record<string, unknown> | null | undefined): string {
  if (!setup || typeof setup.bio !== 'string') return '';
  return setup.bio.trim();
}

export function stringIdsFromSetup(
  setup: Record<string, unknown> | null | undefined,
  key: 'activityAreaIds' | 'interestIds',
): string[] {
  if (!setup) return [];
  const v = setup[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/** Cidade/região legível (reverse geocode no cliente ao gravar localização). */
export function cityLabelFromSetup(setup: Record<string, unknown> | null | undefined): string {
  if (!setup) return '';
  const v = setup.cityLabel;
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}
