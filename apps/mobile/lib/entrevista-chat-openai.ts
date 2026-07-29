export type InterviewApiMessage = { role: 'user' | 'assistant'; content: string };

export type InterviewFase1Payload = {
  primaryGoals: string[];
  professionalMoment: string;
  mainArea: string;
  workPreference: string;
  searchRadius: string;
};

export type InterviewFase2ItemPayload = {
  questionId: string;
  question: string;
  tipo: string;
  answer: string | string[];
};

export type InterviewTurnResult = {
  assistant_message: string;
  interview_complete: boolean;
  fase1: InterviewFase1Payload | null;
  fase2_items: InterviewFase2ItemPayload[] | null;
  /** 0–100 estimado pelo modelo. Opcional: servidores antigos não enviam. */
  progress?: number | null;
  /** mp3 em base64 da fala do assistente; ausente quando mudo ou o TTS falhou. */
  audioBase64?: string | null;
  audioMimeType?: string | null;
};

const GOAL_IDS = [
  'find_clients',
  'hire_professionals',
  'strategic_partnerships',
  'investment_for_business',
  'invest_in_startups',
  'networking_general',
] as const;

const MOMENT_IDS = ['starting', 'growing', 'consolidated', 'transition'] as const;
const WORK_IDS = ['in_person', 'remote', 'hybrid'] as const;
const RADIUS_IDS = ['radius_2km', 'radius_5km', 'radius_10km', 'radius_50km', 'radius_any'] as const;

export function validateInterviewFase1(f: InterviewFase1Payload): boolean {
  if (!Array.isArray(f.primaryGoals) || f.primaryGoals.length === 0) return false;
  if (!f.primaryGoals.every((g) => GOAL_IDS.includes(g as (typeof GOAL_IDS)[number]))) return false;
  if (
    typeof f.professionalMoment !== 'string' ||
    !MOMENT_IDS.includes(f.professionalMoment as (typeof MOMENT_IDS)[number])
  )
    return false;
  if (typeof f.mainArea !== 'string' || f.mainArea.trim().length < 2) return false;
  if (typeof f.workPreference !== 'string' || !WORK_IDS.includes(f.workPreference as (typeof WORK_IDS)[number]))
    return false;
  if (typeof f.searchRadius !== 'string' || !RADIUS_IDS.includes(f.searchRadius as (typeof RADIUS_IDS)[number]))
    return false;
  return true;
}
