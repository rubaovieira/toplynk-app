import { apiJsonHeaders } from '@/lib/api-headers';

function nestErrorMessage(res: Response, bodyText: string): string {
  try {
    const j: unknown = JSON.parse(bodyText);
    if (j && typeof j === 'object' && 'message' in j) {
      const m = (j as { message: unknown }).message;
      if (typeof m === 'string') return m.trim();
      if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join(', ').trim();
    }
  } catch {
    /* ignore */
  }
  return bodyText.trim().slice(0, 200) || `HTTP ${res.status}`;
}

export async function registerExpoToken(
  baseUrl: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/push/tokens`, {
    method: 'POST',
    headers: await apiJsonHeaders(),
    body: JSON.stringify({ token, platform }),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }
}

export async function unregisterExpoToken(baseUrl: string, token: string): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/push/tokens`, {
    method: 'DELETE',
    headers: await apiJsonHeaders(),
    body: JSON.stringify({ token }),
  });
  if (!res.ok && res.status !== 204) {
    const raw = await res.text();
    throw new Error(nestErrorMessage(res, raw));
  }
}
