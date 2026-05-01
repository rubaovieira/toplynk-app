import { useFocusEffect } from "@react-navigation/native";
import { type Href, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { NotificationCard } from "@/components/NotificationCard";
import { getAccessToken } from "@/lib/auth-storage";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  fetchNotifications,
  type AppNotificationItem,
} from "@/lib/notifications-api";

const BG = "#121212";
const ACCENT = "#0A84FF";
const MUTED = "#8E8E93";
const PAD = 16;

type DemoKey = "connection" | "message" | "digest";

const DEMO_ROWS: {
  id: string;
  demoKey: DemoKey;
  href?: Href;
  hintKey?: string;
}[] = [
  {
    id: "1",
    demoKey: "connection",
    href: "/(tabs)/matches",
    hintKey: "notifications.openMatchesHint",
  },
  {
    id: "2",
    demoKey: "message",
    href: "/(tabs)/conversas",
    hintKey: "notifications.openChatsHint",
  },
  { id: "3", demoKey: "digest" },
];

function formatNotificationTime(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(locale, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12) + 24;

  const [apiItems, setApiItems] = useState<AppNotificationItem[]>([]);
  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const base = getApiBaseUrl();
    const token = await getAccessToken();
    if (!base || !token) {
      setUseApi(false);
      setApiItems([]);
      setLoading(false);
      return;
    }
    setUseApi(true);
    setLoading(true);
    try {
      const items = await fetchNotifications({ baseUrl: base, limit: 40 });
      setApiItems(items);
    } catch {
      setApiItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onApiItemPress = useCallback(
    (item: AppNotificationItem) => {
      const peerId =
        item.data && typeof item.data.peerId === "string"
          ? item.data.peerId
          : null;
      if (peerId) {
        router.push({
          pathname: "/user-profile",
          params: { id: peerId },
        } as Href);
        return;
      }
      router.push("/(tabs)/matches" as Href);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("notifications.backA11y")}
        >
          <CaretLeftIcon size={20} color={ACCENT} weight="bold" />
        </Pressable>
        <Text style={styles.topTitle}>{t("notifications.title")}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <Text style={styles.subtitle}>
        {useApi ? t("notifications.subtitleLive") : t("notifications.subtitle")}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {useApi && loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={ACCENT} />
          </View>
        ) : null}

        {useApi && !loading && apiItems.length > 0
          ? apiItems.map((item) => (
              <NotificationCard
                key={item.id}
                title={item.title}
                body={item.body}
                time={formatNotificationTime(
                  item.createdAt,
                  i18n.language ?? "pt",
                )}
                onPress={() => onApiItemPress(item)}
                accessibilityHint={t("notifications.openMatchesHint")}
              />
            ))
          : null}

        {useApi && !loading && apiItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t("notifications.emptyTitle")}</Text>
            <Text style={styles.emptySub}>{t("notifications.emptySub")}</Text>
          </View>
        ) : null}

        {!useApi ? (
          <>
            <Text style={styles.examplesLabel}>
              {t("notifications.examplesHeading")}
            </Text>
            {DEMO_ROWS.map((row) => {
              const prefix = `notifications.demo.${row.demoKey}` as const;
              return (
                <NotificationCard
                  key={row.id}
                  title={t(`${prefix}.title`)}
                  body={t(`${prefix}.body`)}
                  time={t(`${prefix}.time`)}
                  onPress={
                    row.href ? () => router.push(row.href as Href) : undefined
                  }
                  accessibilityHint={
                    row.hintKey ? t(row.hintKey) : undefined
                  }
                />
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PAD,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  topBarSpacer: {
    width: 20,
  },
  subtitle: {
    paddingHorizontal: PAD,
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: PAD,
    paddingTop: 10,
  },
  centered: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyWrap: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: MUTED,
    lineHeight: 22,
  },
  examplesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
