import { apiJsonHeaders } from '@/lib/api-headers';
import { fetchWithTimeout } from '@/lib/api-fetch';

export type ReportReason = 'spam' | 'harassment' | 'fake' | 'inappropriate' | 'other';

export type BlockedUser = {
  id: string;
  name: string;
  headline: string;
  photoSeed: string;
  blockedAt: string;
};

export type SubmitReportPayload = {
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  conversationId?: string;
  messageId?: string;
};

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function errMessage(res: Response, body: string): string {
  try {
    const j: unknown = JSON.parse(body);
    if (j && typeof j === 'object' && 'message' in j) {
      const m = (j as { message: unknown }).message;
      if (typeof m === 'string') return m.trim();
      if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join(', ').trim();
    }
  } catch {
    /* ignore */
  }
  return body.trim().slice(0, 200) || `HTTP ${res.status}`;
}

export async function blockUser(baseUrl: string, userId: string): Promise<void> {
  const res = await fetchWithTimeout(`${trimBase(baseUrl)}/users/${encodeURIComponent(userId)}/block`, {
    method: 'POST',
    headers: await apiJsonHeaders(),
    body: '{}',
  });
  if (!res.ok) {
    throw new Error(errMessage(res, await res.text()));
  }
}

export async function unblockUser(baseUrl: string, userId: string): Promise<void> {
  const res = await fetchWithTimeout(`${trimBase(baseUrl)}/users/${encodeURIComponent(userId)}/block`, {
    method: 'DELETE',
    headers: await apiJsonHeaders(),
  });
  if (!res.ok) {
    throw new Error(errMessage(res, await res.text()));
  }
}

export async function fetchBlockedUsers(baseUrl: string): Promise<BlockedUser[]> {
  const res = await fetchWithTimeout(`${trimBase(baseUrl)}/users/me/blocks`, {
    method: 'GET',
    headers: await apiJsonHeaders(),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(errMessage(res, raw));
  }
  const data: unknown = JSON.parse(raw);
  return Array.isArray(data) ? (data as BlockedUser[]) : [];
}

export async function submitReport(baseUrl: string, payload: SubmitReportPayload): Promise<void> {
  const details = payload.details?.trim();
  const res = await fetchWithTimeout(`${trimBase(baseUrl)}/reports`, {
    method: 'POST',
    headers: await apiJsonHeaders(),
    body: JSON.stringify({
      reportedUserId: payload.reportedUserId,
      reason: payload.reason,
      ...(details ? { details } : {}),
      ...(payload.conversationId ? { conversationId: payload.conversationId } : {}),
      ...(payload.messageId ? { messageId: payload.messageId } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(errMessage(res, await res.text()));
  }
}
