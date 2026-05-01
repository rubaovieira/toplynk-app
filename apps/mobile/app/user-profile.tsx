import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  ChatCircle,
  CheckCircle,
  MapPin,
} from "phosphor-react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { getApiBaseUrl } from "@/lib/api-config";
import { localeFromI18nLanguage } from "@/lib/i18n";
import { getDiscoveryCachedProfile } from "@/lib/discovery-cache";
import type { MatchProfile } from "@/lib/match-demo-deck";
import { photoUri } from "@/lib/match-demo-deck";
import {
  fetchUserPublicProfile,
  publicProfileToMatchProfile,
} from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const PAD = 16;
const ACCENT = "#0A84FF";
const AVATAR = 104;

function normParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function UserProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    city?: string;
    preview?: string;
  }>();

  const id = normParam(params.id);
  const cityParam = normParam(params.city);
  const previewAsOthers = normParam(params.preview) === "1";
  const city = cityParam ? decodeURIComponent(cityParam) : undefined;

  const [profile, setProfile] = useState<MatchProfile | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(() => Boolean(id));

  useEffect(() => {
    if (!id) {
      setProfile(undefined);
      setLoading(false);
      return;
    }
    const base = getApiBaseUrl();
    const lang = localeFromI18nLanguage(i18n.language);
    if (!base) {
      setProfile(getDiscoveryCachedProfile(id) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setProfile(undefined);
    void fetchUserPublicProfile(base, id)
      .then((raw) => {
        if (!cancelled) setProfile(publicProfileToMatchProfile(raw, lang));
      })
      .catch(() => {
        if (!cancelled) setProfile(getDiscoveryCachedProfile(id) ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, i18n.language]);

  const locationLine = useMemo(() => {
    if (city) return city;
    if (!profile) return "";
    const label = profile.cityLabel?.trim();
    if (label) return label;
    return t("userProfile.locationNotSet");
  }, [city, profile, t]);

  const areaLabels = useMemo(() => {
    if (!profile) return [];
    const ids = profile.activityAreaIds?.filter(Boolean);
    if (ids?.length) {
      return ids.map((id) => {
        const k = `setup.step2.sector.${id}`;
        const label = t(k);
        return label === k ? id : label;
      });
    }
    return [];
  }, [profile, t]);

  const interestSectionLabels = useMemo(() => {
    if (!profile) return [];
    const ids = profile.interestIds?.filter(Boolean);
    if (ids?.length) {
      return ids.map((id) => {
        const k = `setup.step3.interest.${id}`;
        const label = t(k);
        return label === k ? id : label;
      });
    }
    return [];
  }, [profile, t]);

  const aboutBody = useMemo(() => {
    if (!profile) return "";
    const bio = profile.bio?.trim();
    if (bio) return bio;
    const tag = profile.tagline?.trim() || "";
    if (tag) return tag;
    return t("userProfile.aboutPlaceholder");
  }, [profile, t]);

  if (!id) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar style="light" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>{t("userProfile.notFound")}</Text>
          <Pressable onPress={() => router.back()} style={styles.missingBtn}>
            <Text style={styles.missingBtnText}>{t("userProfile.back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || profile === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar style="light" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar style="light" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>{t("userProfile.notFound")}</Text>
          <Pressable onPress={() => router.back()} style={styles.missingBtn}>
            <Text style={styles.missingBtnText}>{t("userProfile.back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const mainPhoto = profile.photoSeeds[0] ?? "profile";

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("userProfile.backA11y")}
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerIcon,
              pressed && styles.pressed,
            ]}
          >
            <CaretLeftIcon size={22} color="#fff" weight="bold" />
          </Pressable>
          <Text style={styles.headerTitle}>{t("userProfile.title")}</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: (previewAsOthers ? 28 : 100) + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: photoUri(mainPhoto, 400, 400) }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            <CheckCircle size={20} color={ACCENT} weight="fill" />
          </View>
          <Text style={styles.headline}>{profile.headline}</Text>
          <View style={styles.locRow}>
            <MapPin size={15} color="#ccc" weight="fill" />
            <Text style={styles.locText}>{locationLine}</Text>
          </View>

          <View style={styles.pillRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                pressed && styles.pillPressed,
              ]}
              onPress={() => showValidationToast(t("userProfile.networkSoon"))}
            >
              <Text style={styles.pillText}>{t("userProfile.network")}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                pressed && styles.pillPressed,
              ]}
              onPress={() =>
                showValidationToast(t("userProfile.proposalsSoon"))
              }
            >
              <Text style={styles.pillText}>{t("userProfile.proposals")}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>{t("userProfile.aboutTitle")}</Text>
          <Text style={styles.aboutBody}>{aboutBody}</Text>

          <Text style={styles.sectionTitle}>
            {t("userProfile.photosTitle")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {profile.photoSeeds.map((seed, i) => (
              <Image
                key={`${profile.id}-p-${i}`}
                source={{ uri: photoUri(seed, 320, 400) }}
                style={styles.thumb}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>{t("userProfile.areasTitle")}</Text>
          {areaLabels.length > 0 ? (
            <View style={styles.chipWrap}>
              {areaLabels.map((label, i) => (
                <View key={`area-${i}-${label}`} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptySection}>
              {t("userProfile.sectionEmpty")}
            </Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {t("userProfile.interestsTitle")}
          </Text>
          {interestSectionLabels.length > 0 ? (
            <View style={styles.chipWrap}>
              {interestSectionLabels.map((label, i) => (
                <View key={`int-${i}-${label}`} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptySection}>
              {t("userProfile.sectionEmpty")}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>

      {!previewAsOthers ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.messageBtn,
              pressed && styles.messageBtnPressed,
            ]}
            onPress={() => router.push(`/chat/${profile.id}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={t("userProfile.message")}
          >
            <ChatCircle size={18} color={ACCENT} weight="fill" />
            <Text style={styles.messageBtnText}>
              {t("userProfile.message")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAD - 4,
    paddingVertical: 6,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.65,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingTop: 8,
  },
  avatarWrap: {
    alignSelf: "center",
    marginBottom: 14,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: "#1c1c1c",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  name: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  headline: {
    marginTop: 6,
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
    textAlign: "center",
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  locText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  pillRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 22,
    marginBottom: 28,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#f2f2f7",
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillText: {
    color: "#1c1c1e",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
    letterSpacing: -0.2,
  },
  aboutBody: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 24,
  },
  emptySection: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  photoStrip: {
    gap: 10,
    paddingBottom: 8,
    marginBottom: 18,
  },
  thumb: {
    width: 120,
    height: 160,
    borderRadius: 14,
    backgroundColor: "#1c1c1c",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(28,28,30,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
  },
  chipText: {
    color: "#f2f2f7",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#3a3a3c",
    marginVertical: 6,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: PAD,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: "transparent",
  },
  messageBtnPressed: {
    opacity: 0.85,
  },
  messageBtnText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: "700",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingText: {
    color: "#aaa",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  missingBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: "#2c2c2e",
  },
  missingBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
