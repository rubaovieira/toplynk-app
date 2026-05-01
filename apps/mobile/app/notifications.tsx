import { type Href, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { NotificationCard } from "@/components/NotificationCard";

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

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12) + 24;

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

      <Text style={styles.subtitle}>{t("notifications.subtitle")}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              accessibilityHint={row.hintKey ? t(row.hintKey) : undefined}
            />
          );
        })}
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
});
