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
  SETUP_ACTIVITY_AREA_IDS,
  type SetupActivityAreaId,
} from "@/lib/setup-activity-areas";

const BG = "#121212";
const INPUT_BG = "#1E1E1E";
const ACCENT = "#2196F3";
const PLACEHOLDER = "#8A8A8A";
const CHIP_BG = "#1E1E1E";

type SectorId = SetupActivityAreaId;
const SECTOR_IDS = SETUP_ACTIVITY_AREA_IDS;

export default function SetupStep2Screen() {
  const { t } = useTranslation();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [sectors, setSectors] = useState<Set<SectorId>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const sectorLabels = useMemo(
    () =>
      SECTOR_IDS.reduce(
        (acc, id) => {
          acc[id] = t(`setup.step2.sector.${id}`);
          return acc;
        },
        {} as Record<SectorId, string>,
      ),
    [t],
  );

  const toggleSector = useCallback((id: SectorId) => {
    setSectors((prev) => {
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
    const r = role.trim();
    const c = company.trim();
    if (!r || !c) {
      showValidationToast(t("setup.step2.errorRequired"));
      return;
    }
    if (sectors.size === 0) {
      showValidationToast(t("setup.step2.errorSector"));
      return;
    }

    const base = getApiBaseUrl();
    const uid = await getSetupUserId();
    if (base && uid) {
      setBusy(true);
      try {
        await patchUserProfile(base, uid, {
          roleTitle: r,
          company: c,
          activityAreaIds: [...sectors],
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

    router.push("/setup/step3");
  }, [role, company, sectors, t]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <SetupStepHeader currentStep={2} onBack={onBack} />
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
            <Text style={styles.title}>{t("setup.step2.title")}</Text>
            <Text style={styles.subtitle}>{t("setup.step2.subtitle")}</Text>

            <TextInput
              style={[styles.input, styles.inputFirst]}
              placeholder={t("setup.step2.rolePlaceholder")}
              placeholderTextColor={PLACEHOLDER}
              value={role}
              onChangeText={setRole}
            />

            <TextInput
              style={styles.input}
              placeholder={t("setup.step2.companyPlaceholder")}
              placeholderTextColor={PLACEHOLDER}
              value={company}
              onChangeText={setCompany}
            />

            <Text style={styles.sectorHeading}>
              {t("setup.step2.sectorSectionTitle")}
            </Text>
            <Text style={styles.sectorHint}>{t("setup.step2.sectorHint")}</Text>
            <View style={styles.chipRow}>
              {SECTOR_IDS.map((id) => {
                const selected = sectors.has(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => toggleSector(id)}
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
                      {sectorLabels[id]}
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
    marginBottom: 12,
    textAlign: "left",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
    textAlign: "left",
  },
  inputFirst: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    textAlign: "left",
  },
  sectorHeading: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 6,
    textAlign: "left",
  },
  sectorHint: {
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
