import { router, useLocalSearchParams } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
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

import { InterviewTypingIndicator } from "@/components/InterviewTypingIndicator";
import { getApiBaseUrl } from "@/lib/api-config";
import { useInterviewTurnRunner } from "@/lib/interview-turn-runner";
import { showValidationToast } from "@/lib/validation-toast";
import { setInterviewStatus } from "@/lib/interview-status";

const BG = "#121212";
const BUBBLE_ASSISTANT = "#1E1E1E";
const ACCENT = "#2196F3";
const BUBBLE_USER = "#1565C0";
const CARD_BG = "#1A1A1E";
const PLACEHOLDER = "#8A8A8A";

/** Tab principal: deck de swipe (`index` do grupo tabs). */
const TABS_HOME = "/(tabs)" as const;

type Role = "assistant" | "user";

type ChatMsg = { id: string; role: Role; text: string };

export default function EntrevistaIAScreen() {
  const { t } = useTranslation();
  const { fallback } = useLocalSearchParams<{ fallback?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const booted = useRef(false);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [noApiUrl, setNoApiUrl] = useState(false);
  const blockComposer = noApiUrl;
  /** Chegou aqui porque o microfone foi negado, não por escolha. */
  const cameFromVoiceFallback = fallback === "1";

  const scrollToLatestMessage = useCallback(() => {
    const run = () => scrollRef.current?.scrollToEnd({ animated: true });
    run();
    requestAnimationFrame(run);
    setTimeout(run, 120);
    setTimeout(run, 400);
  }, []);

  const appendAssistant = useCallback((text: string) => {
    const ts = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `a-${ts}`, role: "assistant", text },
    ]);
  }, []);

  const appendUser = useCallback((text: string) => {
    const ts = Date.now();
    setMessages((prev) => [...prev, { id: `u-${ts}`, role: "user", text }]);
  }, []);

  const goToDiscoverHome = useCallback(() => {
    Keyboard.dismiss();
    router.replace(TABS_HOME);
  }, []);

  const runner = useInterviewTurnRunner({
    onAssistant: (text) => appendAssistant(text),
    onComplete: () => {
      appendAssistant(t("entrevistaIa.phase2Complete"));
      Keyboard.dismiss();
    },
    // A mensagem de erro fica na UI e no toast; o runner deliberadamente não
    // a injeta na thread enviada ao modelo.
    onError: (msg) => {
      showValidationToast(msg);
      appendAssistant(msg);
    },
    onMissingApiUrl: () => setNoApiUrl(true),
  });
  const loading = runner.running;
  const interviewDone = runner.done;

  /** Após nova mensagem ou quando termina o loading (resposta da IA), mostrar o fim do histórico. */
  useEffect(() => {
    if (messages.length === 0 && !loading) return;
    scrollToLatestMessage();
  }, [messages, loading, scrollToLatestMessage]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    if (!getApiBaseUrl()) {
      setNoApiUrl(true);
      setMessages([
        { id: "m0", role: "assistant", text: t("entrevistaIa.intro") },
        { id: "m1", role: "assistant", text: t("entrevistaIa.f2ErrorNoApiUrl") },
      ]);
      return;
    }
    if (cameFromVoiceFallback) {
      setMessages([
        { id: "fb", role: "assistant", text: t("entrevistaVoz.fallbackNotice") },
      ]);
    }
    void runner.boot();
  }, [cameFromVoiceFallback, runner, t]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading || interviewDone || blockComposer) {
      if (text.length === 0)
        showValidationToast(t("entrevistaIa.chatErrorEmpty"));
      return;
    }
    setDraft("");
    appendUser(text);
    await runner.sendUserText(text);
  }, [appendUser, blockComposer, draft, interviewDone, loading, runner, t]);

  const onSkip = useCallback(async () => {
    await setInterviewStatus('pending');
    goToDiscoverHome();
  }, [goToDiscoverHome]);

  const onSwitchToVoice = useCallback(() => {
    router.replace("/entrevista-voz");
  }, []);

  const onOpenApp = useCallback(() => {
    goToDiscoverHome();
  }, [goToDiscoverHome]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.headerBtn}
          >
            <CaretLeftIcon size={20} color="#fff" weight="bold" />
          </Pressable>
          <Text style={styles.headerTitle}>{t("entrevistaIa.title")}</Text>
          <Pressable onPress={onSkip} hitSlop={8} style={styles.headerBtn}>
            <Text style={styles.skip}>{t("entrevistaIa.skip")}</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && loading && !blockComposer ? (
              <View style={styles.bootLoading}>
                <InterviewTypingIndicator dotSize={11} color={ACCENT} />
                <Text style={styles.bootLoadingText}>
                  {t("entrevistaIa.chatBootLoading")}
                </Text>
              </View>
            ) : null}
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.row,
                  m.role === "user" ? styles.rowUser : styles.rowAssistant,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    m.role === "user"
                      ? styles.bubbleUser
                      : styles.bubbleAssistant,
                  ]}
                >
                  <Text style={styles.bubbleText}>{m.text}</Text>
                </View>
              </View>
            ))}
            {loading &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" ? (
              <View style={[styles.row, styles.rowAssistant]}>
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleAssistant,
                    styles.typingBubble,
                  ]}
                >
                  <InterviewTypingIndicator dotSize={7} color={ACCENT} />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {interviewDone || blockComposer ? (
              <Pressable
                onPress={onOpenApp}
                style={styles.primaryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>
                  {t("entrevistaIa.openApp")}
                </Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t("entrevistaIa.chatPlaceholder")}
                  placeholderTextColor={PLACEHOLDER}
                  value={draft}
                  onChangeText={setDraft}
                  onFocus={() => {
                    if (!blockComposer && !interviewDone)
                      scrollToLatestMessage();
                  }}
                  multiline
                  editable={!loading && !blockComposer}
                  maxLength={4000}
                />
                <Pressable
                  onPress={() => void send()}
                  disabled={loading || blockComposer}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (pressed || loading) && styles.primaryBtnDimmed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {t("entrevistaIa.send")}
                  </Text>
                </Pressable>
              </>
            )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 72,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  skip: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  bootLoading: {
    flex: 1,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingTop: 32,
  },
  bootLoadingText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
  },
  row: {
    marginBottom: 10,
    flexDirection: "row",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleAssistant: {
    backgroundColor: BUBBLE_ASSISTANT,
  },
  bubbleUser: {
    backgroundColor: BUBBLE_USER,
  },
  typingBubble: {
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  bubbleText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
    minHeight: 88,
    maxHeight: 160,
    textAlignVertical: "top",
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnDimmed: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
