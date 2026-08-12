/**
 * SangTXOnboardingPage — 7-step professional onboarding wizard.
 * Route: /onboarding
 *
 * Steps:
 *  1. News Brand (name + slug)
 *  2. About Publication (description + tagline)
 *  3. Contact & Location
 *  4. Branding (logo + colors)
 *  5. Social Media (all optional)
 *  6. Website Setup (language + SEO)
 *  7. Review & Create
 *
 * On completion → Supabase: auth.signUp + insert tenant row + subscription row.
 * On success → redirect to /admin with a welcome modal.
 *
 * Language: uses i18n hook, so UI matches whatever language was selected on gate.
 */
import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import { useAppNavigation } from '../lib/navigation';
import { useI18n, type SupportedLanguage } from '../lib/i18n';
import { getSupabaseClient } from '../../lib/supabase';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Plan = 'monthly' | 'yearly';

interface OnboardingData {
  // Step 1
  brandName: string;
  slug: string;
  // Step 2
  shortDesc: string;
  about: string;
  tagline: string;
  // Step 3
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pin: string;
  // Step 4
  logoFile: File | null;
  logoPreviewUrl: string;
  primaryColor: string;
  secondaryColor: string;
  // Step 5
  youtube: string;
  facebook: string;
  instagram: string;
  twitter: string;
  whatsapp: string;
  telegram: string;
  // Step 6
  websiteLang: SupportedLanguage;
  seoTitle: string;
  seoDesc: string;
  plan: Plan;
  // Auth
  fullName: string;
  userEmail: string;
  password: string;
  confirmPassword: string;
}

const INITIAL: OnboardingData = {
  brandName: '', slug: '',
  shortDesc: '', about: '', tagline: '',
  phone: '', email: '', address: '', city: '', district: '', state: '', pin: '',
  logoFile: null, logoPreviewUrl: '', primaryColor: '#dc2626', secondaryColor: '#0f172a',
  youtube: '', facebook: '', instagram: '', twitter: '', whatsapp: '', telegram: '',
  websiteLang: 'hi', seoTitle: '', seoDesc: '',
  plan: 'monthly',
  fullName: '', userEmail: '', password: '', confirmPassword: '',
};

const TOTAL_STEPS = 7;

/* ─── Reserved slugs (must not conflict with system routes) ─────────────────── */
const RESERVED_SLUGS = new Set([
  'admin','login','register','pricing','features','demo','contact',
  'privacy','terms','onboarding','api','superadmin','sangtx','buxar-news',
  'patna-news','rohtas-news','forgot-password','reset-password',
]);

/* ─── Slug helpers ───────────────────────────────────────────────────────────── */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u0900-\u097F]+/g, match => {
      // Transliterate Devanagari roughly to latin for slug
      const map: Record<string, string> = {
        'अ':'a','आ':'a','इ':'i','ई':'i','उ':'u','ऊ':'u','ए':'e','ऐ':'ai',
        'ओ':'o','औ':'au','क':'k','ख':'kh','ग':'g','घ':'gh','च':'ch','छ':'chh',
        'ज':'j','झ':'jh','ट':'t','ठ':'th','ड':'d','ढ':'dh','त':'t','थ':'th',
        'द':'d','ध':'dh','न':'n','प':'p','फ':'f','ब':'b','भ':'bh','म':'m',
        'य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
        'ण':'n','ञ':'n','ङ':'n',
      };
      return Array.from(match).map(ch => map[ch] ?? '').join('');
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3;
}

