import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

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
