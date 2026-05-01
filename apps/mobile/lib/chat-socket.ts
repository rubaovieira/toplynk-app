import { io, type Socket } from 'socket.io-client';

import type { ChatMessageRow } from '@/lib/chats-api';

export type ChatJoinAck = { ok: true } | { error: string };

/**
 * Liga ao mesmo host que a REST API; Socket.IO usa o path predefinido `/socket.io`.
 * O servidor Nest valida `handshake.auth.token` (JWT access).
 */
export function createChatSocket(apiBaseUrl: string, accessToken: string): Socket {
  const url = apiBaseUrl.replace(/\/$/, '');
  return io(url, {
    transports: ['websocket', 'polling'],
    auth: { token: accessToken },
    reconnection: true,
    reconnectionDelayMax: 10_000,
    autoConnect: true,
  });
}

export function attachChatRealtime(
  socket: Socket,
  conversationId: string,
  onMessage: (msg: ChatMessageRow) => void,
): () => void {
  const onIncoming = (msg: ChatMessageRow) => {
    if (!msg || typeof msg.id !== 'string') return;
    onMessage(msg);
  };

  const runJoin = () => {
    socket.emit('chat:join', { conversationId }, (ack: ChatJoinAck) => {
      if (ack && 'error' in ack && ack.error && __DEV__) {
        console.warn('[chat-socket] chat:join', ack.error);
      }
    });
  };

  socket.on('chat:message', onIncoming);
  socket.on('connect', runJoin);
  if (socket.connected) {
    runJoin();
  }

  return () => {
    socket.off('chat:message', onIncoming);
    socket.off('connect', runJoin);
  };
}