/* ─── Shared UI primitives ───────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px',
  border: '1.5px solid #e2e8f0', borderRadius: 9,
  fontSize: 14, color: '#0f172a', background: '#fff',
  boxSizing: 'border-box', outline: 'none',
  fontFamily: 'Inter, -apple-system, sans-serif',
  transition: 'border-color 0.15s',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, height: 'auto', padding: '12px 14px',
  resize: 'none' as const, lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#374151',
  marginBottom: 6, display: 'block',
  fontFamily: 'Inter, -apple-system, sans-serif',
};

const fieldWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 0,
};

const errorStyle: React.CSSProperties = {
  fontSize: 12, color: '#dc2626', marginTop: 5,
  fontFamily: 'Inter, -apple-system, sans-serif',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12, color: '#94a3b8', marginTop: 4,
  fontFamily: 'Inter, -apple-system, sans-serif',
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span style={errorStyle} role="alert">{msg}</span>;
}

function FieldHint({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span style={hintStyle}>{msg}</span>;
}

function Field({
  label, required, optional, error, hint, children,
}: {
  label: string; required?: boolean; optional?: boolean;
  error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={fieldWrap}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
        {optional && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>(optional)</span>}
      </label>
      {children}
      <FieldError msg={error} />
      <FieldHint msg={hint} />
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────────────────────────────────── */
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div style={{ width: '100%', height: 3, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, background: '#dc2626',
        borderRadius: 99, transition: 'width 0.35s ease',
      }} />
    </div>
  );
}

/* ─── Step indicator ─────────────────────────────────────────────────────────── */
function StepIndicator({ step, total }: { step: number; total: number }) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>
        {t('onboarding.step')} {step} {t('onboarding.of')} {total}
      </span>
      <div style={{ flex: 1, maxWidth: 80 }}>
        <ProgressBar step={step} total={total} />
      </div>
    </div>
  );
}

/* ─── Logo upload component ──────────────────────────────────────────────────── */
function LogoUpload({
  previewUrl, onFile, onRemove,
}: { previewUrl: string; onFile: (f: File, url: string) => void; onRemove: () => void }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const processFile = (file: File) => {
    setError('');
    if (!['image/png','image/jpeg','image/jpg','image/svg+xml'].includes(file.type)) {
      setError('Please upload a PNG, JPG, or SVG file.'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2MB.'); return;
    }
    const url = URL.createObjectURL(file);
    onFile(file, url);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  if (previewUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 10, border: '1.5px solid #e2e8f0',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8fafc',
        }}>
          <img src={previewUrl} alt={t('onboarding.logoPreview')}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <button onClick={onRemove} style={{
          fontSize: 13, color: '#dc2626', background: 'none',
          cursor: 'pointer', fontWeight: 500, padding: '4px 8px', borderRadius: 6,
          border: '1px solid #fecaca',
        }}>
          {t('onboarding.removeLogo')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          width: '100%', minHeight: 90, borderRadius: 10, border: `2px dashed ${dragOver ? '#dc2626' : '#e2e8f0'}`,
          background: dragOver ? '#fef2f2' : '#fafafa', cursor: 'pointer', padding: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 6, transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{t('onboarding.dragOrClick')}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('onboarding.fileLimit')}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        onChange={handleChange} style={{ display: 'none' }} aria-label={t('onboarding.uploadLogo')} />
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
}

/* ─── Color picker ────────────────────────────────────────────────────────────── */
function ColorPicker({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={fieldWrap}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 44, height: 44, borderRadius: 8, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1 }} maxLength={7} />
      </div>
    </div>
  );
}

/* ─── Step components ────────────────────────────────────────────────────────── */

