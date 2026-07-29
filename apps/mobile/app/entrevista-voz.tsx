import {
  AudioModule,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  CheckIcon,
  MicrophoneIcon,
  PauseIcon,
  PlayIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { InterviewProgressBar } from "@/components/InterviewProgressBar";
import { InterviewTypingIndicator } from "@/components/InterviewTypingIndicator";
import { VoiceOrb } from "@/components/VoiceOrb";
import { VoiceWaveform } from "@/components/VoiceWaveform";
import { getApiBaseUrl } from "@/lib/api-config";
import { transcribeInterviewAudio } from "@/lib/entrevista-api";
import {
  cleanupInterviewAudioCache,
  INTERVIEW_AUDIO_MIME,
  INTERVIEW_RECORDING_OPTIONS,
  MAX_UTTERANCE_MS,
  meteringToLevel,
  readRecordingAsBase64,
  writeTtsToCacheFile,
} from "@/lib/interview-audio";
import {
  mapInterviewErrorToUserMessage,
  useInterviewTurnRunner,
} from "@/lib/interview-turn-runner";
import {
  getInterviewTtsEnabled,
  setInterviewTtsEnabled,
} from "@/lib/interview-voice-prefs";
import { setInterviewStatus } from "@/lib/interview-status";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const ACCENT = "#2196F3";
const CTRL_BG = "#2A2A2A";
const BODY_COLOR = "rgba(255,255,255,0.72)";

const TABS_HOME = "/(tabs)" as const;
const METERING_INTERVAL_MS = 100;
const WAVEFORM_SAMPLES = 40;
/** Após 3 falhas seguidas de captura, oferecer saída por texto. */
const MAX_CONSECUTIVE_FAILURES = 3;

type VoiceState =
  | "permission"
  | "booting"
  | "speaking"
  | "listening"
  | "paused"
  | "transcribing"
  | "thinking"
  | "completed";

export default function EntrevistaVozScreen() {
  const { t, i18n } = useTranslation();

  const [state, setState] = useState<VoiceState>("permission");
  const [progress, setProgress] = useState(0);
  const [assistantText, setAssistantText] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [levels, setLevels] = useState<number[]>([]);
  const [ttsUri, setTtsUri] = useState<string | null>(null);

  const failuresRef = useRef(0);
  const turnIdRef = useRef(0);
  const playedUriRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const ttsEnabledRef = useRef(true);

  const recorder = useAudioRecorder(INTERVIEW_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, METERING_INTERVAL_MS);
  const player = useAudioPlayer(ttsUri ? { uri: ttsUri } : undefined);
  const playerStatus = useAudioPlayerStatus(player);

  /** Sessão de gravação: no iOS o modo PlayAndRecord muda o roteamento da saída. */
  const setSessionForRecording = useCallback(async () => {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    });
  }, []);

  const setSessionForPlayback = useCallback(async () => {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    });
  }, []);

  const startListening = useCallback(async () => {
    try {
      await setSessionForRecording();
      // isMeteringEnabled precisa ir aqui também: só no useAudioRecorder,
      // `metering` fica sempre undefined.
      await recorder.prepareToRecordAsync(INTERVIEW_RECORDING_OPTIONS);
      recorder.record();
      setLevels([]);
      setState("listening");
    } catch {
      showValidationToast(t("entrevistaVoz.micUnavailable"));
      setState("paused");
    }
  }, [recorder, setSessionForRecording, t]);

  const goToText = useCallback(() => {
    cleanupInterviewAudioCache();
    router.replace("/entrevista-ia?fallback=1");
  }, []);

  const runner = useInterviewTurnRunner({
    onAssistant: (text, turn) => {
      setAssistantText(text);
      const audio = turn.audioBase64;
      if (ttsEnabledRef.current && audio) {
        turnIdRef.current += 1;
        const uri = writeTtsToCacheFile(audio, turnIdRef.current);
        if (uri) {
          setTtsUri(uri);
          setState("speaking");
          return;
        }
      }
      // Sem áudio (mudo, TTS falhou ou cache indisponível): o texto na tela
      // já foi atualizado, então seguimos direto para ouvir.
      void startListening();
    },
    onProgress: setProgress,
    onComplete: () => setState("completed"),
    onError: (msg) => {
      showValidationToast(msg);
      setState("paused");
    },
    onMissingApiUrl: () => {
      showValidationToast(t("entrevistaIa.f2ErrorNoApiUrl"));
      goToText();
    },
  });

  /** Permissão na montagem da tela — nunca antes, por causa do App Review. */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const saved = await getInterviewTtsEnabled();
      ttsEnabledRef.current = saved;
      setTtsEnabled(saved);

      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== "granted") {
        showValidationToast(t("entrevistaVoz.permissionDenied"));
        goToText();
        return;
      }
      setState("booting");
      await runner.boot(saved);
    })();
  }, [goToText, runner, t]);

  useEffect(() => cleanupInterviewAudioCache, []);

  /** Acumula o metering para a waveform. */
  useEffect(() => {
    if (state !== "listening") return;
    const level = meteringToLevel(recorderState.metering);
    setLevels((prev) => [...prev, level].slice(-WAVEFORM_SAMPLES));
  }, [recorderState.metering, state]);

  /** Teto por fala: encerra sozinho em 2 min. */
  useEffect(() => {
    if (state !== "listening") return;
    if (recorderState.durationMillis < MAX_UTTERANCE_MS) return;
    void confirmUtterance();
    // confirmUtterance é estável o bastante; incluí-la aqui reiniciaria o efeito
    // a cada tick de duração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.durationMillis, state]);

  /** Fim da fala do assistente → volta a ouvir, exatamente uma vez por áudio. */
  useEffect(() => {
    if (state !== "speaking" || !ttsUri) return;
    if (!playerStatus.didJustFinish) return;
    if (playedUriRef.current === ttsUri) return;
    playedUriRef.current = ttsUri;
    void startListening();
  }, [playerStatus.didJustFinish, startListening, state, ttsUri]);

  useEffect(() => {
    if (state !== "speaking" || !ttsUri) return;
    void setSessionForPlayback().then(() => player.play());
  }, [player, setSessionForPlayback, state, ttsUri]);

  const submitTranscript = useCallback(
    async (text: string) => {
      failuresRef.current = 0;
      setState("thinking");
      await runner.sendUserText(text, ttsEnabledRef.current);
    },
    [runner],
  );

  const registerFailure = useCallback(
    (messageKey: string) => {
      failuresRef.current += 1;
      showValidationToast(t(messageKey));
      if (failuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        showValidationToast(t("entrevistaVoz.micUnavailable"));
      }
      void startListening();
    },
    [startListening, t],
  );

  const confirmUtterance = useCallback(async () => {
    const durationMs = recorderState.durationMillis;
    try {
      await recorder.stop();
    } catch {
      /* já parado */
    }

    const read = await readRecordingAsBase64(recorder.uri, durationMs);
    if (!read.ok) {
      // Toque acidental ou arquivo ilegível: nem chega a gastar um round trip.
      registerFailure(
        read.reason === "empty" ? "entrevistaVoz.tooShort" : "entrevistaVoz.transcribeError",
      );
      return;
    }

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      goToText();
      return;
    }

    setState("transcribing");
    try {
      const text = await transcribeInterviewAudio({
        baseUrl,
        locale: i18n.language,
        audioBase64: read.base64,
        mimeType: INTERVIEW_AUDIO_MIME,
      });
      if (!text) {
        registerFailure("entrevistaVoz.transcribeEmpty");
        return;
      }
      await submitTranscript(text);
    } catch (e) {
      showValidationToast(mapInterviewErrorToUserMessage(e, t));
      failuresRef.current += 1;
      void startListening();
    }
  }, [
    goToText,
    i18n.language,
    recorder,
    recorderState.durationMillis,
    registerFailure,
    startListening,
    submitTranscript,
    t,
  ]);

  const onToggleSpeaker = useCallback(async () => {
    const next = !ttsEnabledRef.current;
    ttsEnabledRef.current = next;
    setTtsEnabled(next);
    await setInterviewTtsEnabled(next);
    if (!next && state === "speaking") {
      player.pause();
      await startListening();
    }
  }, [player, startListening, state]);

  const onTogglePause = useCallback(async () => {
    if (state === "speaking") {
      player.pause();
      await startListening();
      return;
    }
    if (state === "listening") {
      recorder.pause();
      setState("paused");
      return;
    }
    if (state === "paused") {
      // Não existe resume() no expo-audio: record() é o verbo de retomada.
      if (recorderState.canRecord) {
        recorder.record();
        setState("listening");
      } else {
        await startListening();
      }
    }
  }, [player, recorder, recorderState.canRecord, startListening, state]);

  const onConfirm = useCallback(async () => {
    if (state === "completed") {
      cleanupInterviewAudioCache();
      router.replace(TABS_HOME);
      return;
    }
    if (state === "speaking") {
      player.pause();
      await startListening();
      return;
    }
    if (state === "listening" || state === "paused") {
      await confirmUtterance();
    }
  }, [confirmUtterance, player, startListening, state]);

  const onBack = useCallback(async () => {
    cleanupInterviewAudioCache();
    await setInterviewStatus("pending");
    router.replace(TABS_HOME);
  }, []);

  const busy = state === "transcribing" || state === "thinking";
  const label =
    state === "listening"
      ? t("entrevistaVoz.stateListening")
      : state === "paused"
        ? t("entrevistaVoz.statePaused")
        : state === "transcribing"
          ? t("entrevistaVoz.stateAnalyzing")
          : state === "thinking" || state === "booting"
            ? t("entrevistaVoz.stateWaiting")
            : state === "speaking"
              ? t("entrevistaVoz.stateSpeaking")
              : "";

  if (state === "permission") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <InterviewProgressBar
          percent={progress}
          onBack={() => void onBack()}
          backLabel={t("entrevistaVoz.a11yBack")}
        />

        <View style={styles.body}>
          <VoiceOrb
            active={state === "speaking" || busy}
            accessibilityLabel={t("entrevistaVoz.a11yOrb")}
          />

          {state === "listening" ? (
            <View style={styles.micBadge}>
              <MicrophoneIcon size={20} color="#fff" weight="fill" />
            </View>
          ) : null}

          <Text style={styles.stateLabel} accessibilityLiveRegion="polite">
            {label}
          </Text>

          {busy ? <InterviewTypingIndicator dotSize={11} color={ACCENT} /> : null}

          {state === "listening" ? (
            <VoiceWaveform levels={levels} color={ACCENT} />
          ) : null}

          {/* Sem voz, o texto na tela é o único canal — nunca escondê-lo. */}
          {!ttsEnabled && assistantText ? (
            <Text style={styles.assistantText}>{assistantText}</Text>
          ) : null}

          {state === "listening" ? (
            <Text style={styles.hint}>{t("entrevistaVoz.confirmHint")}</Text>
          ) : null}

          {failuresRef.current >= MAX_CONSECUTIVE_FAILURES ? (
            <Pressable onPress={goToText} hitSlop={8} style={styles.switchBtn}>
              <Text style={styles.switchText}>{t("entrevistaVoz.switchToText")}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => void onToggleSpeaker()}
            style={({ pressed }) => [styles.ctrl, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t(
              ttsEnabled ? "entrevistaVoz.a11yMute" : "entrevistaVoz.a11yUnmute",
            )}
          >
            {ttsEnabled ? (
              <SpeakerHighIcon size={26} color="#fff" weight="fill" />
            ) : (
              <SpeakerSlashIcon size={26} color="#fff" weight="fill" />
            )}
          </Pressable>

          <Pressable
            onPress={() => void onTogglePause()}
            disabled={busy}
            style={({ pressed }) => [
              styles.ctrl,
              busy && styles.ctrlDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={t(
              state === "paused" ? "entrevistaVoz.a11yResume" : "entrevistaVoz.a11yPause",
            )}
          >
            {state === "paused" ? (
              <PlayIcon size={26} color="#fff" weight="fill" />
            ) : (
              <PauseIcon size={26} color="#fff" weight="fill" />
            )}
          </Pressable>

          <Pressable
            onPress={() => void onConfirm()}
            disabled={busy}
            style={({ pressed }) => [
              styles.ctrl,
              styles.ctrlPrimary,
              busy && styles.ctrlDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={t("entrevistaVoz.a11yConfirm")}
          >
            <CheckIcon size={26} color="#fff" weight="bold" />
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  micBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CTRL_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  stateLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  assistantText: {
    color: BODY_COLOR,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  hint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    textAlign: "center",
  },
  switchBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  switchText: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  ctrl: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: CTRL_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlPrimary: {
    backgroundColor: ACCENT,
  },
  ctrlDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.88,
  },
});
