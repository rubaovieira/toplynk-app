import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LEGACY_LOGGED_IN = '@toplynk/logged_in';
const ACCESS_TOKEN_KEY_NATIVE = 'toplynk_access_token';
/** Web: SecureStore não aplica-se; JWT fica em AsyncStorage (dev). */
const ACCESS_TOKEN_KEY_WEB = '@toplynk/access_token_jwt_web';

async function nativeSecureGet(key: string): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function nativeSecureSet(key: string, value: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

async function nativeSecureDelete(key: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | undefined> {
  let v: string | null = null;
  if (Platform.OS === 'web') {
    v = await AsyncStorage.getItem(ACCESS_TOKEN_KEY_WEB);
  } else {
    v = await nativeSecureGet(ACCESS_TOKEN_KEY_NATIVE);
  }
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return undefined;
}

export async function setAccessToken(token: string): Promise<void> {
  const t = token.trim();
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY_WEB, t);
  } else {
    await nativeSecureSet(ACCESS_TOKEN_KEY_NATIVE, t);
  }
  try {
    await AsyncStorage.removeItem(LEGACY_LOGGED_IN);
  } catch {
    /* ignore */
  }
}

export async function clearSession(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY_WEB);
    } else {
      await nativeSecureDelete(ACCESS_TOKEN_KEY_NATIVE);
    }
  } catch {
    /* ignore */
  }
  try {
    await AsyncStorage.removeItem(LEGACY_LOGGED_IN);
  } catch {
    /* ignore */
  }
}

/** Sessão autenticada = JWT guardado (SecureStore nativo / AsyncStorage na web). */
export async function getIsLoggedIn(): Promise<boolean> {
  const legacy = await AsyncStorage.getItem(LEGACY_LOGGED_IN);
  if (legacy === 'true') {
    await AsyncStorage.removeItem(LEGACY_LOGGED_IN);
  }
  return !!(await getAccessToken());
}
