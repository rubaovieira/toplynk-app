/**
 * URL base da API Nest (sem barra final). Ex.: http://192.168.1.10:3000
 * Emulador Android: normalmente http://10.0.2.2:3000
 */
export function getApiBaseUrl(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (typeof raw !== 'string') return undefined;
  const u = raw.replace(/^\uFEFF/, '').trim().replace(/\/$/, '');
  return u === '' ? undefined : u;
}
