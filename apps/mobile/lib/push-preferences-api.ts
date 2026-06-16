import { apiJsonHeaders } from "@/lib/api-headers";
import { fetchWithTimeout } from "@/lib/api-fetch";

export type PushPreferences = {
  pushNotifyMessages: boolean;
  pushNotifySocial: boolean;
};

function nestErrorMessage(res: Response, bodyText: string): string {
  try {
    const j: unknown = JSON.parse(bodyText);
    if (j && typeof j === "object" && "message" in j) {
      const m = (j as { message: unknown }).message;
      if (typeof m === "string") return m.trim();
      if (Array.isArray(m)) return m.filter((x) => typeof x === "string").join(", ").trim();
    }
  } catch {
    /* ignore */
  }
  return bodyText.trim().slice(0, 200) || `HTTP ${res.status}`;
}

export async function fetchPushPreferences(
  baseUrl: string,
): Promise<PushPreferences | null> {
  const res = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/push/preferences`, {
    method: "GET",
    headers: await apiJsonHeaders(),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }
  try {
    const j = JSON.parse(raw) as unknown;
    if (
      j &&
      typeof j === "object" &&
      typeof (j as PushPreferences).pushNotifyMessages === "boolean" &&
      typeof (j as PushPreferences).pushNotifySocial === "boolean"
    ) {
      return j as PushPreferences;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function patchPushPreferences(
  baseUrl: string,
  patch: Partial<PushPreferences>,
): Promise<PushPreferences> {
  const res = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/push/preferences`, {
    method: "PATCH",
    headers: await apiJsonHeaders(),
    body: JSON.stringify(patch),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }
  const j = JSON.parse(raw) as unknown;
  if (
    j &&
    typeof j === "object" &&
    typeof (j as PushPreferences).pushNotifyMessages === "boolean" &&
    typeof (j as PushPreferences).pushNotifySocial === "boolean"
  ) {
    return j as PushPreferences;
  }
  throw new Error("Resposta inválida do servidor.");
}
