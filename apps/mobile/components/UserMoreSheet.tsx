import { UserMinus, Warning } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Folha inferior com ações de moderação: bloquear + denunciar (chat e perfil). */
export function UserMoreSheet({
  visible,
  onClose,
  onBlock,
  onReport,
}: {
  visible: boolean;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 20 : 8);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.sheetDismissA11y")}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={[styles.panel, { paddingBottom: bottomPad }]}>
          <View style={styles.handle} accessibilityRole="none" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.sheetBlockA11y")}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              onBlock();
            }}
          >
            <UserMinus
              size={20}
              color="#fff"
              style={styles.rowIcon}
              weight="regular"
            />
            <Text style={styles.rowLabel}>{t("chat.sheetBlock")}</Text>
          </Pressable>
          <View style={styles.sep} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.sheetReportA11y")}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              onReport();
            }}
          >
            <Warning
              size={20}
              color="#fff"
              style={styles.rowIcon}
              weight="fill"
            />
            <Text style={styles.rowLabel}>{t("chat.sheetReport")}</Text>
          </Pressable>
          <View style={styles.sep} />
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={onClose}
          >
            <View style={styles.rowIconSpacer} />
            <Text style={styles.rowLabel}>{t("chat.sheetCancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  panel: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 6,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#48484A",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowPressed: { opacity: 0.75 },
  rowIcon: { width: 28, textAlign: "center", marginRight: 14 },
  rowIconSpacer: { width: 28, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 17, color: "#fff", fontWeight: "400" },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
