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
 */

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
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Network request failed (timeout)');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
