import { router } from "expo-router";
import { SparkleIcon } from "phosphor-react-native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const BG = "#121212";
const ACCENT = "#2196F3";
const ICON_BG = "#2A2A2A";
const BODY_COLOR = "rgba(255,255,255,0.65)";

/**
 * Introdução da entrevista IA, exibida uma vez ao fim do setup (step6 → aqui → /entrevista-ia).
 * Distinta de `interview-gate`, que é a retomada de quem deixou a entrevista incompleta.
 */
export default function InterviewIntroScreen() {
  const { t } = useTranslation();

  const onContinue = useCallback(() => {
    router.replace("/entrevista-voz");
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Text style={styles.header}>{t("interviewIntro.header")}</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <SparkleIcon size={30} color={ACCENT} weight="fill" />
          </View>

          <Text style={styles.lead}>{t("interviewIntro.lead")}</Text>
          <Text style={styles.body}>{t("interviewIntro.format")}</Text>
          <Text style={styles.body}>{t("interviewIntro.cta")}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>{t("setup.continue")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  lead: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: 20,
  },
  body: {
    color: BODY_COLOR,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});
