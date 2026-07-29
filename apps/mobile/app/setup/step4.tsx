import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { SetupStepHeader } from "@/components/SetupStepHeader";
import { getApiBaseUrl } from "@/lib/api-config";
import { getSetupUserId } from "@/lib/setup-user-session";
import { patchUserProfile } from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const ACCENT = "#2196F3";
const PILL_BORDER = "rgba(255,255,255,0.22)";

/** Enviado como `primaryGoal` (string livre) e usado no embedding de matching. */
const GOAL_IDS = [
  "partnerships",
  "knowledge_sharing",
  "networking",
  "learn_from_experts",
] as const;
type GoalId = (typeof GOAL_IDS)[number];

export default function SetupStep4Screen() {
  const { t } = useTranslation();
  const [goal, setGoal] = useState<GoalId>("partnerships");
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () =>
      GOAL_IDS.map((id) => ({
        id,
        name: t(`setup.step4.goals.${id}`),
      })),
    [t],
  );

  const onBack = useCallback(() => {
    router.back();
  }, []);

  const onContinue = useCallback(async () => {
    const base = getApiBaseUrl();
    const uid = await getSetupUserId();
    if (base && uid) {
      setBusy(true);
      try {
        await patchUserProfile(base, uid, { primaryGoal: goal });
      } catch (e) {
        const msg =
          e instanceof Error && e.message.trim()
            ? e.message
            : t("setup.step1.errorApi");
        showValidationToast(msg);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    router.push("/setup/step5");
  }, [goal, t]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <SetupStepHeader currentStep={4} onBack={onBack} />
        <View style={styles.flex}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t("setup.step4.title")}</Text>

            <View style={styles.list}>
              {items.map((item, index) => {
                const selected = goal === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setGoal(item.id)}
                    style={({ pressed }) => [
                      styles.pill,
                      index > 0 && styles.pillSpaced,
                      selected && styles.pillSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selected && styles.pillTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <Pressable
              onPress={() => void onContinue()}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || busy) && styles.pressed,
                busy && styles.primaryBtnDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t("setup.continue")}</Text>
              )}
            </Pressable>
          </View>
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
  flex: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    marginBottom: 28,
    textAlign: "center",
  },
  list: {
    paddingTop: 4,
  },
  /** Pill de escolha única: sem descrição e sem radio — o próprio preenchimento indica a seleção. */
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  pillSpaced: {
    marginTop: 12,
  },
  pillSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  pillText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  pillTextSelected: {
    fontWeight: "700",
  },
  footerRow: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnDisabled: {
    opacity: 0.88,
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
