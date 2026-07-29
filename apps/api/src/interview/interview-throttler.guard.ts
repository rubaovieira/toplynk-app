import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

type MaybeAuthedRequest = {
  user?: { sub?: string };
  ip?: string;
};

/**
 * Contabiliza o limite por usuário quando há JWT, caindo para o IP só quando
 * não há. Sem isto, todo mundo atrás de um NAT de operadora divide o mesmo
 * balde e um usuário legítimo derruba os outros.
 */
@Injectable()
export class InterviewThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: MaybeAuthedRequest): Promise<string> {
    return req.user?.sub ?? req.ip ?? 'unknown';
  }
}
