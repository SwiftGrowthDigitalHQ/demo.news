/**
 * LanguageSwitcher — compact inline switcher for header/footer.
 * Shows 3 pill-style buttons: हिन्दी | English | भोजपुरी
 */
import { SUPPORTED_LANGUAGES, type SupportedLanguage, useI18n } from '../lib/i18n';

type Props = {
  variant?: 'pills' | 'compact';
};

export function LanguageSwitcher({ variant = 'pills' }: Props) {
  const { lang, setLang } = useI18n();

  if (variant === 'compact') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(15,23,42,0.04)', borderRadius: 8, padding: 3,
      }}>
        {SUPPORTED_LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setLang(l.code as SupportedLanguage)}
            aria-pressed={lang === l.code}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: lang === l.code ? 700 : 500,
              background: lang === l.code ? '#dc2626' : 'transparent',
              color: lang === l.code ? '#fff' : '#475569',
              transition: 'background 0.15s, color 0.15s',
              fontFamily: 'inherit',
              lineHeight: 1.4,
            }}
          >
            {l.nativeName}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {SUPPORTED_LANGUAGES.map((l, i) => (
        <span key={l.code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: '#d1d5db', fontSize: 11 }}>|</span>}
          <button
            onClick={() => setLang(l.code as SupportedLanguage)}
            aria-pressed={lang === l.code}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: lang === l.code ? 700 : 400,
              color: lang === l.code ? '#dc2626' : '#94a3b8',
              padding: '2px 4px',
              borderRadius: 4,
              transition: 'color 0.15s',
              fontFamily: 'inherit',
              textDecoration: lang === l.code ? 'underline' : 'none',
              textUnderlineOffset: '3px',
            }}
          >
            {l.nativeName}
          </button>
        </span>
      ))}
    </div>
  );
}
