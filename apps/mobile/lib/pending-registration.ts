import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@toplynk/pending-signup-email';

export async function setPendingSignupEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(KEY, email.trim().toLowerCase());
}

export async function getPendingSignupEmail(): Promise<string | undefined> {
  const v = await AsyncStorage.getItem(KEY);
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  return v.trim().toLowerCase();
}

export async function clearPendingSignupEmail(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
