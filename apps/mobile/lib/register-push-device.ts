/**
 * Registo do dispositivo para notificações push após o utilizador estar autenticado.
 *
 * Com `EXPO_PUBLIC_ONESIGNAL_APP_ID`: OneSignal (subscription id → `POST /push/tokens` com `provider: onesignal`).
 * Caso contrário: Expo Notifications + token Expo (`provider: expo`).
 */
import { Platform } from "react-native";

import { getAccessToken } from "@/lib/auth-storage";
import { getApiBaseUrl } from "@/lib/api-config";
import { isExpoGo } from "@/lib/expo-go";
import { getOneSignalAppId } from "@/lib/onesignal-config";
import { syncOneSignalAfterAuth } from "@/lib/onesignal";
import { registerPushToken } from "@/lib/push-api";
import { setStoredPushRegistration } from "@/lib/push-token-storage";

/**
 * Pede permissão (se ainda não existir), obtém o token e regista-o na API.
 * Não lança — falhas não devem bloquear login ou cadastro.
 */
export async function registerPushDeviceAfterAuth(): Promise<void> {
  if (Platform.OS === "web" || isExpoGo()) {
    return;
  }
  const base = getApiBaseUrl();
  if (!base) return;
  const jwt = await getAccessToken();
  if (!jwt) return;

  if (getOneSignalAppId()) {
    try {
      await syncOneSignalAfterAuth();
    } catch {
      /* permissão, rede, dev build sem plugin */
    }
    return;
  }

  try {
    const { registerForPushAsync } = await import("@/lib/push-notifications");
    const expoToken = await registerForPushAsync();
    if (!expoToken) return;
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await registerPushToken(base, expoToken, platform, "expo");
    await setStoredPushRegistration({ token: expoToken, provider: "expo" });
  } catch {
    /* permissão negada, simulador, EAS project id em falta, rede, etc. */
  }
}
