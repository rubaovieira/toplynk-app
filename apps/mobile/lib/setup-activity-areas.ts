/**
 * Meios de atuação no Step 2 (área profissional / mercado).
 * Rótulos i18n: `setup.step2.sector.<id>` em pt.json, en.json e es.json.
 */
export const SETUP_ACTIVITY_AREA_IDS = [
  'tech',
  'design',
  'product',
  'business',
  'marketing',
  'sales',
  'hr',
  'finance',
  'operations',
  'health',
  'education',
  'legal',
  'data',
  'consulting',
  'creative',
  'support',
] as const;

export type SetupActivityAreaId = (typeof SETUP_ACTIVITY_AREA_IDS)[number];
