import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { InterviewFase1Dto, InterviewFase2ItemDto } from './interview-profile.dto';

/** Campos opcionais — enviar só o que cada step do cadastro recolhe. */
export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  activityAreaIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interestIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  primaryGoal?: string;

  /** Até 4 imagens em data URL ou base64 puro (MVP). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(9000000, { each: true })
  photosBase64?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cityLabel?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InterviewFase1Dto)
  interviewFase1?: InterviewFase1Dto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(48)
  @ValidateNested({ each: true })
  @Type(() => InterviewFase2ItemDto)
  interviewFase2Items?: InterviewFase2ItemDto[];
}
