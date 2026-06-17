import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { AuthUserPayload } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ProfileEditFieldsDto } from './dto/profile-edit-fields.dto';
import { PublicProfileDto } from './dto/public-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Post('me/presence')
  @UseGuards(AuthGuard('jwt'))
  touchPresence(@Req() req: Request & { user: AuthUserPayload }): Promise<{ ok: true }> {
    return this.usersService.touchLastSeen(req.user.sub).then(() => ({ ok: true as const }));
  }

  /** Apagar a própria conta (Guideline 5.1.1(v)). Irreversível. */
  @Delete('me')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  deleteMe(@Req() req: Request & { user: AuthUserPayload }): Promise<{ ok: true }> {
    return this.usersService.deleteOwnAccount(req.user.sub);
  }

  @Get(':id/public')
  @UseGuards(AuthGuard('jwt'))
  findPublic(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<PublicProfileDto> {
    return this.usersService.findPublicProfile(id);
  }

  @Get(':id/profile-fields')
  @UseGuards(AuthGuard('jwt'))
  getProfileFields(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: Request & { user: AuthUserPayload },
  ): Promise<ProfileEditFieldsDto> {
    if (req.user.sub !== id) {
      throw new ForbiddenException('Não podes ver os dados de edição de outro utilizador');
    }
    return this.usersService.getProfileEditFieldsForOwner(id);
  }

  @Patch(':id/profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserProfileDto,
    @Req() req: Request & { user: AuthUserPayload },
  ): Promise<UserResponseDto> {
    if (req.user.sub !== id) {
      throw new ForbiddenException('Não podes alterar o perfil de outro utilizador');
    }
    return this.usersService.updateProfile(id, dto);
  }
}
