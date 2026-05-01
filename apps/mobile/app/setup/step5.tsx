import * as ImagePicker from "expo-image-picker";
import { Camera, X } from "phosphor-react-native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
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
import { encodePhotoSlotsToBase64 } from "@/lib/encode-setup-photos";
import { getSetupUserId } from "@/lib/setup-user-session";
import { patchUserProfile } from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const ACCENT = "#2196F3";
const SLOT_EMPTY = "#16161a";
const SLOT_BORDER = "#2c2c36";
const REMOVE = "#EF4444";

const SLOT_COUNT = 4;

export default function SetupStep5Screen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: SLOT_COUNT }, () => null),
  );
  const filledCount = useMemo(() => slots.filter(Boolean).length, [slots]);
  const showGridHint = filledCount === 0;

  const onBack = useCallback(() => {
    router.back();
  }, []);

  const addPhoto = useCallback(async () => {
    if (slots.findIndex((s) => s == null) === -1) {
      showValidationToast(t("setup.step5.errorFull"));
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showValidationToast(t("setup.step5.errorPermission"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    const uri = result.assets[0].uri;
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s == null);
      if (idx === -1) {
        return prev;
      }
      const next = [...prev];
      next[idx] = uri;
      return next;
    });
  }, [slots, t]);

  const removeAt = useCallback((index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const onContinue = useCallback(async () => {
    if (!slots.some(Boolean)) {
      showValidationToast(t("setup.step5.errorAtLeastOne"));
      return;
    }

    const base = getApiBaseUrl();
    const uid = await getSetupUserId();
    if (base && uid) {
      setBusy(true);
      try {
        const photosBase64 = await encodePhotoSlotsToBase64(slots);
        await patchUserProfile(base, uid, { photosBase64 });
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

    router.push("/setup/step6");
  }, [slots, t]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <SetupStepHeader currentStep={5} onBack={onBack} />
        <View style={styles.flex}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t("setup.step5.title")}</Text>
            <Text style={styles.subtitle}>{t("setup.step5.subtitle")}</Text>

            <View style={styles.addRow}>
              <Pressable
                onPress={addPhoto}
                style={({ pressed }) => [
                  styles.addBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Camera size={18} color="#fff" weight="fill" />
                <Text style={styles.addBtnText}>
                  {t("setup.step5.addPhoto")}
                </Text>
              </Pressable>
            </View>

            <View style={styles.gridWrap}>
              <View style={styles.grid}>
                {[0, 1].map((row) => (
                  <View key={row} style={styles.gridRow}>
                    {[0, 1].map((col) => {
                      const index = row * 2 + col;
                      const uri = slots[index];
                      return (
                        <View key={index} style={styles.cell}>
                          <View style={styles.slot}>
                            {uri ? (
                              <>
                                <Image
                                  source={{ uri }}
                                  style={styles.slotImage}
                                  resizeMode="cover"
                                />
                                <Pressable
                                  onPress={() => removeAt(index)}
                                  style={styles.removeHit}
                                  hitSlop={8}
                                  accessibilityRole="button"
                                  accessibilityLabel={t(
                                    "setup.step5.removePhotoA11y",
                                  )}
                                >
                                  <View style={styles.removeCircle}>
                                    <X size={11} color="#fff" weight="bold" />
                                  </View>
                                </Pressable>
                              </>
                            ) : (
                              <View style={styles.slotEmpty} />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
              {showGridHint ? (
                <View style={styles.hintOverlay} pointerEvents="none">
                  <Text style={styles.gridHint}>
                    {t("setup.step5.gridHint")}
                  </Text>
                </View>
              ) : null}
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
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: "left",
  },
  addRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  gridWrap: {
    minHeight: 280,
    position: "relative",
  },
  grid: {
    flex: 1,
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    minHeight: 130,
  },
  cell: {
    flex: 1,
  },
  slot: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: SLOT_BORDER,
    minHeight: 130,
    position: "relative",
  },
  slotEmpty: {
    flex: 1,
    backgroundColor: SLOT_EMPTY,
    minHeight: 130,
  },
  slotImage: {
    ...StyleSheet.absoluteFillObject,
  },
  removeHit: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2,
  },
  removeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: REMOVE,
    alignItems: "center",
    justifyContent: "center",
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  gridHint: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
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
