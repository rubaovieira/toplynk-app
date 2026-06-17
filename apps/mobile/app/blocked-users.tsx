import { useRouter } from "expo-router";
import { CaretLeftIcon, Prohibit } from "phosphor-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getApiBaseUrl } from "@/lib/api-config";
import { photoUri } from "@/lib/match-demo-deck";
import type { BlockedUser } from "@/lib/moderation-api";
import { fetchBlockedUsers, unblockUser } from "@/lib/moderation-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const ACCENT = "#0A84FF";
const MUTED = "#8E8E93";

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setPhase("error");
      return;
    }
    setPhase("loading");
    try {
      setItems(await fetchBlockedUsers(base));
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onUnblock = useCallback(
    async (id: string) => {
      const base = getApiBaseUrl();
      if (!base) return;
      setBusyId(id);
      try {
        await unblockUser(base, id);
        setItems((prev) => prev.filter((u) => u.id !== id));
        showValidationToast(t("blockedUsers.unblockDone"));
      } catch (e) {
        const msg =
          e instanceof Error && e.message.trim()
            ? e.message
            : t("blockedUsers.unblockError");
        showValidationToast(msg);
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("blockedUsers.backA11y")}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <CaretLeftIcon size={22} color="#fff" weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t("blockedUsers.title")}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {phase === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : null}

      {phase === "error" ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t("blockedUsers.error")}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
            onPress={() => void load()}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>{t("blockedUsers.retry")}</Text>
          </Pressable>
        </View>
      ) : null}

      {phase === "ready" ? (
        <FlatList
          data={items}
          keyExtractor={(u) => u.id}
          contentContainerStyle={
            items.length === 0 ? styles.center : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Prohibit size={44} color={MUTED} weight="regular" />
              <Text style={styles.emptyTitle}>{t("blockedUsers.emptyTitle")}</Text>
              <Text style={styles.emptySub}>{t("blockedUsers.emptySub")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={{ uri: photoUri(item.photoSeed, 96, 96) }}
                style={styles.avatar}
              />
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.headline} numberOfLines={1}>
                  {item.headline}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.unblockBtn,
                  (pressed || busyId === item.id) && styles.pressed,
                ]}
                onPress={() => void onUnblock(item.id)}
                disabled={busyId === item.id}
                accessibilityRole="button"
                accessibilityLabel={t("blockedUsers.unblock")}
              >
                {busyId === item.id ? (
                  <ActivityIndicator color={ACCENT} size="small" />
                ) : (
                  <Text style={styles.unblockText}>
                    {t("blockedUsers.unblock")}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  emptyWrap: { alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2C2C2E",
    marginRight: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headline: { color: MUTED, fontSize: 13, marginTop: 2 },
  unblockBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: ACCENT,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  unblockText: { color: ACCENT, fontSize: 14, fontWeight: "700" },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "rgba(10,132,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(10,132,255,0.45)",
  },
  retryText: { color: ACCENT, fontSize: 15, fontWeight: "700" },
});
