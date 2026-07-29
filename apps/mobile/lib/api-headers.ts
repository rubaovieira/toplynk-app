import { getAccessToken } from '@/lib/auth-storage';

const BASE = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
} as const;

/**
 * Registo e login — sem Bearer.
 *
 * A entrevista IA saiu daqui: agora manda Bearer quando existe token, para o
 * rate limit do servidor contar por usuário em vez de por IP.
 */
export function apiJsonHeadersPublic(extra?: Record<string, string>): Record<string, string> {
  return { ...BASE, ...extra };
}

/** PATCH e rotas autenticadas — inclui Bearer quando existir token. */
export async function apiJsonHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const h: Record<string, string> = { ...BASE, ...extra };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}
