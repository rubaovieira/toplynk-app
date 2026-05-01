import { useRouter } from "expo-router";
import {
  CaretLeftIcon,
  FunnelSimple,
  MagnifyingGlass,
  XCircle,
} from "phosphor-react-native";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BG = "#121212";
const PAD = 14;
const FIELD_BG = "#2c2c2e";
const PLACEHOLDER = "#8e8e93";

export default function MatchesSearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("matchesSearch.backA11y")}
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <CaretLeftIcon size={22} color="#fff" weight="bold" />
          </Pressable>
          <View style={styles.searchField}>
            <MagnifyingGlass
              size={16}
              color={PLACEHOLDER}
              style={styles.searchFieldIcon}
              weight="bold"
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("matchesSearch.placeholder")}
              placeholderTextColor={PLACEHOLDER}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="never"
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("matchesSearch.clearA11y")}
                hitSlop={10}
                onPress={() => setQuery("")}
                style={styles.clearBtn}
              >
                <XCircle size={18} color={PLACEHOLDER} weight="regular" />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.emptyWrap}>
          <FunnelSimple size={56} color="#fff" weight="regular" />
          <Text style={styles.emptyTitle}>
            {t("matchesSearch.noResultsTitle")}
          </Text>
          <Text style={styles.emptySub}>{t("matchesSearch.noResultsSub")}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: PAD,
    paddingTop: 6,
    paddingBottom: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 2,
  },
  pressed: {
    opacity: 0.65,
  },
  searchField: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchFieldIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: "#fff",
  },
  clearBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  emptySub: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
    color: "#fff",
    textAlign: "center",
    opacity: 0.88,
    maxWidth: 340,
  },
});
