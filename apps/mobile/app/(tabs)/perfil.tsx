import { useFocusEffect } from "@react-navigation/native";
import {
  CaretRightIcon,
  Eye,
  MapPin,
  PencilSimple,
  SignOut,
  UserCircle,
} from "phosphor-react-native";
import { type Href, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LanguageSelector } from "@/components/LanguageSelector";
import { clearSession, getAccessToken } from "@/lib/auth-storage";
import { getApiBaseUrl } from "@/lib/api-config";
import { logoutOneSignalUser } from "@/lib/onesignal";
import { unregisterPushToken } from "@/lib/push-api";
import {
  clearStoredPushRegistration,
  getStoredPushRegistration,
} from "@/lib/push-token-storage";
import { decodeJwtSub } from "@/lib/jwt-sub";
import { clearSetupUserId } from "@/lib/setup-user-session";
import type { PublicProfileResponse } from "@/lib/users-api";
import { fetchUserPublicProfile } from "@/lib/users-api";
import { photoUri } from "@/lib/match-demo-deck";
import {
  fetchPushPreferences,
  patchPushPreferences,
  type PushPreferences,
} from "@/lib/push-preferences-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const ACCENT = "#0A84FF";
const MUTED = "#8E8E93";
const PAD = 16;
const AVATAR = 96;

