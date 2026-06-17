import { Stack, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const BG = "#121212";

type EulaSection = { heading: string; body: string };

export default function EulaScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const sections = t("eula.sections", { returnObjects: true });
  const list: EulaSection[] = Array.isArray(sections)
    ? (sections as EulaSection[])
    : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("eula.backA11y")}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <CaretLeftIcon size={22} color="#fff" weight="bold" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t("eula.title")}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.updated}>{t("eula.updated")}</Text>
          <Text style={styles.intro}>{t("eula.intro")}</Text>

          {list.map((s, i) => (
            <View key={`eula-${i}`} style={styles.section}>
              <Text style={styles.heading}>{s.heading}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          ))}

          <Text style={styles.contact}>{t("eula.contact")}</Text>
        </ScrollView>
      </SafeAreaView>
    </>
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  updated: { color: "#8E8E93", fontSize: 13, marginBottom: 16 },
  intro: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 8,
  },
  section: { marginTop: 22 },
  heading: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  body: { color: "rgba(255,255,255,0.82)", fontSize: 15, lineHeight: 23 },
  contact: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 28,
  },
});
