import { useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getApiBaseUrl } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";
import { decodeJwtSub } from "@/lib/jwt-sub";
import { fetchProfileEditFields, patchUserProfile } from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const ACCENT = "#0A84FF";
const MUTED = "#8E8E93";
const INPUT_BG = "#1C1C1E";
const PAD = 16;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [company, setCompany] = useState("");
  const [cityLabel, setCityLabel] = useState("");
  const [bio, setBio] = useState("");

  const load = useCallback(async () => {
    const token = await getAccessToken();
    const userId = token ? decodeJwtSub(token) : null;
    const base = getApiBaseUrl();
    if (!token?.trim() || !userId || !base) {
      setPhase("error");
      return;
    }
    setPhase("loading");
    try {
      const f = await fetchProfileEditFields(base, userId);
      setUsername(f.username);
      setRoleTitle(f.roleTitle);
      setCompany(f.company);
      setCityLabel(f.cityLabel);
      setBio(f.bio);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = useCallback(async () => {
    const token = await getAccessToken();
    const userId = token ? decodeJwtSub(token) : null;
    const base = getApiBaseUrl();
    if (!userId || !base) {
      showValidationToast(t("editProfile.missingSession"));
      return;
    }
    setBusy(true);
    try {
      await patchUserProfile(base, userId, {
        username: username.trim(),
        roleTitle: roleTitle.trim(),
        company: company.trim(),
        cityLabel: cityLabel.trim(),
        bio: bio.trim(),
      });
      showValidationToast(t("editProfile.saved"));
      router.back();
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message
          : t("editProfile.saveError");
      showValidationToast(msg);
    } finally {
      setBusy(false);
    }
  }, [bio, cityLabel, company, roleTitle, router, t, username]);

  const bottomPad = Math.max(insets.bottom, 12) + 24;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("editProfile.backA11y")}
          >
            <CaretLeftIcon size={20} color={ACCENT} weight="bold" />
          </Pressable>
          <Text style={styles.topTitle}>{t("editProfile.title")}</Text>
          <View style={styles.topBarSpacer} />
        </View>

        {phase === "loading" ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : null}

        {phase === "error" ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{t("editProfile.loadError")}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => void load()}
              accessibilityRole="button"
            >
              <Text style={styles.retryBtnText}>{t("editProfile.retry")}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "ready" ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPad },
            ]}
          >
            <Text style={styles.label}>{t("editProfile.fieldUsername")}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t("editProfile.placeholderUsername")}
              placeholderTextColor={MUTED}
              maxLength={120}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>{t("editProfile.fieldRole")}</Text>
            <TextInput
              style={styles.input}
              value={roleTitle}
              onChangeText={setRoleTitle}
              placeholder={t("editProfile.placeholderRole")}
              placeholderTextColor={MUTED}
              maxLength={120}
            />

            <Text style={styles.label}>{t("editProfile.fieldCompany")}</Text>
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
              placeholder={t("editProfile.placeholderCompany")}
              placeholderTextColor={MUTED}
              maxLength={200}
            />

            <Text style={styles.label}>{t("editProfile.fieldCity")}</Text>
            <TextInput
              style={styles.input}
              value={cityLabel}
              onChangeText={setCityLabel}
              placeholder={t("editProfile.placeholderCity")}
              placeholderTextColor={MUTED}
              maxLength={200}
            />

            <Text style={styles.label}>{t("editProfile.fieldBio")}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder={t("editProfile.placeholderBio")}
              placeholderTextColor={MUTED}
              multiline
              textAlignVertical="top"
              maxLength={8000}
            />

            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressed,
                busy && styles.saveBtnDisabled,
              ]}
              onPress={() => void onSave()}
              disabled={busy}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t("editProfile.save")}</Text>
              )}
            </Pressable>
          </ScrollView>
        ) : null}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PAD,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  topBarSpacer: {
    width: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: PAD,
  },
  errorText: {
    color: MUTED,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "rgba(10,132,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(10,132,255,0.45)",
  },
  retryBtnText: {
    color: ACCENT,
    fontWeight: "700",
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputMultiline: {
    minHeight: 120,
    paddingTop: 12,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});
