/**
 * Interesses no Step 3 (foco em como a pessoa quer se envolver / o que busca).
 * Rótulos i18n: `setup.step3.interest.<id>` em pt.json, en.json e es.json.
 */
export const SETUP_INTEREST_IDS = [
  'networking',
  'learning',
  'mentorship',
  'freelance',
  'startups',
  'remote',
  'events',
  'communities',
  'leadership',
  'sustainability',
  'diversity',
  'sideProjects',
  'careerChange',
  'international',
  'wellbeing',
  'collaboration',
] as const;

export type SetupInterestId = (typeof SETUP_INTEREST_IDS)[number];
