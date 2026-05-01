import { router } from "expo-router";
import { Check } from "phosphor-react-native";
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
const CARD_BG = "#1E1E1E";
const ACCENT = "#2196F3";
const DESC_COLOR = "rgba(255,255,255,0.65)";

const GOAL_IDS = [
  "networking",
  "partnerships",
  "hiring",
  "opportunities",
] as const;
type GoalId = (typeof GOAL_IDS)[number];

export default function SetupStep4Screen() {
  const { t } = useTranslation();
  const [goal, setGoal] = useState<GoalId>("networking");
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () =>
      GOAL_IDS.map((id) => ({
        id,
        name: t(`setup.step4.goals.${id}.name`),
        description: t(`setup.step4.goals.${id}.description`),
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
            <Text style={styles.subtitle}>{t("setup.step4.subtitle")}</Text>

            <View style={styles.list}>
              {items.map((item, index) => {
                const selected = goal === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setGoal(item.id)}
                    style={({ pressed }) => [
                      styles.card,
                      index > 0 && styles.cardSpaced,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardDesc}>{item.description}</Text>
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        selected && styles.radioOuterSelected,
                      ]}
                    >
                      {selected ? (
                        <Check size={12} color="#fff" weight="bold" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.ghostBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.ghostBtnText}>{t("setup.back")}</Text>
            </Pressable>
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
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "left",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 22,
    textAlign: "left",
  },
  list: {
    paddingTop: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  cardSpaced: {
    marginTop: 12,
  },
  cardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDesc: {
    color: DESC_COLOR,
    fontSize: 14,
    lineHeight: 20,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  radioOuterSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  ghostBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: ACCENT,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: {
    color: ACCENT,
    fontSize: 17,
    fontWeight: "700",
  },
  primaryBtn: {
    flex: 1,
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
