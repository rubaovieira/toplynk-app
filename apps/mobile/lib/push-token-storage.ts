import { Platform } from 'react-native';

const KEY_NATIVE = 'toplynk_expo_push_token';
const KEY_WEB = '@toplynk/expo_push_token_web';

async function nativeGet(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(KEY_NATIVE);
}

async function nativeSet(value: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(KEY_NATIVE, value);
}

async function nativeDelete(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(KEY_NATIVE);
}

/** Último Expo push token registado (para revoke no logout). */
export async function getStoredExpoPushToken(): Promise<string | undefined> {
  if (Platform.OS === 'web') {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const v = await AsyncStorage.getItem(KEY_WEB);
    return v?.trim() || undefined;
  }
  const v = await nativeGet();
  return v?.trim() || undefined;
}

export async function setStoredExpoPushToken(token: string): Promise<void> {
  const t = token.trim();
  if (Platform.OS === 'web') {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(KEY_WEB, t);
    return;
  }
  await nativeSet(t);
}

export async function clearStoredExpoPushToken(): Promise<void> {
  if (Platform.OS === 'web') {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(KEY_WEB);
    return;
  }
  try {
    await nativeDelete();
  } catch {
    /* ignore */
  }
}
