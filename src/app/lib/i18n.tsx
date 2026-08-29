/**
 * SangTX i18n — centralized translation system.
 *
 * Canonical key source: i18n-en.ts
 * All three language files (en/hi/bho) must have 100% key coverage.
 * localStorage key: "sangtx_language"  values: 'en' | 'hi' | 'bho'
 *
 * NO SILENT ENGLISH FALLBACK IN PRODUCTION.
 * If a key is missing, the key name itself is returned so it is
 * immediately visible to developers as "[MISSING: key.name]".
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en, type TranslationKey } from './i18n-en';
import { hi } from './i18n-hi';
import { bho } from './i18n-bho';

export type SupportedLanguage = 'en' | 'hi' | 'bho';
export type { TranslationKey };

export const LANGUAGE_STORAGE_KEY = 'sangtx_language';

export const SUPPORTED_LANGUAGES: Array<{
  code: SupportedLanguage;
  nativeName: string;
  continueText: string;
}> = [
  { code: 'hi',  nativeName: 'हिन्दी',   continueText: 'SangTX को हिंदी में जारी रखें' },
  { code: 'en',  nativeName: 'English',   continueText: 'Continue in English' },
  { code: 'bho', nativeName: 'भोजपुरी',  continueText: 'SangTX के भोजपुरी में जारी करीं' },
];

export function getSavedLanguage(): SupportedLanguage | null {
  try {
    const val = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (val === 'en' || val === 'hi' || val === 'bho') return val;
    return null;
  } catch { return null; }
}

export function saveLanguage(lang: SupportedLanguage): void {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch { /* ignore */ }
}

// ── Dictionaries ──────────────────────────────────────────────────────────────
type Dict = Record<string, string>;
const DICTIONARIES: Record<SupportedLanguage, Dict> = {
  en: en as Dict,
  hi: hi as Dict,
  bho: bho as Dict,
};

// ── Dev-mode missing-key reporter ─────────────────────────────────────────────
const DEV = import.meta.env.DEV;
const reported = new Set<string>();

function resolveTrans(
  lang: SupportedLanguage,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTIONARIES[lang];
  let val = dict[key];

  if (val === undefined) {
    // In dev: log once and return visible marker; in prod: return key string
    if (DEV && !reported.has(`${lang}:${key}`)) {
      console.warn(`[i18n] MISSING key "${key}" for lang "${lang}"`);
      reported.add(`${lang}:${key}`);
    }
    // Never silently fall back to English — return the key itself
    val = DEV ? `[MISSING: ${key}]` : key;
  }

  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      val = val.replace(`{${k}}`, String(v));
    });
  }
  return val;
}

// ── Context ───────────────────────────────────────────────────────────────────
type I18nContextValue = {
  lang: SupportedLanguage;
  setLang: (l: SupportedLanguage) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLanguage>(
    () => getSavedLanguage() ?? 'en',
  );

  // Update html[lang] whenever language changes
  useEffect(() => {
    document.documentElement.lang = lang;
    // Apply Devanagari typography class on body
    document.body.classList.toggle('lang-devanagari', lang === 'hi' || lang === 'bho');
    document.body.setAttribute('data-lang', lang);
  }, [lang]);

  const setLang = (l: SupportedLanguage) => {
    saveLanguage(l);
    setLangState(l);
  };

  const t = (key: TranslationKey, vars?: Record<string, string | number>): string =>
    resolveTrans(lang, key as string, vars);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
