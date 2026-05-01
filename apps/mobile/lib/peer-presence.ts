import type { TFunction } from 'i18next';

/** Considerado “online” se o servidor recebeu atividade nesta janela (heartbeat ~60s). */
const ONLINE_WINDOW_MS = 90_000;

function lastSeenMs(lastSeenAtIso: string | null | undefined): number | null {
  if (lastSeenAtIso == null || lastSeenAtIso === '') {
    return null;
  }
  const last = Date.parse(lastSeenAtIso);
  return Number.isNaN(last) ? null : last;
}

export function isPeerOnline(
  lastSeenAtIso: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  const last = lastSeenMs(lastSeenAtIso);
  if (last === null) {
    return false;
  }
  const delta = nowMs - last;
  return delta >= 0 && delta <= ONLINE_WINDOW_MS;
}

export function peerPresenceSubtitle(
  lastSeenAtIso: string | null | undefined,
  t: TFunction,
  nowMs: number = Date.now(),
): string {
  const last = lastSeenMs(lastSeenAtIso);
  if (last === null) {
    return t('chat.offline');
  }
  const delta = nowMs - last;
  if (delta >= 0 && delta <= ONLINE_WINDOW_MS) {
    return t('chat.online');
  }
  const diffMin = Math.floor(delta / 60_000);
  if (diffMin < 60) {
    return t('chat.lastSeenMinutes', { count: Math.max(1, diffMin) });
  }
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 48) {
    return t('chat.lastSeenHours', { count: diffH });
  }
  const diffD = Math.floor(diffH / 24);
  return t('chat.lastSeenDays', { count: Math.max(1, diffD) });
}
