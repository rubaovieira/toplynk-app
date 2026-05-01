import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

@Injectable()
export class EmbeddingsService {
  private readonly log = new Logger(EmbeddingsService.name);
  private readonly lastSourceHash = new Map<string, string>();

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /** Texto canónico para embedding (bio, entrevista, áreas, interesses). */
  profileTextFromSetup(setup: Record<string, unknown> | null): string {
    if (!setup || typeof setup !== 'object') return '';
    const parts: string[] = [];
    const str = (k: string) => {
      const v = setup[k];
      return typeof v === 'string' && v.trim() ? v.trim() : '';
    };
    const join = (k: string) => {
      const v = setup[k];
      if (Array.isArray(v) && v.length) parts.push(`${k}: ${v.filter((x) => typeof x === 'string').join(', ')}`);
    };

    parts.push(str('roleTitle'), str('company'), str('bio'), str('primaryGoal'));
    join('activityAreaIds');
    join('interestIds');
    if (setup.interviewFase1 && typeof setup.interviewFase1 === 'object') {
      parts.push(`interview_fase1: ${JSON.stringify(setup.interviewFase1)}`);
    }
    if (Array.isArray(setup.interviewFase2Items) && setup.interviewFase2Items.length) {
      parts.push(`interview_fase2: ${JSON.stringify(setup.interviewFase2Items).slice(0, 12000)}`);
    }
    return parts.filter(Boolean).join('\n').slice(0, 24000);
  }

  async tryRefreshEmbeddingForUser(userId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) return;

    const text = this.profileTextFromSetup(
      user.setupProfile && typeof user.setupProfile === 'object' && !Array.isArray(user.setupProfile)
        ? (user.setupProfile as Record<string, unknown>)
        : null,
    );
    if (text.length < 12) {
      this.log.debug(`Skip embedding for ${userId}: text too short`);
      return;
    }

    const hash = createHash('sha256').update(text).digest('hex');
    if (this.lastSourceHash.get(userId) === hash) {
      return;
    }

    const key = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!key) {
      this.log.warn('OPENAI_API_KEY missing — skip embedding refresh');
      return;
    }

    const embedding = await this.fetchOpenAiEmbedding(key, text);
    if (!embedding || embedding.length !== EMBEDDING_DIM) {
      this.log.warn(`Invalid embedding length for user ${userId}`);
      return;
    }

    const literal = `[${embedding.join(',')}]`;
    await this.users.query(
      `UPDATE users SET profile_embedding = $1::vector, embedding_updated_at = NOW() WHERE id = $2::uuid`,
      [literal, userId],
    );
    this.lastSourceHash.set(userId, hash);
    this.log.debug(`Updated embedding for user ${userId}`);
  }

  private async fetchOpenAiEmbedding(apiKey: string, input: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input,
        dimensions: EMBEDDING_DIM,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      this.log.warn(`OpenAI embeddings HTTP ${res.status}: ${t.slice(0, 200)}`);
      return [];
    }
    const json = (await res.json()) as {
      data?: { embedding?: number[] }[];
    };
    const emb = json.data?.[0]?.embedding;
    return Array.isArray(emb) ? emb : [];
  }
}
