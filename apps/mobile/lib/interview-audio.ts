import { Directory, File, Paths } from "expo-file-system";
import { RecordingPresets, type RecordingOptions } from "expo-audio";

/**
 * O Whisper reamostra para 16 kHz mono internamente, então 44.1 kHz estéreo é
 * 4x os bytes sem ganho de precisão. A 32 kbps, 60s de fala dão ~240 KB
 * (~320 KB em base64) — 2,6% do limite de 12 MB do corpo JSON da API.
 *
 * Espalhamos o preset em vez de escrever os enums aninhados de
 * `android.outputFormat`/`ios.audioQuality` à mão: o preset já entrega
 * AAC em container .m4a nas duas plataformas.
 */
export const INTERVIEW_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  // Precisa ser passado tanto no useAudioRecorder quanto no
  // prepareToRecordAsync — só no primeiro, `metering` fica sempre undefined.
  isMeteringEnabled: true,
};

export const INTERVIEW_AUDIO_MIME = "audio/m4a";

/** Teto de segurança por fala; o servidor aceita bem mais. */
export const MAX_UTTERANCE_MS = 120_000;

/** Abaixo disto é toque acidental — não vale gastar um round trip. */
export const MIN_UTTERANCE_BYTES = 2048;
export const MIN_UTTERANCE_MS = 400;

/** dBFS → 0..1 para a waveform. Silêncio fica perto de -60. */
export function meteringToLevel(db: number | undefined): number {
  if (typeof db !== "number" || !Number.isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

export type RecordingCheck =
  | { ok: true; base64: string }
  | { ok: false; reason: "empty" | "unreadable" };

/**
 * Lê a gravação como base64 puro (sem prefixo `data:` — ao contrário de
 * `encode-setup-photos.ts`, que monta data URL para as fotos).
 */
export async function readRecordingAsBase64(
  uri: string | null,
  durationMs: number,
): Promise<RecordingCheck> {
  if (!uri) return { ok: false, reason: "empty" };
  try {
    const file = new File(uri);
    const size = file.size ?? 0;
    if (size < MIN_UTTERANCE_BYTES || durationMs < MIN_UTTERANCE_MS) {
      return { ok: false, reason: "empty" };
    }
    return { ok: true, base64: await file.base64() };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

const TTS_DIR_NAME = "interview-tts";

/** Grava o mp3 do assistente em cache e devolve o uri para o player. */
export function writeTtsToCacheFile(base64: string, turnId: number): string | null {
  try {
    const dir = new Directory(Paths.cache, TTS_DIR_NAME);
    if (!dir.exists) dir.create({ intermediates: true });
    const file = new File(dir, `turn-${turnId}.mp3`);
    if (file.exists) file.delete();
    file.create();
    file.write(base64, { encoding: "base64" });
    return file.uri;
  } catch {
    return null;
  }
}

/** Limpa os mp3 da entrevista ao sair da tela. */
export function cleanupInterviewAudioCache(): void {
  try {
    const dir = new Directory(Paths.cache, TTS_DIR_NAME);
    if (dir.exists) dir.delete();
  } catch {
    /* cache: falha aqui não afeta o usuário */
  }
}
