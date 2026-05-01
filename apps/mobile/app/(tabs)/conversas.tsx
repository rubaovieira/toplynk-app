import { useFocusEffect } from "@react-navigation/native";
import {
  CaretRightIcon,
  Chats,
  Heart,
  MagnifyingGlass,
} from "phosphor-react-native";
import { type Href, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { getAccessToken } from "@/lib/auth-storage";
import { getApiBaseUrl } from "@/lib/api-config";
import type { ConversationListRow } from "@/lib/chats-api";
import { listChatConversations } from "@/lib/chats-api";
import { photoUri } from "@/lib/match-demo-deck";

type RecentChatItem = {
  id: string;
  name: string;
  photoSeed: string;
  online: boolean;
  unread: number;
  previewKey?: string;
  previewText?: string;
};

const BG = "#121212";
const ACCENT = "#0A84FF";
const MUTED = "#8E8E93";
const ROW_LINE = "rgba(255,255,255,0.1)";
const PILL_BG = "#1C1C1E";
const ONLINE = "#34C759";
const PAD = 16;

type Segment = "messages" | "newMatch";

type ConversasLiveState =
  | { kind: "idle" }
  | { kind: "unauthenticated" }
  | { kind: "loading" }
  | { kind: "ready"; rows: ConversationListRow[] };

export default function ConversasScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>("messages");
  const [liveState, setLiveState] = useState<ConversasLiveState>({
    kind: "idle",
  });
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const base = getApiBaseUrl();
        const token = await getAccessToken();
        if (!active) return;
        if (!base || !token) {
          setLiveState({ kind: "unauthenticated" });
          return;
        }
        setLiveState({ kind: "loading" });
        try {
          const rows = await listChatConversations(base);
          if (active) setLiveState({ kind: "ready", rows });
        } catch {
          if (active) setLiveState({ kind: "ready", rows: [] });
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    const base = getApiBaseUrl();
    const token = await getAccessToken();
    if (!base || !token) return;
    setRefreshing(true);
    try {
      const rows = await listChatConversations(base);
      setLiveState({ kind: "ready", rows });
    } catch {
      setLiveState({ kind: "ready", rows: [] });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const recentData = useMemo((): RecentChatItem[] => {
    if (segment === "newMatch") {
      return [];
    }
    if (
      liveState.kind === "idle" ||
      liveState.kind === "loading" ||
      liveState.kind === "unauthenticated"
    ) {
      return [];
    }
    return liveState.rows.map((r) => {
      const seed =
        typeof r.peerPhotoSeed === "string" && r.peerPhotoSeed.trim()
          ? r.peerPhotoSeed.trim()
          : `u-${r.peerId.slice(0, 8)}-a`;
      return {
        id: r.peerId,
        name: r.peerName,
        photoSeed: seed,
        online: false,
        unread: 0,
        previewText: r.lastMessageBody?.trim() || t("chatsTab.noMessagesYet"),
      };
    });
  }, [segment, liveState, t]);

  const listBottomPad = Math.max(insets.bottom, 12) + 20;

  const isUnauthenticated = liveState.kind === "unauthenticated";

  const showEmptyMessages =
    segment === "messages" &&
    (liveState.kind === "ready" || liveState.kind === "unauthenticated") &&
    recentData.length === 0;

  const showEmptyNewMatch = segment === "newMatch";

  const showListLoading =
    segment === "messages" &&
    (liveState.kind === "idle" || liveState.kind === "loading");

  const showConversationRows =
    segment === "newMatch" ||
    (segment === "messages" &&
      (liveState.kind === "ready" || liveState.kind === "unauthenticated"));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={ACCENT}
            enabled={liveState.kind !== "unauthenticated"}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: listBottomPad },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarText}>
            <Text style={styles.screenTitle}>{t("chatsTab.title")}</Text>
            <Text style={styles.screenSubtitle} numberOfLines={2}>
              {t("chatsTab.subtitle")}
            </Text>
          </View>
          <View style={styles.topBarActions}>
            <Pressable
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("chatsTab.searchA11y")}
              style={({ pressed }) => [
                styles.searchBtn,
                pressed && styles.iconPressed,
              ]}
              onPress={() => router.push("/matches-search" as Href)}
            >
              <MagnifyingGlass size={18} color="#F2F2F7" weight="bold" />
            </Pressable>
          </View>
        </View>

        <View style={styles.pillWrap}>
          <View style={styles.pill}>
            <Pressable
              onPress={() => setSegment("messages")}
              style={[
                styles.pillSeg,
                segment === "messages"
                  ? styles.pillSegActive
                  : styles.pillSegIdle,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: segment === "messages" }}
            >
              <Text
                style={[
                  styles.pillText,
                  segment === "messages"
                    ? styles.pillTextActive
                    : styles.pillTextIdle,
                ]}
              >
                {t("chatsTab.segmentMessages")}
              </Text>
            </Pressable>
            <View style={styles.tabDivider} />
            <Pressable
              onPress={() => setSegment("newMatch")}
              style={[
                styles.pillSeg,
                segment === "newMatch"
                  ? styles.pillSegActive
                  : styles.pillSegIdle,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: segment === "newMatch" }}
            >
              <Text
                style={[
                  styles.pillText,
                  segment === "newMatch"
                    ? styles.pillTextActive
                    : styles.pillTextIdle,
                ]}
              >
                {t("chatsTab.segmentNewMatch")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t("chatsTab.recent")}</Text>
          {showListLoading ? (
            <ActivityIndicator size="small" color={ACCENT} />
          ) : null}
        </View>

        {showEmptyMessages ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Chats size={30} color={MUTED} weight="regular" />
            </View>
            <Text style={styles.emptyTitle}>
              {isUnauthenticated
                ? t("chatsTab.signInTitle")
                : t("chatsTab.emptyTitle")}
            </Text>
            <Text style={styles.emptySub}>
              {isUnauthenticated
                ? t("chatsTab.signInSub")
                : t("chatsTab.emptySub")}
            </Text>
            {isUnauthenticated ? (
              <Pressable
                style={({ pressed }) => [
                  styles.signInBtn,
                  pressed && styles.signInBtnPressed,
                ]}
                onPress={() => router.push("/login" as Href)}
                accessibilityRole="button"
                accessibilityLabel={t("profileTab.guestLogin")}
              >
                <Text style={styles.signInBtnText}>
                  {t("profileTab.guestLogin")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {showEmptyNewMatch && !showEmptyMessages ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Heart size={28} color={MUTED} weight="regular" />
            </View>
            <Text style={styles.emptyTitle}>
              {t("chatsTab.newMatchEmptyTitle")}
            </Text>
            <Text style={styles.emptySub}>
              {t("chatsTab.newMatchEmptySub")}
            </Text>
          </View>
        ) : null}

        {showConversationRows
          ? recentData.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.sep} /> : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => router.push(`/chat/${item.id}` as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={t("chatsTab.openChatA11y", {
                    name: item.name,
                  })}
                >
                  <View style={styles.avatarWrap}>
                    <Image
                      source={{ uri: photoUri(item.photoSeed, 128, 128) }}
                      style={styles.avatar}
                    />
                    {item.online ? <View style={styles.onlineDot} /> : null}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowPreview} numberOfLines={1}>
                      {item.previewText ??
                        (item.previewKey ? t(item.previewKey) : "")}
                    </Text>
                  </View>
                  {item.unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {item.unread > 9 ? "9+" : String(item.unread)}
                      </Text>
                    </View>
                  ) : (
                    <CaretRightIcon
                      size={14}
                      color="rgba(255,255,255,0.28)"
                      style={styles.rowChevron}
                      weight="bold"
                    />
                  )}
                </Pressable>
              </View>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAD,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
    paddingBottom: 18,
    gap: 12,
  },
  topBarText: {
    flex: 1,
    minWidth: 0,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    paddingRight: 4,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPressed: {
    opacity: 0.75,
  },
  pillWrap: {
    marginBottom: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PILL_BG,
    borderRadius: 12,
    padding: 3,
  },
  tabDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  pillSeg: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSegActive: {
    backgroundColor: "rgba(10,132,255,0.22)",
  },
  pillSegIdle: {
    backgroundColor: "transparent",
  },
  pillText: {
    fontSize: 15,
    fontWeight: "700",
  },
  pillTextActive: {
    color: "#fff",
  },
  pillTextIdle: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.35,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    color: MUTED,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  signInBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "rgba(10,132,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(10,132,255,0.45)",
  },
  signInBtnPressed: {
    opacity: 0.88,
  },
  signInBtnText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: "700",
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ROW_LINE,
    marginLeft: 80,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 2,
  },
  rowPressed: {
    opacity: 0.88,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2C2C2E",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ONLINE,
    borderWidth: 2,
    borderColor: BG,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  rowPreview: {
    color: MUTED,
    fontSize: 14,
    marginTop: 3,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  rowChevron: {
    marginLeft: 4,
    width: 20,
    textAlign: "center",
  },
});
