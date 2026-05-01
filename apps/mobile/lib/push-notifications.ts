import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function resolveProjectId(): string | undefined {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const v = (fromConfig || fromEas || '').trim();
  return v.length > 0 ? v : undefined;
}

/**
 * Pede permissão, configura canal Android `default`, devolve `ExponentPushToken[...]`.
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

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
