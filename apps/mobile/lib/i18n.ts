import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import pt from '@/locales/pt.json';

export const LOCALE_STORAGE_KEY = '@toplynk/locale';

export const SUPPORTED_LOCALES = ['pt', 'en', 'es'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** Bandeiras exibidas ao lado do nome do idioma no seletor. */
export const LOCALE_FLAGS: Record<AppLocale, string> = {
  pt: '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸',
};

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: 'pt',
  fallbackLng: 'pt',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
});

function inferDeviceLocale(): AppLocale {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase() ?? 'pt';
  if (code.startsWith('en')) return 'en';
  if (code.startsWith('es')) return 'es';
  return 'pt';
}

/** Normaliza `i18n.language` para locale da app (perfil, discovery, API auxiliar). */
export function localeFromI18nLanguage(lng: string | undefined): AppLocale {
  const code = (lng ?? 'pt').toLowerCase();
  if (code.startsWith('en')) return 'en';
  if (code.startsWith('es')) return 'es';
  return 'pt';
}

export async function hydrateLocaleFromStorage(): Promise<void> {
  const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
  const lng: AppLocale =
    stored === 'en' || stored === 'pt' || stored === 'es' ? stored : inferDeviceLocale();
  await i18n.changeLanguage(lng);
}

export async function setAppLocale(lng: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
