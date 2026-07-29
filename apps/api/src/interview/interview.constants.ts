/** Vozes suportadas pelo endpoint `/v1/audio/speech` da OpenAI. */
export const TTS_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'verse',
] as const;

/** Containers de áudio aceitos na transcrição, alinhados ao que o mobile grava. */
export const AUDIO_MIME_TYPES = [
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
] as const;

/**
 * ~3 MB de áudio decodificado (≈12 min a 32 kbps mono).
 * Folgado para uma fala legítima, hostil para abuso — bem abaixo do limite
 * de 12 MB do corpo JSON configurado em `main.ts`.
 */
export const MAX_AUDIO_BASE64_CHARS = 4_000_000;
