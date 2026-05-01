import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InterviewTurnDto } from './dto/interview-turn.dto';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function buildInterviewSystemPrompt(locale: string): string {
  const lang = locale.startsWith('en')
    ? 'Use natural English in assistant_message.'
    : 'Use português do Brasil claro e profissional em assistant_message.';

  const goals = GOAL_IDS.join(', ');
  const moments = MOMENT_IDS.join(', ');
  const work = WORK_IDS.join(', ');
  const radius = RADIUS_IDS.join(', ');

  return `You are the TopLynk in-app interviewer: a natural chat assistant (no forms, no multiple-choice UI).

${lang}

CONVERSATION RULES:
- Only "assistant_message" is shown to the user — write like a human chat: short, warm, one or two questions at a time when you still need data.
- Never tell the user to pick from a list of labeled buttons; they type free text. You infer structured fields.
- Cover topics in a sensible order: what they want from the app, career moment, main area/sector, how they prefer to meet (in person / remote / hybrid), how far they want nearby connections, then 5–7 deeper follow-ups (budget, urgency, ideal client/investor profile, etc.) adapted to what they said.
- If something is ambiguous, ask one clarifying question.

STRUCTURED IDS (use EXACTLY these strings in fase1 when interview_complete is true):
- primaryGoals: non-empty subset of [${goals}]
- professionalMoment: one of [${moments}]
- mainArea: short free-text label (user's words ok)
- workPreference: one of [${work}]
- searchRadius: one of [${radius}]

OUTPUT (every reply MUST be valid JSON only, no markdown):
{
  "assistant_message": string,
  "interview_complete": boolean,
  "fase1": null | {
    "primaryGoals": string[],
    "professionalMoment": string,
    "mainArea": string,
    "workPreference": string,
    "searchRadius": string
  },
  "fase2_items": null | [
    { "questionId": string, "question": string, "tipo": "chat", "answer": string | string[] }
  ]
}

When interview_complete is false: set fase1 and fase2_items to null.
When interview_complete is true: fase1 must be fully valid; fase2_items must list each follow-up topic you asked (question = how you asked; answer = user's answer summarized faithfully as string, or string[] if they listed multiple items). Use questionIds like "f2_1", "f2_2", … in order.

The first user message may be "[START]": reply with a brief greeting and your first substantive question (no long preamble).`;
}

function stripJsonFence(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return t.trim();
}

function parseTurn(raw: string): InterviewTurnResult {
  const text = stripJsonFence(raw);
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error('JSON inválido');

  const assistant_message =
    typeof parsed.assistant_message === 'string' ? parsed.assistant_message.trim() : '';
  const interview_complete = Boolean(parsed.interview_complete);

  let fase1: InterviewFase1Payload | null = null;
  let fase2_items: InterviewFase2ItemPayload[] | null = null;

  if (interview_complete && isRecord(parsed.fase1)) {
    const pg = parsed.fase1.primaryGoals;
    const primaryGoals = Array.isArray(pg) ? pg.filter((x): x is string => typeof x === 'string') : [];
    const professionalMoment =
      typeof parsed.fase1.professionalMoment === 'string' ? parsed.fase1.professionalMoment : '';
    const mainArea = typeof parsed.fase1.mainArea === 'string' ? parsed.fase1.mainArea : '';
    const workPreference = typeof parsed.fase1.workPreference === 'string' ? parsed.fase1.workPreference : '';
    const searchRadius = typeof parsed.fase1.searchRadius === 'string' ? parsed.fase1.searchRadius : '';
    fase1 = { primaryGoals, professionalMoment, mainArea, workPreference, searchRadius };
  }

  const f2 = parsed.fase2_items;
  if (interview_complete && Array.isArray(f2)) {
    const items: InterviewFase2ItemPayload[] = [];
    for (const row of f2) {
      if (!isRecord(row)) continue;
      const questionId = typeof row.questionId === 'string' ? row.questionId : '';
      const question = typeof row.question === 'string' ? row.question : '';
      const tipo = typeof row.tipo === 'string' ? row.tipo : 'chat';
      const ans = row.answer;
      let answer: string | string[];
      if (Array.isArray(ans)) {
        answer = ans.filter((x): x is string => typeof x === 'string');
      } else if (typeof ans === 'string') {
        answer = ans;
      } else {
        continue;
      }
      if (!questionId || !question) continue;
      items.push({ questionId, question, tipo, answer });
    }
    fase2_items = items.length > 0 ? items : [];
  }

  if (!assistant_message) {
    throw new Error('assistant_message vazio');
  }

  return {
    assistant_message,
    interview_complete,
    fase1,
    fase2_items: interview_complete ? fase2_items : null,
  };
}

@Injectable()
export class InterviewService {
  constructor(private readonly config: ConfigService) {}

  async runTurn(dto: InterviewTurnDto): Promise<InterviewTurnResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY não está definida no servidor (apps/api/.env).',
      );
    }

    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
    const organization = this.config.get<string>('OPENAI_ORG_ID')?.trim();
    const project = this.config.get<string>('OPENAI_PROJECT_ID')?.trim();

    const system = buildInterviewSystemPrompt(dto.locale);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (organization) headers['OpenAI-Organization'] = organization;
    if (project) headers['OpenAI-Project'] = project;

    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.55,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      let detail = '';
      try {
        const j = JSON.parse(errBody) as { error?: { message?: string } };
        if (typeof j.error?.message === 'string') detail = j.error.message.trim();
      } catch {
        detail = errBody.trim().slice(0, 400);
      }
      throw new BadGatewayException(detail || `OpenAI HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new BadGatewayException('Resposta sem conteúdo da OpenAI');
    }

    try {
      return parseTurn(content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao interpretar JSON da OpenAI';
      throw new BadGatewayException(msg);
    }
  }
}
