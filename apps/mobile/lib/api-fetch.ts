/**
 * `fetch` com timeout via AbortController.
 *
 * Sem timeout, uma requisição presa (servidor lento, rede instável, endpoint que não
 * responde) deixa a UI em spinner infinito — foi exatamente o que a App Review reportou
 * como "tela congelada" na Home (Guideline 2.1a). Aqui garantimos que toda chamada
 * resolve (sucesso ou erro) dentro de um limite, para a tela nunca ficar travada.
 *
 * No timeout, lança um erro de rede reconhecível pelos mapeadores de mensagem existentes
 * (`/network request failed/i`).
 *
 * Além do timeout, intercepta 401 em requisições autenticadas (com header Authorization):
 * token expirado/inválido dispara o fluxo global de sessão expirada (logout + login),
 * para o app não ficar preso recebendo 401 em cadeia. Um 401 no login (sem Bearer) não
 * dispara nada — é tratado localmente como "credenciais inválidas".
 */

import { notifyUnauthorized } from '@/lib/session-expired';

/** Padrão: requisições normais (login, discovery, presença, perfil). */
export const DEFAULT_API_TIMEOUT_MS = 15000;

/** Entrevista IA: a resposta passa pela OpenAI no backend e pode demorar mais. */
export const LONG_API_TIMEOUT_MS = 45000;

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    if (res.status === 401 && hasAuthHeader(init.headers)) {
      notifyUnauthorized();
    }
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Network request failed (timeout)');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** True se a requisição enviou um header Authorization (ou seja, era autenticada). */
function hasAuthHeader(headers: RequestInit['headers']): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has('Authorization');
  if (Array.isArray(headers)) {
    return headers.some(([k]) => k.toLowerCase() === 'authorization');
  }
  return Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
}
