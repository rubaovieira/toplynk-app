import { Stack, router } from "expo-router";
import { CaretLeftIcon, Check, Eye, EyeSlash } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
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

import { LanguageSelector } from "@/components/LanguageSelector";
import { setPendingSignupEmail } from "@/lib/pending-registration";
import { setPendingSignupPassword } from "@/lib/pending-signup-password";
import { clearSetupUserId } from "@/lib/setup-user-session";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const INPUT_BG = "#1E1E1E";
const ACCENT = "#2196F3";
const LINK = "#42A5F5";
const PLACEHOLDER = "#8A8A8A";

const PRIVACY_URL = "https://toplynk.com.br/politica-de-privacidade";

export default function SignupScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const onBack = useCallback(() => {
    router.back();
  }, []);

  const onOpenPrivacy = useCallback(() => {
    void Linking.openURL(PRIVACY_URL);
  }, []);

  const onSubmit = useCallback(async () => {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      showValidationToast(t("signup.errorRequired"));
      return;
    }
    if (!acceptedPrivacy) {
      showValidationToast(t("signup.errorPrivacy"));
      return;
    }
    try {
      await clearSetupUserId();
      await setPendingSignupEmail(e);
      await setPendingSignupPassword(p);
    } catch {
      /* continua mesmo sem guardar — registo na API fica opcional */
    }
    router.replace("/setup/step1");
  }, [email, password, acceptedPrivacy, t]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
                      style={styles.inputPassword}
                      placeholder={t("login.passwordPlaceholder")}
                      placeholderTextColor={PLACEHOLDER}
                      secureTextEntry={secure}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable
                      onPress={() => setSecure((s) => !s)}
                      style={styles.eyeBtn}
                      hitSlop={8}
                    >
                      {secure ? (
                        <EyeSlash
                          size={20}
                          color={PLACEHOLDER}
                          weight="regular"
                        />
                      ) : (
                        <Eye size={20} color={PLACEHOLDER} weight="regular" />
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.privacyRow}>
                    <Pressable
                      onPress={() => setAcceptedPrivacy((v) => !v)}
                      hitSlop={4}
                      style={styles.privacyCheckHit}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: acceptedPrivacy }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          acceptedPrivacy && styles.checkboxOn,
                        ]}
                      >
                        {acceptedPrivacy ? (
                          <Check size={12} color="#fff" weight="bold" />
                        ) : null}
                      </View>
                    </Pressable>
                    <Text style={styles.privacyText}>
                      {t("signup.privacyPrefix")}
                      <Text style={styles.privacyLink} onPress={onOpenPrivacy}>
                        {t("signup.privacyTerms")}
                      </Text>
                      {t("signup.privacySuffix")}
                    </Text>
                  </View>

                  <Pressable
                    onPress={onSubmit}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>
                      {t("signup.submit")}
                    </Text>
                  </Pressable>

                  <Text style={styles.footer}>
                    {t("signup.footerPrefix")}{" "}
                    <Text
                      style={styles.footerLink}
                      onPress={() => router.replace("/login")}
                    >
                      {t("signup.footerLink")}
                    </Text>
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>

          <LanguageSelector compact />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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
  mainColumn: {
    flex: 1,
    minHeight: 0,
  },
  logoRegion: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  formScroll: {
    flexShrink: 1,
  },
  formScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  formColumn: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  logo: {
    width: "100%",
    maxWidth: 300,
    height: 72,
    alignSelf: "center",
  },
  form: {
    width: "100%",
  },
  label: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "left",
  },
  labelSpaced: {
    marginTop: 18,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    textAlign: "left",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingRight: 8,
  },
  inputPassword: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    textAlign: "left",
  },
  eyeBtn: {
    padding: 10,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 22,
    gap: 10,
  },
  privacyCheckHit: {
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxOn: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  privacyText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  privacyLink: {
    color: "#fff",
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationColor: LINK,
  },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    marginTop: 24,
    textAlign: "center",
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  footerLink: {
    color: LINK,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
});
