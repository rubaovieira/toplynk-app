import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

export type AuthUserPayload = { sub: string; email: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{
    accessToken: string;
    user: { id: string; email: string; displayName: string };
  }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = :email', { email: normalized })
      .getOne();

    if (!user?.passwordHash || user.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.users
      .createQueryBuilder()
      .update(User)
      .set({ lastSeenAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :id', { id: user.id })
      .execute();

    const accessToken = this.signToken({ sub: user.id, email: user.email });
    return {
      accessToken,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  signToken(payload: AuthUserPayload): string {
    return this.jwt.sign(payload);
  }
}
