import { LinearGradient } from "expo-linear-gradient";
import {
  MagnifyingGlass,
  MapPin,
  NavigationArrow,
  UsersThree,
} from "phosphor-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { getApiBaseUrl } from "@/lib/api-config";
import { localeFromI18nLanguage } from "@/lib/i18n";
import { setDiscoveryCache } from "@/lib/discovery-cache";
import { fetchDiscoverySwiped } from "@/lib/discovery-api";
import type { MatchProfile } from "@/lib/match-demo-deck";
import { photoUri } from "@/lib/match-demo-deck";

const BG = "#121212";
const ACCENT = "#0A84FF";
const MUTED = "#8E8E93";
const PAD = 16;
const GAP = 12;
const CARD_RADIUS = 16;

const CHIP_KEYS = [
  "chipAll",
  "chipInterests",
  "chipDistance",
  "chipRecent",
] as const;

const CITIES_PT = [
  "São Paulo, SP",
  "Curitiba, PR",
  "Lisboa, PT",
  "Porto Alegre, RS",
  "Belo Horizonte, MG",
];
const CITIES_EN = [
  "Los Angeles, CA",
  "Austin, TX",
  "London, UK",
  "Chicago, IL",
  "Seattle, WA",
];
const CITIES_ES = [
  "Madrid",
  "Ciudad de México",
  "Barcelona",
  "Bogotá",
  "Buenos Aires",
];

type GridRow = MatchProfile & { city: string };

