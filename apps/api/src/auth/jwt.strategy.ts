import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { type AuthUserPayload } from './auth.service';
import { resolveJwtSecret } from './jwt-secret.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    });
  }

  validate(payload: { sub?: string; email?: string }): AuthUserPayload {
    if (!payload?.sub || typeof payload.email !== 'string') {
      throw new UnauthorizedException();
    }
    return { sub: payload.sub, email: payload.email };
  }
}
