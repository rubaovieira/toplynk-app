import { Platform } from "react-native";

import { getAccessToken } from "@/lib/auth-storage";
import { getApiBaseUrl } from "@/lib/api-config";
import { isExpoGo } from "@/lib/expo-go";
import { decodeJwtSub } from "@/lib/jwt-sub";
import { registerPushToken } from "@/lib/push-api";
import { getOneSignalAppId } from "@/lib/onesignal-config";
import { routeFromPushData } from "@/lib/push-deep-link";
import { setStoredPushRegistration } from "@/lib/push-token-storage";

/** Evita import estático: o TurboModule não existe no Expo Go. */
type OneSignalModule = typeof import("react-native-onesignal");

let cached: OneSignalModule | null | undefined;

function loadOneSignal(): OneSignalModule | null {
  if (Platform.OS === "web" || isExpoGo()) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-onesignal") as OneSignalModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

let initialized = false;

function extractAdditionalData(event: {
  notification?: { additionalData?: object };
}): Record<string, unknown> | undefined {
  const raw = event.notification?.additionalData;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return undefined;
}

/** Inicializa SDK uma vez (cold start). Requer dev build / EAS com `onesignal-expo-plugin`. */
export function ensureOneSignalInitialized(): void {
  const OS = loadOneSignal();
  if (!OS) return;
  const appId = getOneSignalAppId();
  if (!appId || initialized) return;
  if (__DEV__) {
    OS.OneSignal.Debug.setLogLevel(OS.LogLevel.Warn);
  }
  OS.OneSignal.initialize(appId);
  initialized = true;
}

/** Liga o utilizador ao OneSignal e regista o subscription id na API. */
export async function syncOneSignalAfterAuth(): Promise<void> {
  const OS = loadOneSignal();
  if (!OS) return;
  if (Platform.OS === "web") return;
  const appId = getOneSignalAppId();
  if (!appId) return;

  ensureOneSignalInitialized();

  const jwt = await getAccessToken();
  if (!jwt?.trim()) return;
  const userId = decodeJwtSub(jwt);
  if (!userId) return;

  const base = getApiBaseUrl();
  if (!base) return;

  OS.OneSignal.login(userId);

  const canAsk = await OS.OneSignal.Notifications.canRequestPermission();
  if (canAsk) {
    await OS.OneSignal.Notifications.requestPermission(false);
  }

  const optedIn = await OS.OneSignal.User.pushSubscription.getOptedInAsync();
  if (!optedIn) {
    OS.OneSignal.User.pushSubscription.optIn();
  }

  let subId: string | null = null;
  for (let i = 0; i < 10; i++) {
    subId = await OS.OneSignal.User.pushSubscription.getIdAsync();
    if (subId?.trim()) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!subId?.trim()) return;

  const platform = Platform.OS === "ios" ? "ios" : "android";

  try {
    await registerPushToken(base, subId.trim(), platform, "onesignal");
    await setStoredPushRegistration({
      token: subId.trim(),
      provider: "onesignal",
    });
  } catch {
    /* rede / 401 */
  }
}

export function attachOneSignalNotificationOpenRouter(): () => void {
  if (Platform.OS === "web") {
    return () => undefined;
  }
  const OS = loadOneSignal();
  if (!OS) {
    return () => undefined;
  }
  const appId = getOneSignalAppId();
  if (!appId) {
    return () => undefined;
  }
  ensureOneSignalInitialized();

  const handler = (event: { notification?: { additionalData?: object } }) => {
    routeFromPushData(extractAdditionalData(event));
  };
  OS.OneSignal.Notifications.addEventListener("click", handler);
  return () => {
    OS.OneSignal.Notifications.removeEventListener("click", handler);
  };
}

export function logoutOneSignalUser(): void {
  if (Platform.OS === "web") return;
  if (!getOneSignalAppId()) return;
  const OS = loadOneSignal();
  if (!OS) return;
  try {
    OS.OneSignal.logout();
  } catch {
    /* ignore */
  }
}
