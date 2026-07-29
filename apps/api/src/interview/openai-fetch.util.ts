import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Chamadas à OpenAI com deadline explícito.
 *
 * Sem o AbortController o request fica pendurado até o socket cair, e o app
 * mobile aborta antes (45s) mostrando erro de rede genérico — foi assim que
 * nasceu a "tela congelada" apontada na Guideline 2.1a da App Store.
 */
export async function fetchOpenAi(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new GatewayTimeoutException(
        `Tempo esgotado ao contactar a OpenAI (${label}).`,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new BadGatewayException(`Falha de rede ao contactar a OpenAI (${label}): ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Extrai `error.message` do corpo de erro da OpenAI, com fallback para texto cru. */
export async function openAiErrorDetail(res: Response): Promise<string> {
  const body = await res.text();
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (typeof j.error?.message === 'string' && j.error.message.trim()) {
      return j.error.message.trim();
    }
  } catch {
    /* corpo não-JSON: cai no texto cru */
  }
  return body.trim().slice(0, 400);
}

export type OpenAiAuth = {
  apiKey: string;
  headers: Record<string, string>;
};

/**
 * Lê a chave e os headers opcionais de org/projeto.
 * Lança 503 (e não 502) quando a chave falta: é erro de configuração do
 * servidor, não da OpenAI — o mobile distingue os dois casos.
 */
export function readOpenAiAuth(config: ConfigService): OpenAiAuth {
  const apiKey = config.get<string>('OPENAI_API_KEY')?.trim();
  if (!apiKey) {
    throw new ServiceUnavailableException(
      'OPENAI_API_KEY não está definida no servidor (apps/api/.env).',
    );
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
  const organization = config.get<string>('OPENAI_ORG_ID')?.trim();
  const project = config.get<string>('OPENAI_PROJECT_ID')?.trim();
  if (organization) headers['OpenAI-Organization'] = organization;
  if (project) headers['OpenAI-Project'] = project;
  return { apiKey, headers };
}

/** Lê um inteiro de env com fallback, ignorando valores não-numéricos. */
export function readTimeoutMs(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = Number(config.get<string>(key));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}
