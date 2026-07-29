import { apiJsonHeaders } from '@/lib/api-headers';
import { AUDIO_API_TIMEOUT_MS, fetchWithTimeout, LONG_API_TIMEOUT_MS } from '@/lib/api-fetch';
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

/** Extrai a mensagem de erro do Nest, com fallback para texto cru. */
async function errorFromResponse(res: Response): Promise<Error> {
  let detail = '';
  try {
    detail = nestMessage(await res.json());
  } catch {
    try {
      detail = (await res.text()).trim().slice(0, 400);
    } catch {
      /* corpo ilegível */
    }
  }
  return new Error(detail || `HTTP ${res.status}`);
}

export async function runInterviewTurn(params: {
  baseUrl: string;
  locale: string;
  messages: InterviewApiMessage[];
  /** Quando false, o servidor pula o TTS — corta custo e latência. */
  speak?: boolean;
  voice?: string;
}): Promise<InterviewTurnResult> {
  const url = `${params.baseUrl.replace(/\/$/, '')}/interview/turn`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: await apiJsonHeaders(),
      body: JSON.stringify({
        locale: params.locale,
        messages: params.messages,
        // Só enviamos `speak` quando é true. Omitir tem o mesmo efeito no
        // servidor novo (sem TTS) e mantém o caminho de texto compatível com
        // a API antiga, que rejeita campos desconhecidos com 400.
        ...(params.speak ? { speak: true } : {}),
        ...(params.speak && params.voice ? { voice: params.voice } : {}),
      }),
    },
    LONG_API_TIMEOUT_MS,
  );

  if (!res.ok) throw await errorFromResponse(res);
  return (await res.json()) as InterviewTurnResult;
}

/** Fala → texto. `audioBase64` deve ser base64 puro, sem prefixo `data:`. */
export async function transcribeInterviewAudio(params: {
  baseUrl: string;
  locale: string;
  audioBase64: string;
  mimeType: string;
}): Promise<string> {
  const url = `${params.baseUrl.replace(/\/$/, '')}/interview/transcribe`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: await apiJsonHeaders(),
      body: JSON.stringify({
        locale: params.locale,
        mimeType: params.mimeType,
        audioBase64: params.audioBase64,
      }),
    },
    AUDIO_API_TIMEOUT_MS,
  );

  if (!res.ok) throw await errorFromResponse(res);
  const data = (await res.json()) as { text?: unknown };
  return typeof data.text === 'string' ? data.text.trim() : '';
}
