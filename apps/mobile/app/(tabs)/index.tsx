import { type Href, useRouter } from "expo-router";
import { Bell } from "phosphor-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MatchSwipeDeck } from "@/components/MatchSwipeDeck";
import { getApiBaseUrl } from "@/lib/api-config";
import { localeFromI18nLanguage } from "@/lib/i18n";
import { setDiscoveryCache } from "@/lib/discovery-cache";
import { fetchDiscoveryNearby } from "@/lib/discovery-api";
import type { MatchProfile } from "@/lib/match-demo-deck";

const BG = "#121212";

/** Tab principal — deck de swipe (rota padrão `/(tabs)`). */
export default function DiscoverHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [loadingDeck, setLoadingDeck] = useState(false);

  const loadDeck = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) return;
    setLoadingDeck(true);
    try {
      const lang = localeFromI18nLanguage(i18n.language);
      const list = await fetchDiscoveryNearby({
        baseUrl: base,
        radiusKm: 100,
        limit: 30,
        minInterestOverlap: 0,
        languageKey: lang,
      });
      // Sempre aplica o resultado da API: [] = ecrã vazio (antes mantinha demo e parecia dados reais).
      setDiscoveryCache(list);
      setProfiles(list);
    } catch {
      setProfiles([]);
    } finally {
      setLoadingDeck(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>{t("discoverSwipe.brand")}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            onPress={() => router.push("/notifications" as Href)}
            accessibilityRole="button"
            accessibilityLabel={t("discoverSwipe.openNotificationsA11y")}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.iconBtnPressed,
            ]}
          >
            <Bell size={21} color="#f2f2f7" weight="regular" />
          </Pressable>
          {loadingDeck ? (
            <ActivityIndicator
              size="small"
              color="#2196F3"
              style={styles.headerSpinner}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <MatchSwipeDeck profiles={profiles} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  brandRow: {
    justifyContent: "center",
  },
  brand: {
    color: "#f5f5f7",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  body: {
    flex: 1,
    paddingHorizontal: 2,
  },
  headerSpinner: { marginLeft: 4 },
});
