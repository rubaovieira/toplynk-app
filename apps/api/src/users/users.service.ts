import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

import { EmbeddingsService } from '../embeddings/embeddings.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ProfileEditFieldsDto } from './dto/profile-edit-fields.dto';
import { PublicProfileDto } from './dto/public-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './user.entity';
import {
  bioFullFromSetup,
  cityLabelFromSetup,
  headlineTaglineFromSetup,
  pickPhotoRefsFromSetup,
  stringIdsFromSetup,
} from './public-profile.mapper';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.users.exist({ where: { email } });
    if (exists) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const setupProfile =
      dto.username !== undefined && String(dto.username).trim() !== ''
        ? { username: String(dto.username).trim() }
        : null;
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const row = this.users.create({
      email,
      displayName: dto.displayName.trim(),
      setupProfile,
      passwordHash,
      // O cadastro no app só chega aqui após aceitar o EULA/Termos (Guideline 1.2).
      eulaAcceptedAt: new Date(),
    });
    const saved = await this.users.save(row);
    void this.embeddings.tryRefreshEmbeddingForUser(saved.id).catch(() => undefined);
    return this.toResponse(saved);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const rows = await this.users.find({ order: { createdAt: 'DESC' } });
    return rows.map((r) => this.toResponse(r));
  }

  async getProfileEditFieldsForOwner(id: string): Promise<ProfileEditFieldsDto> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    const sp =
      user.setupProfile && typeof user.setupProfile === 'object' && !Array.isArray(user.setupProfile)
        ? (user.setupProfile as Record<string, unknown>)
        : undefined;
    const pick = (key: string): string => {
      const v = sp?.[key];
      return typeof v === 'string' ? v : '';
    };
    return plainToInstance(
      ProfileEditFieldsDto,
      {
        username: pick('username').trim(),
        roleTitle: pick('roleTitle').trim(),
        company: pick('company').trim(),
        bio: pick('bio').trim(),
        cityLabel: pick('cityLabel').trim(),
      },
      { excludeExtraneousValues: true },
    );
  }

  async findPublicProfile(id: string): Promise<PublicProfileDto> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    const sp =
      user.setupProfile && typeof user.setupProfile === 'object' && !Array.isArray(user.setupProfile)
        ? (user.setupProfile as Record<string, unknown>)
        : undefined;
    const { headline, tagline } = headlineTaglineFromSetup(sp, user.displayName);
    return plainToInstance(
      PublicProfileDto,
      {
        id: user.id,
        name: user.displayName,
        headline,
        tagline,
        photoSeeds: pickPhotoRefsFromSetup(sp, user.id),
        bio: bioFullFromSetup(sp),
        activityAreaIds: stringIdsFromSetup(sp, 'activityAreaIds'),
        interestIds: stringIdsFromSetup(sp, 'interestIds'),
        cityLabel: cityLabelFromSetup(sp),
        lastSeenAt: user.lastSeenAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  async touchLastSeen(userId: string): Promise<void> {
    await this.users
      .createQueryBuilder()
      .update(User)
      .set({ lastSeenAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :id', { id: userId })
      .execute();
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto): Promise<UserResponseDto> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    const prev =
      user.setupProfile && typeof user.setupProfile === 'object' && !Array.isArray(user.setupProfile)
        ? { ...(user.setupProfile as Record<string, unknown>) }
        : {};
    const merged: Record<string, unknown> = { ...prev };
    for (const [key, val] of Object.entries(dto) as [string, unknown][]) {
      if (val !== undefined) {
        merged[key] = val;
      }
    }
    user.setupProfile = merged;
    const saved = await this.users.save(user);
    void this.embeddings.tryRefreshEmbeddingForUser(saved.id).catch(() => undefined);
    return this.toResponse(saved);
  }

  /**
   * Apagar conta (Guideline 5.1.1(v)): remove o conteúdo pessoal e anonimiza o registo,
   * mantendo a linha apenas para integridade referencial (ex.: denúncias). Login fica vedado
   * por `deleted_at`. É irreversível.
   */
  async deleteOwnAccount(userId: string): Promise<{ ok: true }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query(
        `DELETE FROM "messages" WHERE "conversation_id" IN (SELECT "id" FROM "conversations" WHERE "user_a_id" = $1 OR "user_b_id" = $1)`,
        [userId],
      );
      await qr.query(`DELETE FROM "conversations" WHERE "user_a_id" = $1 OR "user_b_id" = $1`, [userId]);
      await qr.query(`DELETE FROM "discovery_swipes" WHERE "viewer_id" = $1 OR "peer_id" = $1`, [userId]);
      await qr.query(`DELETE FROM "discovery_incoming" WHERE "recipient_id" = $1 OR "actor_id" = $1`, [userId]);
      await qr.query(`DELETE FROM "app_notifications" WHERE "user_id" = $1`, [userId]);
      await qr.query(`DELETE FROM "device_tokens" WHERE "user_id" = $1`, [userId]);
      await qr.query(`DELETE FROM "user_blocks" WHERE "blocker_id" = $1 OR "blocked_id" = $1`, [userId]);

      await qr.query(
        `UPDATE "users" SET
          "email" = 'deleted-' || "id"::text || '@deleted.toplynk.app',
          "display_name" = 'Conta removida',
          "password_hash" = NULL,
          "setup_profile" = NULL,
          "last_seen_at" = NULL,
          "embedding_updated_at" = NULL,
          "push_notify_messages" = false,
          "push_notify_social" = false,
          "deleted_at" = now()
         WHERE "id" = $1`,
        [userId],
      );

      // profile_embedding (pgvector) é opcional consoante o ambiente.
      const hasEmb: Array<{ exists: boolean }> = await qr.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_embedding') AS "exists"`,
      );
      if (hasEmb?.[0]?.exists) {
        await qr.query(`UPDATE "users" SET "profile_embedding" = NULL WHERE "id" = $1`, [userId]);
      }

      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }

    return { ok: true };
  }

  private toResponse(user: User): UserResponseDto {
    return plainToInstance(
      UserResponseDto,
      {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      { excludeExtraneousValues: true },
    );
  }
}
