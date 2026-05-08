import { router } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
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
import { runInterviewTurn } from "@/lib/entrevista-api";
import { getSetupUserId } from "@/lib/setup-user-session";
import { patchUserProfile } from "@/lib/users-api";
import {
  validateInterviewFase1,
  type InterviewApiMessage,
  type InterviewTurnResult,
} from "@/lib/entrevista-chat-openai";
import {
  saveEntrevistaFase1,
  saveEntrevistaFase2,
} from "@/lib/entrevista-storage";
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

function mapInterviewErrorToUserMessage(err: unknown, t: TFunction): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/503|OPENAI_API_KEY|não está definida|not configured/i.test(m)) {
    return t("entrevistaIa.chatError503");
  }
  if (/incorrect api key|invalid_api_key|invalid x-api-key|^401$/i.test(m)) {
    return t("entrevistaIa.chatError401");
  }
  if (/429|rate limit|too many requests/i.test(m)) {
    return t("entrevistaIa.chatError429");
  }
  if (/502|bad gateway|OpenAI HTTP/i.test(m)) {
    return t("entrevistaIa.chatError502");
  }
  if (
    /failed to fetch|network request failed|load failed|network error/i.test(m)
  ) {
    return t("entrevistaIa.chatErrorNetwork");
  }
  if (m.length > 0 && m.length < 280) {
    return m;
  }
  return t("entrevistaIa.chatErrorApi");
}

export default function EntrevistaIAScreen() {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const threadRef = useRef<InterviewApiMessage[]>([]);
  const booted = useRef(false);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [noApiUrl, setNoApiUrl] = useState(false);
  const blockComposer = noApiUrl;

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

  const persistComplete = useCallback(async (r: InterviewTurnResult) => {
    if (!r.fase1 || !validateInterviewFase1(r.fase1)) return false;
    try {
      await saveEntrevistaFase1({
        primaryGoals: r.fase1.primaryGoals,
        professionalMoment: r.fase1.professionalMoment,
        mainArea: r.fase1.mainArea.trim(),
        workPreference: r.fase1.workPreference,
        searchRadius: r.fase1.searchRadius,
      });
    } catch {
      /* opcional */
    }
    const f2 = r.fase2_items ?? [];
    try {
      await saveEntrevistaFase2(f2);
    } catch {
      /* opcional */
    }
    const baseUrl = getApiBaseUrl();
    const uid = await getSetupUserId();
    if (baseUrl && uid) {
      try {
        await patchUserProfile(baseUrl, uid, {
          interviewFase1: {
            primaryGoals: r.fase1.primaryGoals,
            professionalMoment: r.fase1.professionalMoment,
            mainArea: r.fase1.mainArea.trim(),
            workPreference: r.fase1.workPreference,
            searchRadius: r.fase1.searchRadius,
          },
          interviewFase2Items: f2.map((item) => ({
            questionId: item.questionId,
            question: item.question,
            tipo: item.tipo,
            answer: item.answer,
          })),
        });
      } catch {
        /* sync servidor opcional se token expirou, etc. */
      }
    }
    await setInterviewStatus('completed');
    return true;
  }, []);

  const goToDiscoverHome = useCallback(() => {
    Keyboard.dismiss();
    router.replace(TABS_HOME);
  }, []);

  const handleTurnResult = useCallback(
    async (r: InterviewTurnResult) => {
      if (!r.interview_complete || !r.fase1) return;
      if (!validateInterviewFase1(r.fase1)) {
        appendAssistant(t("entrevistaIa.profileIncomplete"));
        threadRef.current.push({
          role: "assistant",
          content: t("entrevistaIa.profileIncomplete"),
        });
        return;
      }
      const ok = await persistComplete(r);
      if (ok) {
        appendAssistant(t("entrevistaIa.phase2Complete"));
        setInterviewDone(true);
        Keyboard.dismiss();
      }
    },
    [appendAssistant, persistComplete, t],
  );

  /** Após nova mensagem ou quando termina o loading (resposta da IA), mostrar o fim do histórico. */
  useEffect(() => {
    if (messages.length === 0 && !loading) return;
    scrollToLatestMessage();
  }, [messages, loading, scrollToLatestMessage]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      setNoApiUrl(true);
      setMessages([
        { id: "m0", role: "assistant", text: t("entrevistaIa.intro") },
        {
          id: "m1",
          role: "assistant",
          text: t("entrevistaIa.f2ErrorNoApiUrl"),
        },
      ]);
      return;
    }

    const run = async () => {
      setLoading(true);
      threadRef.current = [{ role: "user", content: "[START]" }];
      try {
        const r = await runInterviewTurn({
          baseUrl,
          locale: i18n.language,
          messages: threadRef.current,
        });
        threadRef.current = [
          { role: "user", content: "[START]" },
          { role: "assistant", content: r.assistant_message },
        ];
        setMessages([
          { id: "a0", role: "assistant", text: r.assistant_message },
        ]);
        await handleTurnResult(r);
      } catch (e) {
        const userMsg = mapInterviewErrorToUserMessage(e, t);
        showValidationToast(userMsg);
        setMessages([{ id: "e0", role: "assistant", text: userMsg }]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [handleTurnResult, i18n.language, t]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading || interviewDone || blockComposer) {
      if (text.length === 0)
        showValidationToast(t("entrevistaIa.chatErrorEmpty"));
      return;
    }

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return;

    setDraft("");
    appendUser(text);
    threadRef.current.push({ role: "user", content: text });

    setLoading(true);
    try {
      const r = await runInterviewTurn({
        baseUrl,
        locale: i18n.language,
        messages: threadRef.current,
      });
      threadRef.current.push({
        role: "assistant",
        content: r.assistant_message,
      });
      appendAssistant(r.assistant_message);
      await handleTurnResult(r);
    } catch (e) {
      const userMsg = mapInterviewErrorToUserMessage(e, t);
      showValidationToast(userMsg);
      appendAssistant(userMsg);
      threadRef.current.push({ role: "assistant", content: userMsg });
    } finally {
      setLoading(false);
    }
  }, [
    appendAssistant,
    appendUser,
    draft,
    handleTurnResult,
    i18n.language,
    interviewDone,
    loading,
    blockComposer,
    t,
  ]);

  const onSkip = useCallback(async () => {
    await setInterviewStatus('pending');
    goToDiscoverHome();
  }, [goToDiscoverHome]);

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
