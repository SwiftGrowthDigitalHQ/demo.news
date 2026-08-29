/**
 * LanguageGate — Mandatory full-screen language selection.
 *
 * Shown ONLY on the first visit (when no sangtx_language is saved).
 * No close button, no ESC, no outside-click dismissal.
 * User MUST select a language to proceed.
 */
import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage, useI18n } from '../lib/i18n';

const CHECKMARK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function LanguageGate({ onComplete }: { onComplete: () => void }) {
  const { setLang } = useI18n();
  const [selected, setSelected] = useState<SupportedLanguage | null>(null);
  const [loading, setLoading] = useState<SupportedLanguage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Block ESC key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, []);

  // Prevent scroll on body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Focus trap
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.focus();
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    if (loading) return;
    setSelected(code);
    setLoading(code);
    setLang(code);
    // Brief loading state for UX — then proceed
    setTimeout(() => {
      setLoading(null);
      onComplete();
    }, 420);
  };

  return (
    <>
      <style>{GATE_CSS}</style>
      {/* Full-screen overlay — no pointer events pass through */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select your language"
        tabIndex={-1}
        className="lang-gate"
        // Prevent any click from dismissing
        onClick={e => e.stopPropagation()}
      >
        {/* Content */}
        <div className="lang-gate__inner">
          {/* Logo */}
          <div className="lang-gate__logo" aria-label="SangTX">
            <div className="lang-gate__logo-mark">
              <span>S</span>
            </div>
            <span className="lang-gate__logo-wordmark">SangTX</span>
          </div>

          {/* Heading */}
          <div className="lang-gate__heading">
            <h1 className="lang-gate__title">Choose your language</h1>
            <p className="lang-gate__subtitle">
              Select your preferred language to continue.
            </p>
          </div>

          {/* Language cards */}
          <div className="lang-gate__options" role="listbox" aria-label="Language options">
            {SUPPORTED_LANGUAGES.map(lang => {
              const isSelected = selected === lang.code;
              const isLoading = loading === lang.code;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isSelected}
                  aria-busy={isLoading}
                  onClick={() => handleSelect(lang.code)}
                  disabled={!!loading}
                  className={[
                    'lang-gate__option',
                    isSelected ? 'lang-gate__option--selected' : '',
                    isLoading ? 'lang-gate__option--loading' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="lang-gate__option-text">
                    <span className="lang-gate__option-name">{lang.nativeName}</span>
                    <span className="lang-gate__option-sub">{lang.continueText}</span>
                  </div>
                  <div className="lang-gate__option-indicator">
                    {isLoading ? (
                      <div className="lang-gate__spinner" aria-hidden="true" />
                    ) : isSelected ? (
                      <div className="lang-gate__check">{CHECKMARK}</div>
                    ) : (
                      <div className="lang-gate__arrow" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                          strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="lang-gate__note">
            You can change this later from the website header.
          </p>
        </div>
      </div>
    </>
  );
}

const GATE_CSS = `
  .lang-gate {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    min-height: 100dvh;
    min-height: 100vh;
    overflow-y: auto;
    outline: none;
  }

  .lang-gate__inner {
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 48px 0 32px;
  }

  .lang-gate__logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 40px;
    text-decoration: none;
  }

  .lang-gate__logo-mark {
    width: 38px;
    height: 38px;
    background: #dc2626;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .lang-gate__logo-mark span {
    color: #fff;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.03em;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .lang-gate__logo-wordmark {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.04em;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .lang-gate__heading {
    text-align: center;
    margin-bottom: 32px;
    padding: 0 16px;
  }

  .lang-gate__title {
    font-size: clamp(22px, 5vw, 30px);
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin: 0 0 10px;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .lang-gate__subtitle {
    font-size: 15px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .lang-gate__options {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .lang-gate__option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 22px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-tap-highlight-color: transparent;
    min-height: 76px;
  }

  .lang-gate__option:hover:not(:disabled) {
    border-color: #dc2626;
    background: #fef2f2;
    box-shadow: 0 2px 12px rgba(220, 38, 38, 0.10);
  }

  .lang-gate__option:focus-visible {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
    border-color: #dc2626;
  }

  .lang-gate__option--selected {
    border-color: #dc2626 !important;
    background: #fef2f2 !important;
    box-shadow: 0 2px 12px rgba(220, 38, 38, 0.12) !important;
  }

  .lang-gate__option--loading {
    opacity: 0.85;
  }

  .lang-gate__option:disabled {
    cursor: default;
  }

  .lang-gate__option-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lang-gate__option-name {
    font-size: 19px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.015em;
    line-height: 1.2;
  }

  .lang-gate__option--selected .lang-gate__option-name {
    color: #dc2626;
  }

  .lang-gate__option-sub {
    font-size: 13px;
    color: #64748b;
    font-weight: 400;
    line-height: 1.4;
  }

  .lang-gate__option--selected .lang-gate__option-sub {
    color: #b91c1c;
  }

  .lang-gate__option-indicator {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lang-gate__check {
    width: 32px;
    height: 32px;
    background: #dc2626;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .lang-gate__arrow {
    color: #cbd5e1;
    transition: color 0.15s, transform 0.15s;
  }

  .lang-gate__option:hover .lang-gate__arrow {
    color: #dc2626;
    transform: translateX(2px);
  }

  .lang-gate__spinner {
    width: 22px;
    height: 22px;
    border: 2.5px solid #fecaca;
    border-top-color: #dc2626;
    border-radius: 50%;
    animation: lang-gate-spin 0.6s linear infinite;
  }

  @keyframes lang-gate-spin {
    to { transform: rotate(360deg); }
  }

  .lang-gate__note {
    margin-top: 24px;
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.5;
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .lang-gate__inner {
      padding: 32px 0 24px;
    }
    .lang-gate__option {
      padding: 18px 18px;
      min-height: 70px;
    }
    .lang-gate__option-name {
      font-size: 17px;
    }
    .lang-gate__title {
      font-size: 22px;
    }
  }

  /* Safe area on notched phones */
  @supports (padding: env(safe-area-inset-bottom)) {
    .lang-gate {
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .lang-gate__spinner { animation: none; }
    .lang-gate__option { transition: none; }
    .lang-gate__arrow { transition: none; }
  }
`;
