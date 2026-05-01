import { router } from "expo-router";

/** Dados enviados pela API em `data` (Expo / FCM / OneSignal additionalData). */
export function routeFromPushData(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  const type = data.type;
  if (type === "message" && typeof data.peerId === "string" && data.peerId.trim()) {
    router.push(`/chat/${data.peerId.trim()}`);
    return;
  }
  if (
    (type === "discovery_like" || type === "discovery_super") &&
    typeof data.peerId === "string"
  ) {
    router.push({ pathname: "/user-profile", params: { id: data.peerId } });
    return;
  }
  if (type === "match") {
    router.push("/notifications");
  }
}
