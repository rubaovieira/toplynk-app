import { apiJsonHeaders } from '@/lib/api-headers';
import { fetchWithTimeout } from '@/lib/api-fetch';
import i18n from '@/lib/i18n';

export type ConversationListRow = {
  conversationId: string;
  peerId: string;
  peerName: string;
  peerPhotoSeed: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};

export type ChatMessageRow = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type OpenChatResult = {
  conversationId: string;
  peerId: string;
  peerName: string;
};

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

export async function listChatConversations(baseUrl: string): Promise<ConversationListRow[]> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetchWithTimeout(`${base}/chats`, { headers: await apiJsonHeaders() });
  const raw = await res.text();
  if (!res.ok) throw new Error(nestErrorMessage(res, raw));
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) return [];
  return data as ConversationListRow[];
}

export async function openChatConversation(baseUrl: string, peerId: string): Promise<OpenChatResult> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetchWithTimeout(`${base}/chats/open`, {
    method: 'POST',
    headers: await apiJsonHeaders(),
    body: JSON.stringify({ peerId }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(nestErrorMessage(res, raw));
  const data = JSON.parse(raw) as OpenChatResult;
  if (typeof data?.conversationId !== 'string' || typeof data?.peerId !== 'string') {
    throw new Error(i18n.t('errors.invalidOpenConversation'));
  }
  return data;
}

export async function fetchChatMessages(baseUrl: string, conversationId: string): Promise<ChatMessageRow[]> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetchWithTimeout(`${base}/chats/${encodeURIComponent(conversationId)}/messages`, {
    headers: await apiJsonHeaders(),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(nestErrorMessage(res, raw));
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) return [];
  return data as ChatMessageRow[];
}

export async function sendChatMessage(
  baseUrl: string,
  conversationId: string,
  body: string,
): Promise<ChatMessageRow> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetchWithTimeout(`${base}/chats/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    headers: await apiJsonHeaders(),
    body: JSON.stringify({ body }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(nestErrorMessage(res, raw));
  const data = JSON.parse(raw) as ChatMessageRow;
  if (typeof data?.id !== 'string' || typeof data?.body !== 'string') {
    throw new Error(i18n.t('errors.invalidSendMessage'));
  }
  return data;
}
