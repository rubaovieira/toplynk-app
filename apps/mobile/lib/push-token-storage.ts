import { Platform } from "react-native";

import type { PushProvider } from "@/lib/push-api";

const KEY_NATIVE_LEGACY = "toplynk_expo_push_token";
const KEY_NATIVE = "toplynk_push_registration";
const KEY_WEB_LEGACY = "@toplynk/expo_push_token_web";
const KEY_WEB = "@toplynk/push_registration_web";

export type StoredPushRegistration = {
  token: string;
  provider: PushProvider;
};

async function nativeGet(key: string): Promise<string | null> {
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(key);
}

async function nativeSet(key: string, value: string): Promise<void> {
  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(key, value);
}

async function nativeDelete(key: string): Promise<void> {
  const SecureStore = await import("expo-secure-store");
  await SecureStore.deleteItemAsync(key);
}

function parseRegistration(raw: string | null): StoredPushRegistration | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const j = JSON.parse(raw) as unknown;
    if (
      j &&
      typeof j === "object" &&
      "token" in j &&
      "provider" in j &&
      typeof (j as { token: unknown }).token === "string" &&
      ((j as { provider: unknown }).provider === "expo" ||
        (j as { provider: unknown }).provider === "onesignal")
    ) {
      return {
        token: (j as { token: string }).token.trim(),
        provider: (j as { provider: PushProvider }).provider,
      };
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Último token registado na API (Expo ou OneSignal), para revoke no logout. */
export async function getStoredPushRegistration(): Promise<
  StoredPushRegistration | undefined
> {
  if (Platform.OS === "web") {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
      .default;
    const json = await AsyncStorage.getItem(KEY_WEB);
    const fromJson = parseRegistration(json);
    if (fromJson) return fromJson;
    const legacy = await AsyncStorage.getItem(KEY_WEB_LEGACY);
    const t = legacy?.trim();
    if (t) return { token: t, provider: "expo" };
    return undefined;
  }
  const json = await nativeGet(KEY_NATIVE);
  const fromJson = parseRegistration(json);
  if (fromJson) return fromJson;
  const legacy = await nativeGet(KEY_NATIVE_LEGACY);
  const t = legacy?.trim();
  if (t) return { token: t, provider: "expo" };
  return undefined;
}

/** @deprecated usar `getStoredPushRegistration` */
export async function getStoredExpoPushToken(): Promise<string | undefined> {
  const r = await getStoredPushRegistration();
  return r?.provider === "expo" ? r.token : undefined;
}

export async function setStoredPushRegistration(
  reg: StoredPushRegistration,
): Promise<void> {
  const payload = JSON.stringify({
    token: reg.token.trim(),
    provider: reg.provider,
  });
  if (Platform.OS === "web") {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
      .default;
    await AsyncStorage.setItem(KEY_WEB, payload);
    return;
  }
  await nativeSet(KEY_NATIVE, payload);
  try {
    await nativeDelete(KEY_NATIVE_LEGACY);
  } catch {
    /* ignore */
  }
}

/** @deprecated usar `setStoredPushRegistration` */
export async function setStoredExpoPushToken(token: string): Promise<void> {
  await setStoredPushRegistration({ token: token.trim(), provider: "expo" });
}

export async function clearStoredPushRegistration(): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
      .default;
    await AsyncStorage.removeItem(KEY_WEB);
    await AsyncStorage.removeItem(KEY_WEB_LEGACY);
    return;
  }
  try {
    await nativeDelete(KEY_NATIVE);
  } catch {
    /* ignore */
  }
  try {
    await nativeDelete(KEY_NATIVE_LEGACY);
  } catch {
    /* ignore */
  }
}

/** @deprecated usar `clearStoredPushRegistration` */
export async function clearStoredExpoPushToken(): Promise<void> {
  await clearStoredPushRegistration();
}