function Step1({
  data, onChange, errors,
}: { data: OnboardingData; onChange: (k: keyof OnboardingData, v: string) => void; errors: Partial<Record<string, string>> }) {
  const { t } = useI18n();

  const handleNameChange = (v: string) => {
    onChange('brandName', v);
    const auto = toSlug(v);
    onChange('slug', auto);
  };

  const handleSlugChange = (v: string) => {
    onChange('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Account info at top of step 1 */}
      <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em' }}>YOUR ACCOUNT</p>
        <Field label="Full Name" required error={errors.fullName}>
          <input style={inputStyle} placeholder="Your full name" value={data.fullName}
            onChange={e => onChange('fullName', e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" required error={errors.userEmail}>
          <input style={inputStyle} type="email" placeholder="you@example.com" value={data.userEmail}
            onChange={e => onChange('userEmail', e.target.value)} autoComplete="email" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Password" required error={errors.password}>
            <input style={inputStyle} type="password" placeholder="Min. 8 characters" value={data.password}
              onChange={e => onChange('password', e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm Password" required error={errors.confirmPassword}>
            <input style={inputStyle} type="password" placeholder="Repeat password" value={data.confirmPassword}
              onChange={e => onChange('confirmPassword', e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
      </div>

      <Field label={t('onboarding.brandName')} required error={errors.brandName}>
        <input style={inputStyle} placeholder={t('onboarding.brandName.placeholder')}
          value={data.brandName} onChange={e => handleNameChange(e.target.value)} />
      </Field>

      <Field label={t('onboarding.slug')} required error={errors.slug}
        hint={data.slug ? `${data.slug}.sangtx.com` : t('onboarding.slug.help')}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ padding: '0 10px', height: 46, display: 'flex', alignItems: 'center', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRight: 'none', borderRadius: '9px 0 0 9px', fontSize: 13, color: '#94a3b8', flexShrink: 0 }}>
            sangtx.com/
          </span>
          <input style={{ ...inputStyle, borderRadius: '0 9px 9px 0', borderLeft: 'none' }}
            placeholder="your-news-name" value={data.slug}
            onChange={e => handleSlugChange(e.target.value)} />
        </div>
      </Field>
    </div>
  );
}

function Step2({
  data, onChange, errors,
}: { data: OnboardingData; onChange: (k: keyof OnboardingData, v: string) => void; errors: Partial<Record<string, string>> }) {
  const { t } = useI18n();
  const remaining = 200 - data.shortDesc.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Field label={t('onboarding.shortDesc')} required error={errors.shortDesc}>
        <div>
          <textarea style={{ ...textareaStyle, height: 70 }} rows={2}
            placeholder={t('onboarding.shortDesc.placeholder')}
            value={data.shortDesc} maxLength={200}
            onChange={e => onChange('shortDesc', e.target.value)} />
          <span style={{ fontSize: 11, color: remaining < 20 ? '#dc2626' : '#94a3b8', float: 'right', marginTop: 2 }}>
            {remaining} left
          </span>
        </div>
      </Field>
      <Field label={t('onboarding.taglineField')} optional>
        <input style={inputStyle} placeholder={t('onboarding.taglineField.placeholder')}
          value={data.tagline} maxLength={80}
          onChange={e => onChange('tagline', e.target.value)} />
      </Field>
      <Field label={t('onboarding.about')} optional>
        <textarea style={{ ...textareaStyle, height: 120 }} rows={5}
          placeholder={t('onboarding.about.placeholder')}
          value={data.about} maxLength={1000}
          onChange={e => onChange('about', e.target.value)} />
      </Field>
    </div>
  );
}

function Step3({
  data, onChange, errors,
}: { data: OnboardingData; onChange: (k: keyof OnboardingData, v: string) => void; errors: Partial<Record<string, string>> }) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={t('onboarding.phone')} error={errors.phone}>
          <input style={inputStyle} type="tel" placeholder="+91 98765 43210"
            value={data.phone} onChange={e => onChange('phone', e.target.value)} />
        </Field>
        <Field label={t('onboarding.email')} error={errors.email}>
          <input style={inputStyle} type="email" placeholder="editorial@yournews.com"
            value={data.email} onChange={e => onChange('email', e.target.value)} />
        </Field>
      </div>
      <Field label={t('onboarding.address')} optional>
        <input style={inputStyle} placeholder="Street address"
          value={data.address} onChange={e => onChange('address', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={t('onboarding.city')} error={errors.city}>
          <input style={inputStyle} placeholder="City"
            value={data.city} onChange={e => onChange('city', e.target.value)} />
        </Field>
        <Field label={t('onboarding.district')} optional>
          <input style={inputStyle} placeholder="District"
            value={data.district} onChange={e => onChange('district', e.target.value)} />
        </Field>
        <Field label={t('onboarding.state')} error={errors.state}>
          <input style={inputStyle} placeholder="State"
            value={data.state} onChange={e => onChange('state', e.target.value)} />
        </Field>
        <Field label={t('onboarding.pin')} optional>
          <input style={inputStyle} placeholder="PIN code" maxLength={6}
            value={data.pin} onChange={e => onChange('pin', e.target.value.replace(/\D/g, ''))} />
        </Field>
      </div>
    </div>
  );
}

function Step4({
  data, onChange, onLogoFile, onLogoRemove,
}: {
  data: OnboardingData;
  onChange: (k: keyof OnboardingData, v: string) => void;
  onLogoFile: (f: File, url: string) => void;
  onLogoRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Field label={t('onboarding.logo')} optional>
        <LogoUpload previewUrl={data.logoPreviewUrl} onFile={onLogoFile} onRemove={onLogoRemove} />
      </Field>
      <ColorPicker label={t('onboarding.primaryColor')} value={data.primaryColor}
        onChange={v => onChange('primaryColor', v)} />
      <ColorPicker label={t('onboarding.secondaryColor')} value={data.secondaryColor}
        onChange={v => onChange('secondaryColor', v)} />
      {/* Live preview */}
      <div style={{ marginTop: 4 }}>
        <p style={{ ...labelStyle, marginBottom: 10 }}>Preview</p>
        <div style={{ background: data.secondaryColor, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {data.logoPreviewUrl ? (
            <img src={data.logoPreviewUrl} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }} alt="logo" />
          ) : (
            <div style={{ width: 36, height: 36, background: data.primaryColor, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{(data.brandName || 'N')[0]?.toUpperCase()}</span>
            </div>
          )}
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
            {data.brandName || 'Your News Name'}
          </span>
        </div>
      </div>
    </div>
  );
}

function Step5({
  data, onChange,
}: { data: OnboardingData; onChange: (k: keyof OnboardingData, v: string) => void }) {
  const { t } = useI18n();
  const fields: Array<{ key: keyof OnboardingData; label: string; placeholder: string }> = [
    { key: 'youtube', label: t('onboarding.youtube'), placeholder: 'https://youtube.com/@yourchannel' },
    { key: 'facebook', label: t('onboarding.facebook'), placeholder: 'https://facebook.com/yourpage' },
    { key: 'instagram', label: t('onboarding.instagram'), placeholder: 'https://instagram.com/yourhandle' },
    { key: 'twitter', label: t('onboarding.twitter'), placeholder: 'https://x.com/yourhandle' },
    { key: 'whatsapp', label: t('onboarding.whatsapp'), placeholder: 'https://wa.me/91XXXXXXXXXX or channel link' },
    { key: 'telegram', label: t('onboarding.telegram'), placeholder: 'https://t.me/yourchannel' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fields.map(f => (
        <Field key={f.key} label={f.label} optional>
          <input style={inputStyle} type="url" placeholder={f.placeholder}
            value={data[f.key] as string}
            onChange={e => onChange(f.key, e.target.value)} />
        </Field>
      ))}
    </div>
  );
}

function Step6({
  data, onChange,
}: { data: OnboardingData; onChange: (k: keyof OnboardingData, v: string) => void }) {
  const { t } = useI18n();

  const langOptions: Array<{ value: SupportedLanguage; label: string }> = [
    { value: 'hi', label: 'हिन्दी' },
    { value: 'en', label: 'English' },
    { value: 'bho', label: 'भोजपुरी' },
  ];

  const planOptions: Array<{ value: Plan; label: string; price: string; per: string; save?: string }> = [
    { value: 'monthly', label: 'Monthly', price: '₹499', per: '/month' },
    { value: 'yearly', label: 'Yearly', price: '₹5,599', per: '/year', save: 'Save ~₹389' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Field label={t('onboarding.language')} required>
        <select
          style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
          value={data.websiteLang}
          onChange={e => onChange('websiteLang', e.target.value)}
        >
          {langOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <Field label={t('onboarding.seoTitle')} optional hint="Appears in Google search results">
        <input style={inputStyle} placeholder={`${data.brandName || 'Your News'} — Latest News`}
          value={data.seoTitle} maxLength={65}
          onChange={e => onChange('seoTitle', e.target.value)} />
      </Field>
      <Field label={t('onboarding.seoDesc')} optional hint="150–160 characters recommended">
        <textarea style={{ ...textareaStyle, height: 80 }} rows={3} maxLength={160}
          placeholder="What your news publication covers..."
          value={data.seoDesc} onChange={e => onChange('seoDesc', e.target.value)} />
      </Field>

      {/* Plan selection */}
      <div style={fieldWrap}>
        <label style={{ ...labelStyle, marginBottom: 10 }}>{t('onboarding.plan')}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {planOptions.map(p => (
            <button key={p.value} type="button"
              onClick={() => onChange('plan', p.value)}
              style={{
                padding: '16px', borderRadius: 10, border: `2px solid ${data.plan === p.value ? '#dc2626' : '#e2e8f0'}`,
                background: data.plan === p.value ? '#fef2f2' : '#fff', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 4 }}>
                {p.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {p.price}<span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>{p.per}</span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 99, padding: '2px 8px' }}>
                  {t('onboarding.plan.trial')}
                </span>
                {p.save && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 8px' }}>
                    {p.save}
                  </span>
                )}
              </div>
              {data.plan === p.value && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                  ✓ Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 7: Review ─────────────────────────────────────────────────────────── */
function Step7({
  data, onEdit,
}: { data: OnboardingData; onEdit: (step: number) => void }) {
  const { t } = useI18n();
  const langLabels: Record<SupportedLanguage, string> = { hi: 'हिन्दी', en: 'English', bho: 'भोजपुरी' };

  const sections: Array<{ step: number; label: string; rows: Array<[string, string]> }> = [
    {
      step: 1,
      label: t('onboarding.step1.title'),
      rows: [
        ['Name', data.brandName],
        ['URL', `${data.slug}.sangtx.com`],
        ['Account', data.userEmail],
      ],
    },
    {
      step: 2,
      label: t('onboarding.step2.title'),
      rows: [
        ['Description', data.shortDesc || '—'],
        ...(data.tagline ? [['Tagline', data.tagline] as [string, string]] : []),
      ],
    },
    {
      step: 3,
      label: t('onboarding.step3.title'),
      rows: [
        ['Contact', [data.phone, data.email].filter(Boolean).join(' · ') || '—'],
        ['Location', [data.city, data.district, data.state].filter(Boolean).join(', ') || '—'],
      ],
    },
    {
      step: 4,
      label: t('onboarding.step4.title'),
      rows: [
        ['Primary', data.primaryColor],
        ['Secondary', data.secondaryColor],
        ['Logo', data.logoPreviewUrl ? 'Uploaded' : 'Not uploaded'],
      ],
    },
    {
      step: 6,
      label: t('onboarding.step6.title'),
      rows: [
        ['Language', langLabels[data.websiteLang]],
        ['Plan', data.plan === 'monthly' ? '₹499/month' : '₹5,599/year'],
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Publication name hero */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px 20px', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {data.logoPreviewUrl ? (
            <img src={data.logoPreviewUrl} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0' }} alt="logo" />
          ) : (
            <div style={{ width: 48, height: 48, background: data.primaryColor, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{(data.brandName || 'N')[0]?.toUpperCase()}</span>
            </div>
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{data.brandName || '—'}</div>
            {data.tagline && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{data.tagline}</div>}
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{data.slug ? `${data.slug}.sangtx.com` : '—'}</div>
          </div>
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.step} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', letterSpacing: '0.02em' }}>{sec.label.toUpperCase()}</span>
            <button onClick={() => onEdit(sec.step)} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              {t('onboarding.review.edit')}
            </button>
          </div>
          {sec.rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 12, marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 80, flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
        </div>
      ))}

      {/* 7-day trial reminder */}
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 4 }}>
        <span style={{ fontSize: 16 }}>🎉</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>7-day free trial included</div>
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
            Full access · No credit card · Pay via UPI after trial ends
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Creation state overlay ─────────────────────────────────────────────────── */
function CreatingOverlay({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  const { t } = useI18n();
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        {/* Spinner */}
        <div style={{ width: 48, height: 48, margin: '0 auto 24px', border: '3px solid #fecaca', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'oc-spin 0.8s linear infinite' }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>
          {t('onboarding.creating')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i <= currentStep ? 1 : 0.35, transition: 'opacity 0.4s' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < currentStep ? '#16a34a' : i === currentStep ? '#dc2626' : '#e2e8f0' }}>
                {i < currentStep ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : i === currentStep ? (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                ) : null}
              </div>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: i === currentStep ? 600 : 400 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes oc-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Success state ───────────────────────────────────────────────────────────── */
function SuccessScreen({ data }: { data: OnboardingData }) {
  const { t } = useI18n();
  const { navigate } = useAppNavigation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: '#fff', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Checkmark */}
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', margin: '0 0 8px', textAlign: 'center' }}>
        {t('onboarding.welcome')}
      </h1>
      <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32, textAlign: 'center' }}>
        {t('onboarding.ready')}
      </p>

      {/* Platform card */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', maxWidth: 380, width: '100%', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {data.logoPreviewUrl ? (
            <img src={data.logoPreviewUrl} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }} alt="logo" />
          ) : (
            <div style={{ width: 40, height: 40, background: data.primaryColor, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{(data.brandName || 'N')[0]?.toUpperCase()}</span>
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{data.brandName}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{data.slug}.sangtx.com</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, background: '#fef2f2', color: '#dc2626', fontWeight: 600, border: '1px solid #fecaca', borderRadius: 99, padding: '3px 10px' }}>
            🎉 {t('onboarding.trial.remaining')}
          </span>
          <span style={{ fontSize: 12, background: '#f0f9ff', color: '#0284c7', fontWeight: 600, border: '1px solid #bae6fd', borderRadius: 99, padding: '3px 10px' }}>
            {t('onboarding.trial.plan')}: {data.plan === 'monthly' ? '₹499/mo' : '₹5,599/yr'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 380 }}>
        <button onClick={() => navigate('/admin')} style={{ height: 48, borderRadius: 10, background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          {t('onboarding.openDashboard')}
        </button>
        <button onClick={() => window.open(`/${data.slug}`, '_blank')} style={{ height: 44, borderRadius: 10, background: '#fff', color: '#0f172a', fontSize: 14, fontWeight: 600, border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>
          {t('onboarding.openWebsite')}
        </button>
      </div>
    </div>
  );
}

/* ─── Validation ─────────────────────────────────────────────────────────────── */
function validate(step: number, data: OnboardingData): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (step === 1) {
    if (!data.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!data.userEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.userEmail))
      errors.userEmail = 'Valid email is required.';
    if (data.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!data.brandName.trim()) errors.brandName = 'News name is required.';
    if (!data.slug) errors.slug = 'Slug is required.';
    else if (!isValidSlug(data.slug)) errors.slug = 'Use only lowercase letters, numbers and hyphens.';
    else if (RESERVED_SLUGS.has(data.slug)) errors.slug = 'This slug is reserved. Please choose another.';
  }
  if (step === 2) {
    if (!data.shortDesc.trim()) errors.shortDesc = 'A short description is required.';
    if (data.shortDesc.length > 200) errors.shortDesc = 'Keep it under 200 characters.';
  }
  if (step === 3) {
    if (!data.phone.trim()) errors.phone = 'Phone number is required.';
    if (!data.city.trim()) errors.city = 'City is required.';
    if (!data.state.trim()) errors.state = 'State is required.';
  }
  return errors;
}

/* ─── Main onboarding page ───────────────────────────────────────────────────── */
export function SangTXOnboardingPage() {
  const { t } = useI18n();
  const { navigate } = useAppNavigation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [done, setDone] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const createStepLabels = [
    t('onboarding.creating.workspace'),
    t('onboarding.creating.branding'),
    t('onboarding.creating.website'),
    t('onboarding.creating.cms'),
  ];

  const onChange = useCallback((k: keyof OnboardingData, v: string) => {
    setData(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: undefined }));
  }, []);

  const onLogoFile = (f: File, url: string) => {
    setData(prev => ({ ...prev, logoFile: f, logoPreviewUrl: url }));
  };

  const onLogoRemove = () => {
    setData(prev => ({ ...prev, logoFile: null, logoPreviewUrl: '' }));
  };

  const handleNext = () => {
    const errs = validate(step, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleEdit = (targetStep: number) => {
    setErrors({});
    setStep(targetStep);
    window.scrollTo(0, 0);
  };

  const handleCreate = async () => {
    setGlobalError('');
    setCreating(true);
    setCreateStep(0);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase is not configured. Check your environment variables.');

      // Step 1 — Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.userEmail.trim().toLowerCase(),
        password: data.password,
        options: { data: { full_name: data.fullName.trim() } },
      });
      if (authError) throw authError;
      const authUserId = authData.user?.id;
      if (!authUserId) throw new Error('Account creation failed. Please try again.');

      setCreateStep(1);

      // Step 2 — Create tenant row
      const trialStartedAt = new Date().toISOString();
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const tenantPayload = {
        slug: data.slug,
        name: data.brandName,
        description: data.shortDesc || null,
        tagline: data.tagline || null,
        about: data.about || null,
        language: data.websiteLang,
        contact_phone: data.phone || null,
        contact_email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        district: data.district || null,
        state: data.state || null,
        pin: data.pin || null,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        seo_title: data.seoTitle || null,
        seo_description: data.seoDesc || null,
        social_links: {
          youtube: data.youtube || null,
          facebook: data.facebook || null,
          instagram: data.instagram || null,
          twitter: data.twitter || null,
          whatsapp: data.whatsapp || null,
          telegram: data.telegram || null,
        },
        owner_auth_user_id: authUserId,
        subscription_status: 'TRIAL',
        subscription_plan: data.plan,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
      };

      const { error: tenantError } = await supabase
        .from('tenants')
        .insert(tenantPayload);

      if (tenantError) {
        // If tenants table doesn't exist yet, store in site_settings as fallback
        console.warn('tenants table not found — falling back to site_settings', tenantError.message);
        const { error: settingsError } = await supabase.from('site_settings').insert({
          site_name: data.brandName,
          contact_phone: data.phone || null,
          contact_email: data.email || null,
          social_links: tenantPayload.social_links,
          theme_config: {
            tagline: data.tagline || null,
            primary_color: data.primaryColor,
            secondary_color: data.secondaryColor,
            site_url: `${data.slug}.sangtx.com`,
            onboarding_slug: data.slug,
            onboarding_lang: data.websiteLang,
            subscription_plan: data.plan,
            trial_started_at: trialStartedAt,
            trial_ends_at: trialEndsAt,
          },
        });
        if (settingsError) throw settingsError;
      }

      setCreateStep(2);

      // Step 3 — Upload logo if present
      if (data.logoFile) {
        const ext = data.logoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `logos/${data.slug}-${Date.now()}.${ext}`;
        await supabase.storage.from('media').upload(path, data.logoFile, { upsert: true });
      }

      setCreateStep(3);

      // Step 4 — Create user profile linked to auth user
      const { error: userError } = await supabase.from('users').insert({
        auth_user_id: authUserId,
        full_name: data.fullName.trim(),
        email: data.userEmail.trim().toLowerCase(),
        status: 'active',
      });
      // Non-fatal if this fails (auth trigger might create it)
      if (userError) console.warn('User profile insert skipped:', userError.message);

      setCreateStep(4);

      // Done — sign the user in with their new credentials
      await supabase.auth.signInWithPassword({
        email: data.userEmail.trim().toLowerCase(),
        password: data.password,
      });

      await new Promise(r => setTimeout(r, 600));
      setCreating(false);
      setDone(true);

    } catch (err) {
      setCreating(false);
      setCreateStep(0);
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (done) return <SuccessScreen data={data} />;

  const stepTitles = [
    t('onboarding.step1.title'), t('onboarding.step2.title'), t('onboarding.step3.title'),
    t('onboarding.step4.title'), t('onboarding.step5.title'), t('onboarding.step6.title'),
    t('onboarding.step7.title'),
  ];
  const stepDescs = [
    t('onboarding.step1.desc'), t('onboarding.step2.desc'), t('onboarding.step3.desc'),
    t('onboarding.step4.desc'), t('onboarding.step5.desc'), t('onboarding.step6.desc'),
    t('onboarding.step7.desc'),
  ];

  return (
    <>
      <style>{ONBOARDING_CSS}</style>
      {creating && <CreatingOverlay steps={createStepLabels} currentStep={createStep} />}

      <div style={{ minHeight: '100dvh', background: '#f8fafc', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {/* Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="SangTX home">
              <div style={{ width: 30, height: 30, background: '#dc2626', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>S</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>SangTX</span>
            </button>
            <StepIndicator step={step} total={TOTAL_STEPS} />
          </div>
        </header>

        {/* Main form card */}
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px 80px' }}>
          {/* Step heading */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', margin: '0 0 6px' }}>
              {stepTitles[step - 1]}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              {stepDescs[step - 1]}
            </p>
          </div>

          {/* Step content */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '28px 24px', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
            {step === 1 && <Step1 data={data} onChange={onChange} errors={errors} />}
            {step === 2 && <Step2 data={data} onChange={onChange} errors={errors} />}
            {step === 3 && <Step3 data={data} onChange={onChange} errors={errors} />}
            {step === 4 && <Step4 data={data} onChange={onChange} onLogoFile={onLogoFile} onLogoRemove={onLogoRemove} />}
            {step === 5 && <Step5 data={data} onChange={onChange} />}
            {step === 6 && <Step6 data={data} onChange={onChange} />}
            {step === 7 && <Step7 data={data} onEdit={handleEdit} />}
          </div>

          {/* Global error */}
          {globalError && (
            <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#dc2626' }}>
              {globalError}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 12 }}>
            <button
              onClick={handleBack}
              disabled={step === 1}
              style={{ height: 46, padding: '0 24px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: step === 1 ? '#cbd5e1' : '#0f172a', fontSize: 14, fontWeight: 600, cursor: step === 1 ? 'default' : 'pointer' }}
            >
              {t('onboarding.back')}
            </button>

            {step < TOTAL_STEPS ? (
              <button onClick={handleNext}
                style={{ height: 46, padding: '0 28px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}>
                {t('onboarding.next')} →
              </button>
            ) : (
              <button onClick={() => void handleCreate()} disabled={creating}
                style={{ height: 46, padding: '0 28px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                {creating ? t('onboarding.creating') : t('onboarding.create')}
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

const ONBOARDING_CSS = `
  input:focus, textarea:focus, select:focus {
    border-color: #dc2626 !important;
    box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
  }
  button:focus-visible {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
    border-radius: 6px;
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
`;
