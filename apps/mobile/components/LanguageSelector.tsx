import { CaretDownIcon, Check } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type AppLocale,
  localeFromI18nLanguage,
  LOCALE_FLAGS,
  setAppLocale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n";

const ACCENT = "#2196F3";
const BORDER = "#121212";
const INPUT_BG = "#1E1E1E";

type LanguageSelectorProps = {
  /** Menos margem horizontal (ex.: walkthrough no topo). */
  compact?: boolean;
};

export function LanguageSelector({ compact }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const current: AppLocale = useMemo(
    () => localeFromI18nLanguage(i18n.language),
    [i18n.language],
  );

  const onSelect = useCallback(
    async (lng: AppLocale) => {
      setOpen(false);
      if (lng === current) return;
      await setAppLocale(lng);
    },
    [current],
  );

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t("language.label")}
        accessibilityHint={t(`language.${current}`)}
      >
        <Text style={styles.triggerFlag}>{LOCALE_FLAGS[current]}</Text>
        <Text style={styles.triggerText}>{t(`language.${current}`)}</Text>
        <CaretDownIcon size={16} color="rgba(255,255,255,0.65)" weight="bold" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.dropdown,
              { marginBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            {SUPPORTED_LOCALES.map((code, index) => {
              const selected = code === current;
              return (
                <Pressable
                  key={code}
                  onPress={() => void onSelect(code)}
                  style={({ pressed }) => [
                    styles.option,
                    index > 0 && styles.optionBorder,
                    pressed && styles.optionPressed,
                    selected && styles.optionSelected,
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Text style={styles.optionFlag}>{LOCALE_FLAGS[code]}</Text>
                  <Text style={styles.optionLabel}>
                    {t(`language.${code}`)}
                  </Text>
                  {selected ? (
                    <Check
                      size={16}
                      color={ACCENT}
                      style={styles.check}
                      weight="bold"
                    />
                  ) : (
                    <View style={styles.checkPlaceholder} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 24,
    marginBottom: 8,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  wrapCompact: {
    marginHorizontal: 0,
    alignSelf: "stretch",
    maxWidth: "100%",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  triggerFlag: {
    fontSize: 22,
    lineHeight: 26,
  },
  triggerText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 0,
  },
  dropdown: {
    zIndex: 1,
    marginHorizontal: 16,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  optionPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optionSelected: {
    backgroundColor: "rgba(33, 150, 243, 0.12)",
  },
  optionFlag: {
    fontSize: 24,
    lineHeight: 28,
  },
  optionLabel: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  check: {
    marginLeft: 4,
  },
  checkPlaceholder: {
    width: 16,
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.9,
  },
});
