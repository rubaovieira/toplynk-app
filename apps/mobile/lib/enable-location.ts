import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { getApiBaseUrl } from '@/lib/api-config';
import { saveLastKnownLocation } from '@/lib/location-storage';
import { getSetupUserId } from '@/lib/setup-user-session';
import { patchUserProfile } from '@/lib/users-api';

function formatCityLabel(place: Location.LocationGeocodedAddress): string {
  const city = place.city || place.subregion || place.district || '';
  const region = place.region || '';
  const country = place.country || '';
  if (city && region) return `${city}, ${region}`.trim();
  if (city && country) return `${city}, ${country}`.trim();
  if (city) return city.trim();
  if (place.name) return String(place.name).trim();
  return '';
}

export type EnableLocationResult = 'saved' | 'denied' | 'error';

/**
 * Pede permissão de localização, captura as coordenadas e salva no perfil (lat/long + cidade).
 * Mesmo fluxo do setup/step6, reutilizável quando a Home descobre que o perfil está sem localização
 * (o `/discovery/nearby` exige geo e retorna 400 sem ela).
 */
export async function enableLocationAndSave(): Promise<EnableLocationResult> {
  if (Platform.OS === 'web') return 'error';
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return 'denied';

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const latitude = pos.coords.latitude;
    const longitude = pos.coords.longitude;
    await saveLastKnownLocation(latitude, longitude).catch(() => undefined);

    const base = getApiBaseUrl();
    const uid = await getSetupUserId();
    if (!base || !uid) return 'error';

    let cityLabel: string | undefined;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = places[0];
      if (first) {
        const line = formatCityLabel(first);
        if (line) cityLabel = line.slice(0, 200);
      }
    } catch {
      /* cidade é opcional */
    }

    await patchUserProfile(base, uid, {
      latitude,
      longitude,
      ...(cityLabel ? { cityLabel } : {}),
    });
    return 'saved';
  } catch {
    return 'error';
  }
}
