import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY_NATIVE = 'toplynk_pending_signup_password';
const KEY_WEB = '@toplynk/pending_signup_password_web';

export async function setPendingSignupPassword(password: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(KEY_WEB, password);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(KEY_NATIVE, password);
}

export async function getPendingSignupPassword(): Promise<string | undefined> {
  let v: string | null = null;
  if (Platform.OS === 'web') {
    v = await AsyncStorage.getItem(KEY_WEB);
  } else {
    const SecureStore = await import('expo-secure-store');
    v = await SecureStore.getItemAsync(KEY_NATIVE);
  }
  if (typeof v !== 'string' || v.length === 0) return undefined;
  return v;
}

export async function clearPendingSignupPassword(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(KEY_WEB);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(KEY_NATIVE);
}
