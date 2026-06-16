import { type Href, useRouter } from "expo-router";
import { Bell, MapPin } from "phosphor-react-native";
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
import {
  DiscoveryNoLocationError,
  fetchDiscoveryNearby,
  postDiscoverySwipe,
  type DiscoverySwipeAction,
} from "@/lib/discovery-api";
import { enableLocationAndSave } from "@/lib/enable-location";
import { showValidationToast } from "@/lib/validation-toast";
import type { MatchProfile } from "@/lib/match-demo-deck";

const BG = "#121212";

/** Tab principal — deck de swipe (rota padrão `/(tabs)`). */
export default function DiscoverHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [loadingDeck, setLoadingDeck] = useState(false);
  /** Distingue "deck vazio" (API respondeu []) de "falha ao carregar" (rede/timeout) para mostrar retry. */
  const [loadError, setLoadError] = useState(false);
  /** Perfil sem localização: o /discovery/nearby exige geo (400). Mostra CTA para ativar em vez de erro. */
  const [needsLocation, setNeedsLocation] = useState(false);
  const [enablingLocation, setEnablingLocation] = useState(false);

  const loadDeck = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      // Sem URL de API configurada: não há o que carregar — mostra erro com retry em vez de spinner preso.
      setLoadError(true);
      return;
    }
    setLoadingDeck(true);
    setLoadError(false);
    setNeedsLocation(false);
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
      setLoadError(false);
    } catch (e) {
      setProfiles([]);
      if (e instanceof DiscoveryNoLocationError) {
        // Perfil sem geo: não é "erro de rede" — pede para ativar a localização.
        setNeedsLocation(true);
      } else {
        // Timeout/rede: nunca deixa a tela presa em spinner — oferece "tentar de novo".
        setLoadError(true);
      }
    } finally {
      setLoadingDeck(false);
    }
  }, [i18n.language]);

  const onEnableLocation = useCallback(async () => {
    setEnablingLocation(true);
    try {
      const r = await enableLocationAndSave();
      if (r === "saved") {
        setNeedsLocation(false);
        await loadDeck();
      } else if (r === "denied") {
        showValidationToast(t("discoverSwipe.locationDenied"));
      } else {
        showValidationToast(t("discoverSwipe.locationError"));
      }
    } finally {
      setEnablingLocation(false);
    }
  }, [loadDeck, t]);

  const onRecordSwipe = useCallback(
    async (peerId: string, kind: DiscoverySwipeAction) => {
      const base = getApiBaseUrl();
      if (!base) return;
      await postDiscoverySwipe({ baseUrl: base, peerId, action: kind });
    },
    [],
  );

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
        {needsLocation && profiles.length === 0 ? (
          <View style={styles.stateWrap}>
            <View style={styles.stateIconWrap}>
              <MapPin size={30} color="#2196F3" weight="fill" />
            </View>
            <Text style={styles.stateTitle}>
              {t("discoverSwipe.locationTitle")}
            </Text>
            <Text style={styles.stateSub}>
              {t("discoverSwipe.locationSub")}
            </Text>
            <Pressable
              onPress={() => void onEnableLocation()}
              disabled={enablingLocation}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryBtn,
                (pressed || enablingLocation) && styles.retryBtnPressed,
              ]}
            >
              {enablingLocation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.retryBtnText}>
                  {t("discoverSwipe.enableLocation")}
                </Text>
              )}
            </Pressable>
          </View>
        ) : loadError && profiles.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateTitle}>
              {t("discoverSwipe.loadErrorTitle")}
            </Text>
            <Text style={styles.stateSub}>{t("discoverSwipe.loadErrorSub")}</Text>
            <Pressable
              onPress={() => void loadDeck()}
              disabled={loadingDeck}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryBtn,
                (pressed || loadingDeck) && styles.retryBtnPressed,
              ]}
            >
              {loadingDeck ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.retryBtnText}>
                  {t("discoverSwipe.retry")}
                </Text>
              )}
            </Pressable>
          </View>
        ) : loadingDeck && profiles.length === 0 ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        ) : (
          <MatchSwipeDeck profiles={profiles} onRecordSwipe={onRecordSwipe} />
        )}
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
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 12,
  },
  stateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(33,150,243,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  stateSub: {
    color: "#8e8e93",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
  retryBtn: {
    marginTop: 8,
    minWidth: 160,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnPressed: { opacity: 0.85 },
  retryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
