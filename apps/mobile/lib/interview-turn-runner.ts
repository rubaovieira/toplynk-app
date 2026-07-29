import type { TFunction } from "i18next";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getApiBaseUrl } from "@/lib/api-config";
import { runInterviewTurn } from "@/lib/entrevista-api";
import {
  validateInterviewFase1,
  type InterviewApiMessage,
  type InterviewTurnResult,
} from "@/lib/entrevista-chat-openai";
import {
  saveEntrevistaFase1,
  saveEntrevistaFase2,
} from "@/lib/entrevista-storage";
import { setInterviewStatus } from "@/lib/interview-status";
import { getSetupUserId } from "@/lib/setup-user-session";
import { patchUserProfile } from "@/lib/users-api";

/**
 * Motor da entrevista, sem UI.
 *
 * Existe porque as telas de texto e de voz precisam do MESMO caminho de
 * conclusão (validação → persistência local → sync no servidor → status).
 * Duplicar isso significaria duas definições de "entrevista completa".
 */

export type InterviewTurnRunnerCallbacks = {
  /** Resposta do assistente pronta para exibir/falar. */
  onAssistant: (text: string, turn: InterviewTurnResult) => void;
  onProgress?: (percent: number) => void;
  /** Só dispara após fase1 válida e persistida. */
  onComplete?: () => void;
  /** Mensagem já traduzida e pronta para o usuário. */
  onError?: (userMessage: string) => void;
  /** Sem `EXPO_PUBLIC_API_URL` configurada. */
  onMissingApiUrl?: () => void;
};

export function mapInterviewErrorToUserMessage(err: unknown, t: TFunction): string {
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
  if (/504|gateway timeout|tempo esgotado|timeout/i.test(m)) {
    return t("entrevistaIa.chatError504");
  }
  if (/502|bad gateway|OpenAI HTTP/i.test(m)) {
    return t("entrevistaIa.chatError502");
  }
  if (/failed to fetch|network request failed|load failed|network error/i.test(m)) {
    return t("entrevistaIa.chatErrorNetwork");
  }
  if (m.length > 0 && m.length < 280) return m;
  return t("entrevistaIa.chatErrorApi");
}

export function useInterviewTurnRunner(cb: InterviewTurnRunnerCallbacks) {
  const { t, i18n } = useTranslation();
  const threadRef = useRef<InterviewApiMessage[]>([]);
  const bootedRef = useRef(false);
  const progressRef = useRef(0);
  const turnsRef = useRef(0);

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const cbRef = useRef(cb);
  cbRef.current = cb;

  /**
   * A thread reenviada carrega só `assistant_message`, então o modelo não
   * enxerga o `progress` que ele mesmo reportou antes e às vezes regride.
   * O piso por turno garante que a barra sempre ande, mesmo se vier `null`.
   */
  const applyProgress = useCallback((next: number | null) => {
    turnsRef.current += 1;
    const floor = Math.min(90, turnsRef.current * 8);
    const value = Math.max(progressRef.current, floor, next ?? 0);
    if (value !== progressRef.current) {
      progressRef.current = value;
      cbRef.current.onProgress?.(value);
    }
  }, []);

  const persistComplete = useCallback(async (r: InterviewTurnResult) => {
    if (!r.fase1 || !validateInterviewFase1(r.fase1)) return false;
    const fase1 = {
      primaryGoals: r.fase1.primaryGoals,
      professionalMoment: r.fase1.professionalMoment,
      mainArea: r.fase1.mainArea.trim(),
      workPreference: r.fase1.workPreference,
      searchRadius: r.fase1.searchRadius,
    };
    const f2 = r.fase2_items ?? [];

    try {
      await saveEntrevistaFase1(fase1);
    } catch {
      /* cache local é opcional */
    }
    try {
      await saveEntrevistaFase2(f2);
    } catch {
      /* cache local é opcional */
    }

    const baseUrl = getApiBaseUrl();
    const uid = await getSetupUserId();
    if (baseUrl && uid) {
      try {
        await patchUserProfile(baseUrl, uid, {
          interviewFase1: fase1,
          interviewFase2Items: f2.map((item) => ({
            questionId: item.questionId,
            question: item.question,
            tipo: item.tipo,
            answer: item.answer,
          })),
        });
      } catch {
        /* sync opcional: token expirado, offline, etc. */
      }
    }
    await setInterviewStatus("completed");
    return true;
  }, []);

  const handleResult = useCallback(
    async (r: InterviewTurnResult) => {
      applyProgress(r.progress ?? null);
      if (!r.interview_complete || !r.fase1) return;
      // fase1 semanticamente inválida: seguir conversando. Deliberadamente
      // NÃO empurramos nada para threadRef — o modelo já tem o contexto.
      if (!validateInterviewFase1(r.fase1)) return;
      if (await persistComplete(r)) {
        setDone(true);
        cbRef.current.onComplete?.();
      }
    },
    [applyProgress, persistComplete],
  );

  const runTurn = useCallback(
    async (speak: boolean) => {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        cbRef.current.onMissingApiUrl?.();
        return;
      }
      setRunning(true);
      try {
        const r = await runInterviewTurn({
          baseUrl,
          locale: i18n.language,
          messages: threadRef.current,
          speak,
        });
        threadRef.current.push({ role: "assistant", content: r.assistant_message });
        cbRef.current.onAssistant(r.assistant_message, r);
        await handleResult(r);
      } catch (e) {
        // Erro vai para a UI e o toast, NUNCA para threadRef: empurrar o texto
        // de erro para o histórico faz o modelo tratá-lo como fala própria.
        cbRef.current.onError?.(mapInterviewErrorToUserMessage(e, t));
      } finally {
        setRunning(false);
      }
    },
    [handleResult, i18n.language, t],
  );

  /** Primeiro turno. Idempotente: chamadas repetidas são ignoradas. */
  const boot = useCallback(
    async (speak = false) => {
      if (bootedRef.current) return;
      bootedRef.current = true;
      threadRef.current = [{ role: "user", content: "[START]" }];
      await runTurn(speak);
    },
    [runTurn],
  );

  const sendUserText = useCallback(
    async (text: string, speak = false) => {
      const trimmed = text.trim();
      if (!trimmed || done) return;
      threadRef.current.push({ role: "user", content: trimmed });
      await runTurn(speak);
    },
    [done, runTurn],
  );

  return { boot, sendUserText, running, done, progress: progressRef.current };
}
