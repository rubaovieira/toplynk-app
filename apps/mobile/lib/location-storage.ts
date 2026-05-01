import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@toplynk/last_location';

export type StoredLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export async function saveLastKnownLocation(latitude: number, longitude: number): Promise<void> {
  const payload: StoredLocation = {
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function getLastKnownLocation(): Promise<StoredLocation | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as StoredLocation;
    if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

export async function clearLastKnownLocation(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
