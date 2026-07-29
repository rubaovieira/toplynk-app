import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  fetchOpenAi,
  openAiErrorDetail,
  readOpenAiAuth,
  readTimeoutMs,
} from './openai-fetch.util';

const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const SPEECH_URL = 'https://api.openai.com/v1/audio/speech';

/** A OpenAI infere o container pela extensão do filename no multipart. */
const EXT_BY_MIME: Record<string, string> = {
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
};

/** `input` do TTS é cobrado por caractere; uma resposta fugida viraria um monólogo. */
const TTS_MAX_INPUT_CHARS = 1200;

/** `pt-BR` → `pt`: a API de transcrição espera ISO-639-1. */
function toIso639(locale: string): string {
  return locale.slice(0, 2).toLowerCase();
}

@Injectable()
export class InterviewAudioService {
  private readonly logger = new Logger(InterviewAudioService.name);

  constructor(private readonly config: ConfigService) {}

  /** Áudio (base64 puro, sem prefixo `data:`) → texto. */
  async transcribe(audioBase64: string, mimeType: string, locale: string): Promise<string> {
    const bytes = Buffer.from(audioBase64, 'base64');
    if (bytes.byteLength === 0) {
      throw new BadRequestException('Áudio vazio ou base64 inválido.');
    }

    const { headers } = readOpenAiAuth(this.config);
    const model =
      this.config.get<string>('OPENAI_TRANSCRIBE_MODEL')?.trim() ||
      'gpt-4o-mini-transcribe';
    const timeoutMs = readTimeoutMs(this.config, 'OPENAI_TRANSCRIBE_TIMEOUT_MS', 30000);

    const ext = EXT_BY_MIME[mimeType] ?? 'm4a';
    const form = new FormData();
    // O terceiro argumento (filename) é semântico: sem ele, ou com extensão
    // errada, a OpenAI responde "Invalid file format".
    form.append('file', new Blob([new Uint8Array(bytes)], { type: mimeType }), `audio.${ext}`);
    form.append('model', model);
    form.append('response_format', 'json');
    form.append('language', toIso639(locale));

    // Sem `Content-Type` manual: o undici calcula o boundary do multipart.
    const res = await fetchOpenAi(
      TRANSCRIBE_URL,
      { method: 'POST', headers, body: form },
      timeoutMs,
      'transcrição',
    );

    if (!res.ok) {
      throw new BadGatewayException(
        (await openAiErrorDetail(res)) || `OpenAI HTTP ${res.status}`,
      );
    }

    const data = (await res.json()) as { text?: unknown };
    return typeof data.text === 'string' ? data.text.trim() : '';
  }

  /**
   * Texto → mp3 em base64.
   *
   * Devolve `null` em qualquer falha: o turno da entrevista já foi pago e é
   * válido sem áudio, então um problema de TTS nunca pode derrubá-lo. O
   * cliente cai para texto na tela.
   */
  async synthesize(text: string, voice: string | undefined, budgetMs: number): Promise<string | null> {
    const input = text.trim().slice(0, TTS_MAX_INPUT_CHARS);
    if (!input) return null;

    try {
      const { headers } = readOpenAiAuth(this.config);
      const model = this.config.get<string>('OPENAI_TTS_MODEL')?.trim() || 'gpt-4o-mini-tts';
      const selectedVoice =
        voice?.trim() || this.config.get<string>('OPENAI_TTS_VOICE')?.trim() || 'nova';
      const configured = readTimeoutMs(this.config, 'OPENAI_TTS_TIMEOUT_MS', 20000);
      const timeoutMs = Math.min(configured, budgetMs);

      const res = await fetchOpenAi(
        SPEECH_URL,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            voice: selectedVoice,
            input,
            response_format: 'mp3',
          }),
        },
        timeoutMs,
        'síntese de voz',
      );

      if (!res.ok) {
        this.logger.warn(`TTS falhou (HTTP ${res.status}): ${await openAiErrorDetail(res)}`);
        return null;
      }

      const audio = Buffer.from(await res.arrayBuffer());
      if (audio.byteLength === 0) {
        this.logger.warn('TTS devolveu corpo vazio.');
        return null;
      }
      return audio.toString('base64');
    } catch (e) {
      this.logger.warn(`TTS indisponível: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
}
