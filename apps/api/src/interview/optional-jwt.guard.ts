import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

/**
 * Exige JWT apenas quando `INTERVIEW_REQUIRE_AUTH=true`.
 *
 * Existe por causa do `runtimeVersion.policy: "fingerprint"`: os apps já
 * instalados chamam `/interview/turn` sem Bearer, então ligar a guarda antes
 * da adoção do binário novo quebraria a entrevista deles. O kill-switch por
 * env permite ligar e reverter sem release mobile.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (this.config.get<string>('INTERVIEW_REQUIRE_AUTH')?.trim() !== 'true') {
      return true;
    }
    return super.canActivate(context);
  }
}
