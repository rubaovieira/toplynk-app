import { apiJsonHeaders } from '@/lib/api-headers';
import { fetchWithTimeout } from '@/lib/api-fetch';

export type AppNotificationItem = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  createdAt: string;
};

export async function fetchNotifications(params: {
  baseUrl: string;
  limit?: number;
}): Promise<AppNotificationItem[]> {
  const base = params.baseUrl.replace(/\/$/, '');
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  const res = await fetchWithTimeout(`${base}/notifications${qs ? `?${qs}` : ''}`, {
    headers: await apiJsonHeaders(),
  });
  if (!res.ok) {
    throw new Error(`notifications ${res.status}`);
  }
  const json = (await res.json()) as { items?: AppNotificationItem[] };
  return Array.isArray(json.items) ? json.items : [];
}