export default function PerfilScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<"loading" | "guest" | "ready" | "error">(
    "loading",
  );
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [pushPrefs, setPushPrefs] = useState<PushPreferences | null>(null);
  const [pushPrefsSaving, setPushPrefsSaving] = useState(false);
  const firstFocus = useRef(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const token = await getAccessToken();
    if (!token?.trim()) {
      setPhase("guest");
      setProfile(null);
      setPushPrefs(null);
      return;
    }
    const userId = decodeJwtSub(token);
    if (!userId) {
      setPhase("error");
      setProfile(null);
      setPushPrefs(null);
      return;
    }
    const base = getApiBaseUrl();
    if (!base) {
      setPhase("error");
      setProfile(null);
      setPushPrefs(null);
      return;
    }
    if (!silent) {
      setPhase("loading");
    }
    try {
      const data = await fetchUserPublicProfile(base, userId);
      setProfile(data);
      setPhase("ready");
      try {
        setPushPrefs(await fetchPushPreferences(base));
      } catch {
        setPushPrefs(null);
      }
    } catch {
      setProfile(null);
      setPushPrefs(null);
      setPhase("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load({ silent: !firstFocus.current });
      firstFocus.current = false;
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    if (phase === "guest") return;
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load, phase]);

  const onSignOut = useCallback(async () => {
    const base = getApiBaseUrl();
    const stored = await getStoredPushRegistration();
    if (base && stored) {
      try {
        await unregisterPushToken(base, stored.token, stored.provider);
      } catch {
        /* ignore */
      }
      try {
        await clearStoredPushRegistration();
      } catch {
        /* ignore */
      }
    }
    logoutOneSignalUser();
    try {
      await clearSession();
    } catch {
      /* ignore */
    }
    try {
      await clearSetupUserId();
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }, [router]);

  const openPublicPreview = useCallback(() => {
    if (!profile?.id) return;
    const city = profile.cityLabel?.trim();
    router.push({
      pathname: "/user-profile",
      params: {
        id: profile.id,
        preview: "1",
        ...(city ? { city: encodeURIComponent(city) } : {}),
      },
    } as Href);
  }, [profile, router]);

  const onSetPushMessages = useCallback(
    async (value: boolean) => {
      const base = getApiBaseUrl();
      if (!base || pushPrefs === null) return;
      const prev = pushPrefs;
      setPushPrefs({ ...pushPrefs, pushNotifyMessages: value });
      setPushPrefsSaving(true);
      try {
        const next = await patchPushPreferences(base, {
          pushNotifyMessages: value,
        });
        setPushPrefs(next);
      } catch {
        setPushPrefs(prev);
        showValidationToast(t("profileTab.pushPrefsError"));
      } finally {
        setPushPrefsSaving(false);
      }
    },
    [pushPrefs, t],
  );

  const onSetPushSocial = useCallback(
    async (value: boolean) => {
      const base = getApiBaseUrl();
      if (!base || pushPrefs === null) return;
      const prev = pushPrefs;
      setPushPrefs({ ...pushPrefs, pushNotifySocial: value });
      setPushPrefsSaving(true);
      try {
        const next = await patchPushPreferences(base, {
          pushNotifySocial: value,
        });
        setPushPrefs(next);
      } catch {
        setPushPrefs(prev);
        showValidationToast(t("profileTab.pushPrefsError"));
      } finally {
        setPushPrefsSaving(false);
      }
    },
    [pushPrefs, t],
  );

  const seed = profile?.photoSeeds?.[0] ?? "profile";
  const avatarUri = photoUri(seed, 256, 256);
  const listBottomPad = Math.max(insets.bottom, 12) + 24;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={ACCENT}
            enabled={phase !== "guest"}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: listBottomPad },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t("profileTab.title")}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {t("profileTab.screenSubtitle")}
            </Text>
          </View>
        </View>

        {phase === "loading" && !refreshing ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : null}

        {phase === "guest" ? (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <UserCircle size={48} color={MUTED} weight="regular" />
            </View>
            <Text style={styles.guestTitle}>{t("profileTab.guestTitle")}</Text>
            <Text style={styles.guestSub}>{t("profileTab.guestSub")}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/login" as Href)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>
                {t("profileTab.guestLogin")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "error" ? (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>{t("profileTab.loadError")}</Text>
            <Text style={styles.guestSub}>
              {getApiBaseUrl()
                ? t("profileTab.errorSubRetry")
                : t("profileTab.noApiHint")}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => void load({ silent: false })}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{t("profileTab.retry")}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "ready" && profile ? (
          <>
            <View style={styles.hero}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
              <Text style={styles.name} numberOfLines={2}>
                {profile.name}
              </Text>
              <Text style={styles.headline} numberOfLines={2}>
                {profile.headline}
              </Text>
              {profile.tagline ? (
                <Text style={styles.tagline} numberOfLines={3}>
                  {profile.tagline}
                </Text>
              ) : null}
              {profile.cityLabel ? (
                <View style={styles.cityRow}>
                  <MapPin
                    size={14}
                    color={MUTED}
                    style={styles.cityIcon}
                    weight="fill"
                  />
                  <Text style={styles.city}>{profile.cityLabel}</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.previewBtn,
                pressed && styles.pressed,
              ]}
              onPress={openPublicPreview}
              accessibilityRole="button"
              accessibilityLabel={t("profileTab.previewPublicA11y")}
            >
              <Eye
                size={16}
                color={ACCENT}
                style={styles.previewBtnIcon}
                weight="regular"
              />
              <Text style={styles.previewBtnText}>
                {t("profileTab.previewPublic")}
              </Text>
              <CaretRightIcon
                size={14}
                color="rgba(255,255,255,0.35)"
                weight="bold"
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.menuRow,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/edit-profile" as Href)}
              accessibilityRole="button"
              accessibilityLabel={t("profileTab.editProfileA11y")}
            >
              <View style={styles.menuIconWrap}>
                <PencilSimple size={18} color="#fff" weight="regular" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>
                  {t("profileTab.editProfile")}
                </Text>
                <Text style={styles.menuSub}>
                  {t("profileTab.editProfileSub")}
                </Text>
              </View>
              <CaretRightIcon
                size={14}
                color="rgba(255,255,255,0.28)"
                weight="bold"
              />
            </Pressable>

            {pushPrefs ? (
              <View style={styles.pushSection}>
                <Text style={styles.langLabel}>
                  {t("profileTab.pushSectionTitle")}
                </Text>
                <View style={styles.pushCard}>
                  <View style={styles.pushRow}>
                    <View style={styles.pushRowTextCol}>
                      <Text style={styles.pushRowTitle}>
                        {t("profileTab.pushMessages")}
                      </Text>
                      <Text style={styles.pushRowSub}>
                        {t("profileTab.pushMessagesSub")}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel={t("profileTab.pushMessages")}
                      value={pushPrefs.pushNotifyMessages}
                      onValueChange={(v) => void onSetPushMessages(v)}
                      disabled={pushPrefsSaving}
                      trackColor={{
                        false: "#3A3A3C",
                        true: "rgba(10,132,255,0.45)",
                      }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.pushDivider} />
                  <View style={styles.pushRow}>
                    <View style={styles.pushRowTextCol}>
                      <Text style={styles.pushRowTitle}>
                        {t("profileTab.pushSocial")}
                      </Text>
                      <Text style={styles.pushRowSub}>
                        {t("profileTab.pushSocialSub")}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel={t("profileTab.pushSocial")}
                      value={pushPrefs.pushNotifySocial}
                      onValueChange={(v) => void onSetPushSocial(v)}
                      disabled={pushPrefsSaving}
                      trackColor={{
                        false: "#3A3A3C",
                        true: "rgba(10,132,255,0.45)",
                      }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.langBlock}>
              <Text style={styles.langLabel}>
                {t("profileTab.languageLabel")}
              </Text>
              <LanguageSelector compact />
            </View>
          </>
        ) : null}

        {phase === "ready" ? (
          <Pressable
            style={({ pressed }) => [
              styles.signOutBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => void onSignOut()}
            accessibilityRole="button"
            accessibilityLabel={t("profileTab.signOutA11y")}
          >
            <SignOut
              size={16}
              color="#FF453A"
              style={styles.signOutIcon}
              weight="bold"
            />
            <Text style={styles.signOutText}>{t("profileTab.signOut")}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PAD,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  headerText: {
    minWidth: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  centerBlock: {
    paddingVertical: 48,
    alignItems: "center",
  },
  guestCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  guestIcon: {
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  guestSub: {
    fontSize: 15,
    color: MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 22,
    maxWidth: 320,
  },
  primaryBtn: {
    backgroundColor: "rgba(10,132,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(10,132,255,0.45)",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
  hero: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: "#2C2C2E",
    marginBottom: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headline: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  cityIcon: {
    marginRight: 6,
  },
  city: {
    fontSize: 14,
    color: MUTED,
    fontWeight: "600",
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  previewBtnIcon: {
    marginRight: 10,
  },
  previewBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  menuSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  pushSection: {
    marginBottom: 20,
  },
  pushCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  pushRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  pushRowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  pushRowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  pushRowSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
    lineHeight: 18,
  },
  pushDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 14,
  },
  langBlock: {
    marginTop: 8,
    marginBottom: 28,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "rgba(255,69,58,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.35)",
  },
  signOutIcon: {
    marginRight: 10,
  },
  signOutText: {
    color: "#FF453A",
    fontSize: 16,
    fontWeight: "700",
  },
});
