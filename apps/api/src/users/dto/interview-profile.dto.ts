import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const GOAL_IDS = [
  'find_clients',
  'hire_professionals',
  'strategic_partnerships',
  'investment_for_business',
  'invest_in_startups',
  'networking_general',
] as const;

const MOMENT_IDS = ['starting', 'growing', 'consolidated', 'transition'] as const;
const WORK_IDS = ['in_person', 'remote', 'hybrid'] as const;
const RADIUS_IDS = ['radius_2km', 'radius_5km', 'radius_10km', 'radius_50km', 'radius_any'] as const;

export class InterviewFase1Dto {
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @IsIn(GOAL_IDS, { each: true })
  primaryGoals!: string[];

  @IsString()
  @IsIn([...MOMENT_IDS])
  professionalMoment!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(400)
  mainArea!: string;

  @IsString()
  @IsIn([...WORK_IDS])
  workPreference!: string;

  @IsString()
  @IsIn([...RADIUS_IDS])
  searchRadius!: string;
}

export class InterviewFase2ItemDto {
  @IsString()
  @MaxLength(64)
  questionId!: string;

  @IsString()
  @MaxLength(2000)
  question!: string;

  @IsString()
  @MaxLength(64)
  tipo!: string;

  /** Resposta livre (texto ou lista de bullets). */
  @IsOptional()
  @Allow()
  answer?: string | string[];
}
