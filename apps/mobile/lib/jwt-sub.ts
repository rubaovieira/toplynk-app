/** Lê `sub` do JWT (payload) sem validar assinatura — só para UI (ex.: lado da mensagem). */
export function decodeJwtSub(token: string): string | undefined {
  try {
    const seg = token.split('.')[1];
    if (!seg) return undefined;
    let base64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(pad);
    if (typeof globalThis.atob !== 'function') return undefined;
    const json = globalThis.atob(base64);
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}
