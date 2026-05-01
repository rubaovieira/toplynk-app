import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@toplynk/entrevista_fase1';

/** Respostas da Fase 1 (perguntas base do doc. de arquitetura). */
export type EntrevistaFase1Answers = {
  primaryGoals: string[];
  professionalMoment: string;
  mainArea: string;
  workPreference: string;
  searchRadius: string;
  completedAt: string;
};

export async function saveEntrevistaFase1(answers: Omit<EntrevistaFase1Answers, 'completedAt'>): Promise<void> {
  const payload: EntrevistaFase1Answers = {
    ...answers,
    completedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function getEntrevistaFase1(): Promise<EntrevistaFase1Answers | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EntrevistaFase1Answers;
  } catch {
    return null;
  }
}

const KEY_F2 = '@toplynk/entrevista_fase2';

export type EntrevistaFase2AnswerItem = {
  questionId: string;
  question: string;
  tipo: string;
  answer: string | string[];
};

/** Respostas da Fase 2 (perguntas geradas pela IA). */
export type EntrevistaFase2Stored = {
  items: EntrevistaFase2AnswerItem[];
  completedAt: string;
};

export async function saveEntrevistaFase2(items: EntrevistaFase2AnswerItem[]): Promise<void> {
  const payload: EntrevistaFase2Stored = {
    items,
    completedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY_F2, JSON.stringify(payload));
}

export async function getEntrevistaFase2(): Promise<EntrevistaFase2Stored | null> {
  const raw = await AsyncStorage.getItem(KEY_F2);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EntrevistaFase2Stored;
  } catch {
    return null;
  }
}
