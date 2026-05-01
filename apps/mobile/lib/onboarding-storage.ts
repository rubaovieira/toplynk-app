import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@toplynk/onboarding_complete';

export async function getHasCompletedOnboarding(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}
