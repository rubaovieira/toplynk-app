import type { ExpoPushMessage } from 'expo-server-sdk';

import type { PushPayload } from './push.types';

export type PushKind = 'messages' | 'social' | 'general';

export function pushKindFromPayload(payload: PushPayload): PushKind {
  const t = payload.data && typeof payload.data.type === 'string' ? payload.data.type : '';
  if (t === 'message') {
    return 'messages';
  }
  if (t === 'discovery_like' || t === 'discovery_super') {
    return 'social';
  }
  return 'general';
}

export function expoAndroidChannelId(kind: PushKind): string {
  if (kind === 'messages') return 'messages';
  if (kind === 'social') return 'social';
  return 'default';
}

export function allowsPushForKind(
  kind: PushKind,
  prefs: { pushNotifyMessages: boolean; pushNotifySocial: boolean },
): boolean {
  if (kind === 'messages') {
    return prefs.pushNotifyMessages;
  }
  if (kind === 'social') {
    return prefs.pushNotifySocial;
  }
  return true;
}

export function buildExpoPushMessage(token: string, payload: PushPayload, kind: PushKind): ExpoPushMessage {
  const priority: ExpoPushMessage['priority'] = kind === 'messages' ? 'high' : 'default';
  const interruptionLevel: ExpoPushMessage['interruptionLevel'] =
    kind === 'messages' ? 'active' : kind === 'social' ? 'active' : 'passive';

  const msg: ExpoPushMessage = {
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
    channelId: expoAndroidChannelId(kind),
    priority,
    interruptionLevel,
  };

  return msg;
}
