import Constants from "expo-constants";

/** App ID do OneSignal (EAS / `.env` → `EXPO_PUBLIC_ONESIGNAL_APP_ID`, ou `extra.oneSignalAppId`). */
export function getOneSignalAppId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID?.trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as
    | { oneSignalAppId?: string }
    | undefined;
  const fromExtra = extra?.oneSignalAppId?.trim();
  return fromExtra || undefined;
}
