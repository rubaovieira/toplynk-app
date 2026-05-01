import { apiJsonHeaders, apiJsonHeadersPublic } from '@/lib/api-headers';
import i18n from '@/lib/i18n';
import { setAccessToken } from '@/lib/auth-storage';
import type { MatchProfile } from '@/lib/match-demo-deck';

export type CreateUserPayload = {
  email: string;
  displayName: string;
  username?: string;
  password: string;
};

export type CreateUserResponse = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

export type LoginResponse = {
  accessToken: string;
  user: { id: string; email: string; displayName: string };
};

export type InterviewFase1Patch = {
  primaryGoals: string[];
  professionalMoment: string;
  mainArea: string;
  workPreference: string;
  searchRadius: string;
};

export type InterviewFase2ItemPatch = {
  questionId: string;
  question: string;
  tipo: string;
  answer: string | string[];
};

/** `GET /users/:id/public` — sem e-mail. */
export type PublicProfileResponse = {
  id: string;
  name: string;
  headline: string;
  tagline: string;
  photoSeeds: string[];
  bio?: string;
  activityAreaIds?: string[];
  interestIds?: string[];
  cityLabel?: string;
  /** ISO 8601 da última atividade do utilizador (login / heartbeat). */
  lastSeenAt?: string | null;
};

export function publicProfileToMatchProfile(
  data: PublicProfileResponse,
  languageKey: 'pt' | 'en' | 'es',
): MatchProfile {
  return {
    id: data.id,
    name: data.name,
    headline: data.headline,
    tagline: data.tagline,
    photoSeeds: Array.isArray(data.photoSeeds) ? data.photoSeeds : [],
    distanceKm: 0,
    compatibility: 0,
    languageKey,
    bio: typeof data.bio === 'string' && data.bio.trim() ? data.bio.trim() : undefined,
    activityAreaIds: Array.isArray(data.activityAreaIds) && data.activityAreaIds.length ? [...data.activityAreaIds] : undefined,
    interestIds: Array.isArray(data.interestIds) && data.interestIds.length ? [...data.interestIds] : undefined,
    cityLabel: typeof data.cityLabel === 'string' && data.cityLabel.trim() ? data.cityLabel.trim() : undefined,
  };
}

/** `GET /users/:id/profile-fields` — só o próprio utilizador; campos atuais do setup para edição. */
export type ProfileEditFieldsResponse = {
  username: string;
  roleTitle: string;
  company: string;
  bio: string;
  cityLabel: string;
};

export async function fetchProfileEditFields(
  baseUrl: string,
  userId: string,
): Promise<ProfileEditFieldsResponse> {
  const res = await fetch(
    `${baseUrl.replace(/\/$/, '')}/users/${encodeURIComponent(userId)}/profile-fields`,
    {
      method: 'GET',
      headers: await apiJsonHeaders(),
    },
  );
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }
  const data = JSON.parse(raw) as ProfileEditFieldsResponse;
  if (typeof data !== 'object' || data == null) {
    throw new Error(i18n.t('errors.invalidEditFieldsResponse'));
  }
  return {
    username: typeof data.username === 'string' ? data.username : '',
    roleTitle: typeof data.roleTitle === 'string' ? data.roleTitle : '',
    company: typeof data.company === 'string' ? data.company : '',
    bio: typeof data.bio === 'string' ? data.bio : '',
    cityLabel: typeof data.cityLabel === 'string' ? data.cityLabel : '',
  };
}

export async function fetchUserPublicProfile(baseUrl: string, userId: string): Promise<PublicProfileResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/users/${encodeURIComponent(userId)}/public`, {
    method: 'GET',
    headers: await apiJsonHeaders(),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }
  const data = JSON.parse(raw) as PublicProfileResponse;
  if (typeof data?.id !== 'string' || typeof data?.name !== 'string') {
    throw new Error(i18n.t('errors.invalidPublicProfileResponse'));
  }
  return data;
}

/** Atualiza o teu `last_seen_at` no servidor (para outros verem “online”). */
export async function postMyPresence(baseUrl: string): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, '')}/users/me/presence`;
  const res = await fetch(url, {
    method: 'POST',
    headers: await apiJsonHeaders(),
    body: '{}',
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(nestErrorMessage(res, raw));
  }
}

export type UserProfilePatch = {
  username?: string;
  roleTitle?: string;
  company?: string;
  activityAreaIds?: string[];
  bio?: string;
  interestIds?: string[];
  primaryGoal?: string;
  photosBase64?: string[];
  latitude?: number;
  longitude?: number;
  cityLabel?: string;
  interviewFase1?: InterviewFase1Patch;
  interviewFase2Items?: InterviewFase2ItemPatch[];
};

export class CreateUserConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreateUserConflictError';
  }
}

function nestErrorMessage(res: Response, bodyText: string): string {
  try {
    const j: unknown = JSON.parse(bodyText);
    if (j && typeof j === 'object' && 'message' in j) {
      const m = (j as { message: unknown }).message;
      if (typeof m === 'string') return m.trim();
      if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join(', ').trim();
    }
  } catch {
    /* ignore */
  }
  return bodyText.trim().slice(0, 200) || `HTTP ${res.status}`;
}

export async function createUser(baseUrl: string, body: CreateUserPayload): Promise<CreateUserResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/users`, {
    method: 'POST',
    headers: apiJsonHeadersPublic(),
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      displayName: body.displayName.trim(),
      password: body.password,
      ...(body.username !== undefined && body.username.trim() !== ''
        ? { username: body.username.trim() }
        : {}),
    }),
  });

  const raw = await res.text();

  if (res.status === 409) {
    let msg = '';
    try {
      const j: unknown = JSON.parse(raw);
      if (j && typeof j === 'object' && 'message' in j && typeof (j as { message: unknown }).message === 'string') {
        msg = (j as { message: string }).message.trim();
      }
    } catch {
      /* ignore */
    }
    throw new CreateUserConflictError(msg || 'E-mail já cadastrado');
  }

  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }

  const data = JSON.parse(raw) as CreateUserResponse;
  if (typeof data?.id !== 'string') {
    throw new Error(i18n.t('errors.invalidCreateUserResponse'));
  }
  return data;
}

export async function loginUser(baseUrl: string, email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: apiJsonHeadersPublic(),
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }
  const data = JSON.parse(raw) as LoginResponse;
  if (typeof data?.accessToken !== 'string' || typeof data?.user?.id !== 'string') {
    throw new Error(i18n.t('errors.invalidLoginResponse'));
  }
  await setAccessToken(data.accessToken);
  return data;
}

export async function patchUserProfile(
  baseUrl: string,
  userId: string,
  patch: UserProfilePatch,
): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/users/${encodeURIComponent(userId)}/profile`, {
    method: 'PATCH',
    headers: await apiJsonHeaders(),
    body: JSON.stringify(patch),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(nestErrorMessage(res, raw));
  }
}
