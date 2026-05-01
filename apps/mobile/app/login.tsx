import { Link, router } from "expo-router";
import { CaretLeftIcon, Check, Eye, EyeSlash } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getApiBaseUrl } from "@/lib/api-config";
import { clearSetupUserId, setSetupUserId } from "@/lib/setup-user-session";
import { loginUser } from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const INPUT_BG = "#1E1E1E";
const ACCENT = "#2196F3";
const LINK = "#42A5F5";
const PLACEHOLDER = "#8A8A8A";

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const onBack = useCallback(() => {
    router.replace("/onboarding");
  }, []);

  const onSubmit = useCallback(async () => {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      showValidationToast(t("login.errorRequired"));
      return;
    }
    const base = getApiBaseUrl();
    if (!base) {
      showValidationToast(t("login.errorNoApi"));
      return;
    }
    setBusy(true);
    try {
      try {
        await clearSetupUserId();
      } catch {
        /* ignore */
      }
      const r = await loginUser(base, e, p);
      await setSetupUserId(r.user.id);
      router.replace("/(tabs)");
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("login.errorRequired");
      showValidationToast(msg);
    } finally {
      setBusy(false);
    }
  }, [email, password, t]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.pressed,
              ]}
            >
              <CaretLeftIcon size={22} color="#fff" weight="bold" />
            </Pressable>
          </View>

          <View style={styles.mainColumn}>
            <View style={styles.logoRegion}>
              <Image
                source={require("../assets/images/toplynk-logo.png")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="TopLynk"
              />
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.formColumn}>
                <View style={styles.form}>
                  <Text style={styles.label}>{t("login.email")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("login.emailPlaceholder")}
                    placeholderTextColor={PLACEHOLDER}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={[styles.label, styles.labelSpaced]}>
                    {t("login.password")}
                  </Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder={t("login.passwordPlaceholder")}
                      placeholderTextColor={PLACEHOLDER}
                      secureTextEntry={secure}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable
                      onPress={() => setSecure((s) => !s)}
                      hitSlop={10}
                      style={styles.eyeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={
                        secure ? "Show password" : "Hide password"
                      }
                    >
                      {secure ? (
                        <Eye size={20} color="#bbb" weight="regular" />
                      ) : (
                        <EyeSlash size={20} color="#bbb" weight="regular" />
                      )}
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => setRemember((r) => !r)}
                    style={styles.rememberRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: remember }}
                  >
                    <View
                      style={[styles.checkbox, remember && styles.checkboxOn]}
                    >
                      {remember ? (
                        <Check size={12} color="#fff" weight="bold" />
                      ) : null}
                    </View>
                    <Text style={styles.rememberText}>
                      {t("login.remember")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={onSubmit}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      (pressed || busy) && styles.pressed,
                      busy && styles.primaryBtnDisabled,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {t("login.submit")}
                      </Text>
                    )}
                  </Pressable>

                  <Text style={styles.footer}>
                    {t("login.footerPrefix")}{" "}
                    <Link href="/signup" asChild>
                      <Text style={styles.footerLink}>
                        {t("login.footerLink")}
                      </Text>
                    </Link>
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  header: { paddingHorizontal: 8, paddingTop: 4 },
  backBtn: { alignSelf: "flex-start", padding: 12 },
  pressed: { opacity: 0.85 },
  mainColumn: { flex: 1 },
  logoRegion: { alignItems: "center", paddingTop: 8, paddingBottom: 8 },
  logo: { width: 220, height: 72 },
  formScroll: { flex: 1 },
  formScrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },
  formColumn: { flex: 1, justifyContent: "center" },
  form: { width: "100%", maxWidth: 400, alignSelf: "center" },
  label: { color: "#fff", fontSize: 14, fontWeight: "600" },
  labelSpaced: { marginTop: 16 },
  input: {
    marginTop: 8,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
  },
  passwordWrap: { marginTop: 8, position: "relative" },
  passwordInput: { paddingRight: 44 },
  eyeBtn: { position: "absolute", right: 10, top: 14 },
  rememberRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  rememberText: { color: "rgba(255,255,255,0.9)", fontSize: 14 },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnDisabled: { opacity: 0.85 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  footer: {
    marginTop: 20,
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    textAlign: "center",
  },
  footerLink: { color: LINK, fontWeight: "600" },
});
