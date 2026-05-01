import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@toplynk/setup-user-id';

export async function setSetupUserId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY, id.trim());
}

export async function getSetupUserId(): Promise<string | undefined> {
  const v = await AsyncStorage.getItem(KEY);
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  return v.trim();
}

export async function clearSetupUserId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
