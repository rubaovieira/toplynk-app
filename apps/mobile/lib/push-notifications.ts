import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import { routeFromPushData } from '@/lib/push-deep-link';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const raw = notification.request.content.data;
    const data =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : undefined;
    const type = data?.type;
    const isSocial = type === 'discovery_like' || type === 'discovery_super';
    return {
      shouldShowAlert: true,
      shouldPlaySound: !isSocial,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

function resolveProjectId(): string | undefined {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const v = (fromConfig || fromEas || '').trim();
  return v.length > 0 ? v : undefined;
}

/**
 * Canais Android alinhados com a API (`channelId` em Expo push).
 * Idempotente — seguro chamar no arranque e após permissão.
 */
export async function ensureAndroidPushChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Geral',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync('social', {
    name: 'Interesses',
    description: 'Likes e destaques no discovery',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Mensagens',
    description: 'Novas mensagens nas conversas',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export function routeFromNotificationResponse(response: NotificationResponse | null | undefined): void {
  if (!response) return;
  const raw = response.notification.request.content.data;
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : undefined;
  routeFromPushData(data);
}

/**
 * Pede permissão, configura canais Android, devolve `ExponentPushToken[...]`.
 * Devolve null em simulador, web, ou sem `EAS_PROJECT_ID` / `extra.eas.projectId`.
 */
export async function registerForPushAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!Device.isDevice) {
    return null;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    return null;
  }

  await ensureAndroidPushChannels();

  const projectId = resolveProjectId();
  if (!projectId) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[push] Defina EAS_PROJECT_ID no ambiente ou extra.eas.projectId (ex.: após `eas init`).',
      );
    }
    return null;
  }

  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    return typeof res.data === 'string' && res.data.length > 0 ? res.data : null;
  } catch {
    return null;
  }
}
