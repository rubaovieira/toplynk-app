import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { SetupStepHeader } from "@/components/SetupStepHeader";
import { getApiBaseUrl } from "@/lib/api-config";
import { getSetupUserId } from "@/lib/setup-user-session";
import { patchUserProfile } from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";
import {
  SETUP_INTEREST_IDS,
  type SetupInterestId,
} from "@/lib/setup-interests";

const BG = "#121212";
const INPUT_BG = "#1E1E1E";
const ACCENT = "#2196F3";
const PLACEHOLDER = "#8A8A8A";
const CHIP_BG = "#1E1E1E";

export default function SetupStep3Screen() {
  const { t } = useTranslation();
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<Set<SetupInterestId>>(
    () => new Set(),
  );
  const [busy, setBusy] = useState(false);

  const interestLabels = useMemo(
    () =>
      SETUP_INTEREST_IDS.reduce(
        (acc, id) => {
          acc[id] = t(`setup.step3.interest.${id}`);
          return acc;
        },
        {} as Record<SetupInterestId, string>,
      ),
    [t],
  );

  const toggleInterest = useCallback((id: SetupInterestId) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onBack = useCallback(() => {
    router.back();
  }, []);

  const onContinue = useCallback(async () => {
    if (!bio.trim()) {
      showValidationToast(t("setup.step3.errorRequired"));
      return;
    }
    if (interests.size === 0) {
      showValidationToast(t("setup.step3.errorInterest"));
      return;
    }

    const base = getApiBaseUrl();
    const uid = await getSetupUserId();
    if (base && uid) {
      setBusy(true);
      try {
        await patchUserProfile(base, uid, {
          bio: bio.trim(),
          interestIds: [...interests],
        });
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

    router.push("/setup/step4");
  }, [bio, interests, t]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <SetupStepHeader currentStep={3} onBack={onBack} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t("setup.step3.title")}</Text>
            <Text style={styles.body}>{t("setup.step3.description1")}</Text>
            <Text style={[styles.body, styles.bodySpaced]}>
              {t("setup.step3.description2")}
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder={t("setup.step3.bioPlaceholder")}
              placeholderTextColor={PLACEHOLDER}
              multiline
              textAlignVertical="top"
              value={bio}
              onChangeText={setBio}
            />

            <Text style={styles.interestsLabel}>
              {t("setup.step3.interestsLabel")}
            </Text>
            <Text style={styles.interestsHint}>
              {t("setup.step3.interestsHint")}
            </Text>
            <View style={styles.chipRow}>
              {SETUP_INTEREST_IDS.map((id) => {
                const selected = interests.has(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => toggleInterest(id)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {interestLabels[id]}
                    </Text>
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
        </KeyboardAvoidingView>
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
    marginBottom: 14,
    textAlign: "left",
  },
  body: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "left",
  },
  bodySpaced: {
    marginTop: 12,
    marginBottom: 22,
  },
  textArea: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    minHeight: 140,
    textAlign: "left",
  },
  interestsLabel: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 6,
    textAlign: "left",
  },
  interestsHint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    textAlign: "left",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: CHIP_BG,
    borderWidth: 2,
    borderColor: "transparent",
  },
  chipSelected: {
    borderColor: ACCENT,
    backgroundColor: CHIP_BG,
  },
  chipText: {
    color: PLACEHOLDER,
    fontSize: 15,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: ACCENT,
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
