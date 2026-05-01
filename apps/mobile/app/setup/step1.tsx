import { router } from "expo-router";
import { useCallback, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { SetupStepHeader } from "@/components/SetupStepHeader";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  clearPendingSignupEmail,
  getPendingSignupEmail,
} from "@/lib/pending-registration";
import {
  clearPendingSignupPassword,
  getPendingSignupPassword,
} from "@/lib/pending-signup-password";
import { registerPushDeviceAfterAuth } from "@/lib/register-push-device";
import { setSetupUserId } from "@/lib/setup-user-session";
import {
  CreateUserConflictError,
  createUser,
  loginUser,
} from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const INPUT_BG = "#1E1E1E";
const ACCENT = "#2196F3";
const PLACEHOLDER = "#8A8A8A";

export default function SetupStep1Screen() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [busy, setBusy] = useState(false);
  const onBack = useCallback(() => {
    router.replace("/login");
  }, []);

  const onContinue = useCallback(async () => {
    const u = username.trim();
    const n = professionalName.trim();
    if (!u || !n) {
      showValidationToast(t("setup.step1.errorRequired"));
      return;
    }

    const base = getApiBaseUrl();
    const pendingEmail = await getPendingSignupEmail();
    const pendingPassword = await getPendingSignupPassword();
    if (base && pendingEmail) {
      if (!pendingPassword || pendingPassword.length < 8) {
        showValidationToast(t("setup.step1.errorMissingPassword"));
        return;
      }
      setBusy(true);
      try {
        const created = await createUser(base, {
          email: pendingEmail,
          displayName: n,
          username: u,
          password: pendingPassword,
        });
        await setSetupUserId(created.id);
        await loginUser(base, pendingEmail, pendingPassword);
        await clearPendingSignupEmail();
        await clearPendingSignupPassword();
        void registerPushDeviceAfterAuth();
      } catch (e) {
        if (e instanceof CreateUserConflictError) {
          showValidationToast(e.message);
          await clearPendingSignupEmail();
          await clearPendingSignupPassword();
          setBusy(false);
          router.replace("/login");
          return;
        }
        const msg =
          e instanceof Error && e.message.trim()
            ? e.message
            : t("setup.step1.errorApi");
        showValidationToast(msg);
        setBusy(false);
        return;
      }
      setBusy(false);
    }

    router.push("/setup/step2");
  }, [username, professionalName, t]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <SetupStepHeader currentStep={1} onBack={onBack} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t("setup.step1.title")}</Text>
            <Text style={styles.subtitle}>{t("setup.step1.subtitle")}</Text>

            <TextInput
              style={[styles.input, styles.inputFirst]}
              placeholder={t("setup.step1.usernamePlaceholder")}
              placeholderTextColor={PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />

            <TextInput
              style={styles.input}
              placeholder={t("setup.step1.professionalPlaceholder")}
              placeholderTextColor={PLACEHOLDER}
              value={professionalName}
              onChangeText={setProfessionalName}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => void onContinue()}
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
                <Text style={styles.primaryBtnText}>{t("setup.continue")}</Text>
              )}
            </Pressable>
          </View>
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
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "left",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
    textAlign: "left",
  },
  inputFirst: {
    marginBottom: 16,
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
});