function formatKm(km: number): string {
  const n = Math.round(km * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function orderProfilesForChips(
  list: MatchProfile[],
  mainTab: "matches" | "forYou",
  chipIndex: number,
): MatchProfile[] {
  let base =
    mainTab === "forYou"
      ? [...list].sort((a, b) => b.compatibility - a.compatibility)
      : [...list];
  switch (chipIndex) {
    case 1:
      base.sort((a, b) => b.compatibility - a.compatibility);
      break;
    case 2:
      base.sort((a, b) => a.distanceKm - b.distanceKm);
      break;
    case 3:
      base.reverse();
      break;
    default:
      break;
  }
  return base;
}

export default function MatchesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mainTab, setMainTab] = useState<"matches" | "forYou">("matches");
  const [chipIndex, setChipIndex] = useState(0);
  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const screenW = Dimensions.get("window").width;

  const colW = useMemo(() => {
    return (screenW - PAD * 2 - GAP) / 2;
  }, [screenW]);

  const cardImageH = Math.round(colW * 1.28);

  const loadGrid = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setProfiles([]);
      setDiscoveryCache([]);
      return;
    }
    setLoading(true);
    try {
      const lang = localeFromI18nLanguage(i18n.language);
      const list = await fetchDiscoverySwiped({
        baseUrl: base,
        limit: 30,
        languageKey: lang,
      });
      setDiscoveryCache(list);
      setProfiles(list);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    void loadGrid();
  }, [loadGrid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGrid();
    } finally {
      setRefreshing(false);
    }
  }, [loadGrid]);

  const gridData: GridRow[] = useMemo(() => {
    const loc = localeFromI18nLanguage(i18n.language);
    const cities =
      loc === "en" ? CITIES_EN : loc === "es" ? CITIES_ES : CITIES_PT;
    const ordered = orderProfilesForChips(profiles, mainTab, chipIndex);
    return ordered.map((p, i) => ({
      ...p,
      city:
        (typeof p.cityLabel === "string" && p.cityLabel.trim()
          ? p.cityLabel.trim()
          : null) ?? cities[i % cities.length],
    }));
  }, [mainTab, chipIndex, i18n.language, profiles]);

  const listBottomPad = Math.max(insets.bottom, 12) + 20;

  const renderCard = ({ item }: { item: GridRow }) => {
    const seed = item.photoSeeds[0] ?? "match";
    const footerH = Math.max(88, Math.round(cardImageH * 0.36));
    return (
      <Pressable
        style={[styles.cardCell, { width: colW }]}
        onPress={() =>
          router.push({
            pathname: "/user-profile",
            params: { id: item.id, city: encodeURIComponent(item.city) },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={t("matchesTab.nameScore", {
          name: item.name,
          n: item.compatibility,
        })}
      >
        <View style={[styles.card, { borderRadius: CARD_RADIUS }]}>
          <Image
            source={{ uri: photoUri(seed, 480, 640) }}
            style={[
              styles.cardImage,
              { height: cardImageH, borderRadius: CARD_RADIUS },
            ]}
            resizeMode="cover"
          />
          <View style={styles.kmBadge}>
            <NavigationArrow
              size={10}
              color="rgba(255,255,255,0.9)"
              style={styles.kmBadgeIcon}
              weight="fill"
            />
            <Text style={styles.kmBadgeText}>
              {t("matchesTab.km", { n: formatKm(item.distanceKm) })}
            </Text>
          </View>
          <View style={[styles.cardFooterWrap, { height: footerH }]}>
            <LinearGradient
              colors={[
                "transparent",
                "rgba(0,0,0,0.35)",
                "rgba(0,0,0,0.88)",
                "#121212",
              ]}
              locations={[0, 0.35, 0.78, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.cardFooterTexts}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardHeadline} numberOfLines={1}>
                {item.headline}
              </Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardScore} numberOfLines={1}>
                  {t("matchesTab.matchPercent", { n: item.compatibility })}
                </Text>
                <View style={styles.cardMetaDot} />
                <MapPin
                  size={11}
                  color="rgba(255,255,255,0.55)"
                  style={styles.cardCityIcon}
                  weight="fill"
                />
                <Text style={styles.cardCity} numberOfLines={1}>
                  {item.city}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.screenTitle}>{t("matchesTab.title")}</Text>
          <Text style={styles.screenSubtitle} numberOfLines={2}>
            {t("matchesTab.subtitle")}
          </Text>
        </View>
        <View style={styles.topBarActions}>
          {loading && !refreshing ? (
            <ActivityIndicator
              size="small"
              color={ACCENT}
              style={styles.headerSpinner}
            />
          ) : null}
          <Pressable
            hitSlop={10}
            onPress={() => router.push("/matches-search")}
            accessibilityRole="button"
            accessibilityLabel={t("matchesTab.searchA11y")}
            style={({ pressed }) => [
              styles.searchBtn,
              pressed && styles.searchBtnPressed,
            ]}
          >
            <MagnifyingGlass size={18} color="#F2F2F7" weight="bold" />
          </Pressable>
        </View>
      </View>

      <View style={styles.mainTabs}>
        <Pressable
          onPress={() => setMainTab("matches")}
          style={[
            styles.mainTab,
            mainTab === "matches" ? styles.mainTabActive : styles.mainTabIdle,
          ]}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab !== "matches" && styles.mainTabTextIdle,
            ]}
            numberOfLines={1}
          >
            {t("matchesTab.tabMatches")}
          </Text>
        </Pressable>
        <View style={styles.tabDivider} />
        <Pressable
          onPress={() => setMainTab("forYou")}
          style={[
            styles.mainTab,
            mainTab === "forYou" ? styles.mainTabActive : styles.mainTabIdle,
          ]}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab !== "forYou" && styles.mainTabTextIdle,
            ]}
            numberOfLines={1}
          >
            {t("matchesTab.tabForYou")}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {CHIP_KEYS.map((key, i) => {
          const active = i === chipIndex;
          return (
            <Pressable
              key={key}
              onPress={() => setChipIndex(i)}
              style={[
                styles.chip,
                active ? styles.chipActive : styles.chipIdle,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  active ? styles.chipTextActive : styles.chipTextIdle,
                ]}
              >
                {t(`matchesTab.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <UsersThree size={28} color={MUTED} weight="regular" />
            </View>
            <Text style={styles.emptyTitle}>
              {t("matchesTab.emptyHistoryTitle")}
            </Text>
            <Text style={styles.emptySub}>{t("matchesTab.emptyHistorySub")}</Text>
          </View>
        }
        columnWrapperStyle={gridData.length ? styles.gridRow : undefined}
        contentContainerStyle={[
          styles.listContent,
          gridData.length === 0 && styles.listContentEmpty,
          gridData.length > 0 && { paddingBottom: listBottomPad + 16 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={ACCENT}
          />
        }
        renderItem={renderCard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingBottom: 8,
  },
  listHeader: {
    width: "100%",
    alignSelf: "stretch",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
    paddingBottom: 18,
    gap: 12,
  },
  topBarText: {
    flex: 1,
    minWidth: 0,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    paddingRight: 4,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnPressed: {
    opacity: 0.75,
  },
  headerSpinner: {
    marginRight: 2,
  },
  mainTabs: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "stretch",
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 3,
  },
  tabDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  mainTab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTabActive: {
    backgroundColor: "rgba(10,132,255,0.22)",
  },
  mainTabIdle: {
    backgroundColor: "transparent",
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  mainTabTextIdle: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },
  chipsScroll: {
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: "rgba(10,132,255,0.28)",
    borderColor: ACCENT,
  },
  chipIdle: {
    backgroundColor: "rgba(44,44,46,0.9)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  chipTextActive: {
    color: "#fff",
  },
  chipTextIdle: {
    color: "rgba(255,255,255,0.72)",
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: GAP,
  },
  cardCell: {},
  card: {
    overflow: "hidden",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardImage: {
    width: "100%",
    backgroundColor: "#1c1c1c",
  },
  kmBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  kmBadgeIcon: {
    marginRight: 5,
  },
  kmBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardFooterWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  cardFooterTexts: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 11,
    paddingBottom: 11,
    paddingTop: 6,
  },
  cardName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cardHeadline: {
    marginTop: 3,
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "600",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    minWidth: 0,
  },
  cardScore: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 0,
  },
  cardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
    flexShrink: 0,
  },
  cardCityIcon: {
    marginRight: 3,
    flexShrink: 0,
  },
  cardCity: {
    flex: 1,
    minWidth: 0,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyWrap: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySub: {
    color: MUTED,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
});
