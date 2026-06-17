import { Check, Prohibit } from "phosphor-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ReportReason } from "@/lib/moderation-api";

const REPORT_REASONS: { value: ReportReason; labelKey: string }[] = [
  { value: "spam", labelKey: "chat.reportReasonSpam" },
  { value: "harassment", labelKey: "chat.reportReasonHarassment" },
  { value: "fake", labelKey: "chat.reportReasonFake" },
  { value: "inappropriate", labelKey: "chat.reportReasonInappropriate" },
];

export function ReportUserModal({
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ReportReason>(REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!visible) {
      setSelected(REPORT_REASONS[0].value);
      setDetails("");
    }
  }, [visible]);

  const submit = useCallback(() => {
    if (submitting) return;
    onSubmit(selected, details);
  }, [submitting, onSubmit, selected, details]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kav}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View style={styles.wrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.reportDismissA11y")}
            style={[StyleSheet.absoluteFill, styles.dim]}
            onPress={onClose}
          />
          <View
            style={[styles.card, { paddingBottom: Math.max(20, insets.bottom) }]}
          >
            <Text style={styles.title}>{t("chat.reportTitle")}</Text>
            <Text style={styles.subtitle}>{t("chat.reportSubtitle")}</Text>

            <ScrollView
              style={styles.reasonList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {REPORT_REASONS.map(({ value, labelKey }) => {
                const on = selected === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setSelected(value)}
                    style={({ pressed }) => [
                      styles.reasonRow,
                      pressed && styles.reasonRowPressed,
                    ]}
                  >
                    <View
                      style={[styles.radioOuter, on && styles.radioOuterOn]}
                    >
                      {on ? <Check size={11} color="#fff" weight="bold" /> : null}
                    </View>
                    <Prohibit
                      size={18}
                      color={on ? "#E57373" : "rgba(231,115,115,0.45)"}
                      style={styles.reasonBan}
                      weight="regular"
                    />
                    <Text
                      style={[
                        styles.reasonLabel,
                        !on && styles.reasonLabelDim,
                      ]}
                    >
                      {t(labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t("chat.reportDetailsLabel")}</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder={t("chat.reportDetailsPlaceholder")}
              placeholderTextColor="#636366"
              style={styles.textArea}
              multiline
              maxLength={2000}
              editable={!submitting}
              textAlignVertical="top"
            />

            <View style={styles.actionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.btnGhost,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnGhostText}>{t("chat.reportCancel")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={submit}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  (pressed || submitting) && styles.btnPressed,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {t("chat.reportSend")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  dim: { backgroundColor: "rgba(0,0,0,0.58)" },
  card: {
    backgroundColor: "#121212",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    maxHeight: "88%",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#E57373", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#fff", marginBottom: 16, lineHeight: 21 },
  reasonList: { maxHeight: 220, marginBottom: 16 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 8,
  },
  reasonRowPressed: { opacity: 0.85 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#5C5C5E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioOuterOn: { backgroundColor: "#2196F3", borderColor: "#2196F3" },
  reasonBan: { marginRight: 10, width: 22, textAlign: "center" },
  reasonLabel: { flex: 1, fontSize: 16, color: "#fff" },
  reasonLabelDim: { color: "rgba(255,255,255,0.45)" },
  fieldLabel: { fontSize: 13, color: "#AEAEB2", marginBottom: 8 },
  textArea: {
    minHeight: 100,
    maxHeight: 140,
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
    marginBottom: 20,
  },
  actionsRow: { flexDirection: "row", gap: 12 },
  btnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { fontSize: 16, fontWeight: "600", color: "#0A84FF" },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  btnPressed: { opacity: 0.88 },
});
