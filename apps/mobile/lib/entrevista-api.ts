import { apiJsonHeadersPublic } from '@/lib/api-headers';
import type { InterviewApiMessage, InterviewTurnResult } from '@/lib/entrevista-chat-openai';

function nestMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const m = (body as { message?: unknown }).message;
  if (typeof m === 'string') return m.trim();
  if (Array.isArray(m) && m.every((x) => typeof x === 'string')) {
    return m.join(', ').trim();
  }
  return '';
}

export async function runInterviewTurn(params: {
  baseUrl: string;
  locale: string;
  messages: InterviewApiMessage[];
}): Promise<InterviewTurnResult> {
  const url = `${params.baseUrl.replace(/\/$/, '')}/interview/turn`;
  const res = await fetch(url, {
    method: 'POST',
    headers: apiJsonHeadersPublic(),
    body: JSON.stringify({
      locale: params.locale,
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j: unknown = await res.json();
      detail = nestMessage(j);
    } catch {
      try {
        detail = (await res.text()).trim().slice(0, 400);
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }

  return (await res.json()) as InterviewTurnResult;
}
