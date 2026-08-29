import { useState } from 'react';
import { FooterPresentation, type FooterPresentationSocialLink, type FooterPresentationColumn } from './FooterContent';

export interface FooterPreviewProps {
  brandName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  copyrightText: string;
  poweredByText: string;
  poweredByUrl: string;
  designByText?: string;
  designByUrl?: string;
  socialLinks: FooterPresentationSocialLink[];
  columns: FooterPresentationColumn[];
  contact: {
    enabled: boolean;
    title: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    mapsUrl: string;
    phone: string;
    email: string;
    whatsapp: string;
    hours: string;
  };
  apps: {
    showGooglePlay: boolean;
    googlePlayUrl: string;
    googlePlayButtonText: string;
    showAppStore: boolean;
    appStoreUrl: string;
    appStoreButtonText: string;
  };
  newsletter: {
    enabled: boolean;
    title: string;
    description: string;
    placeholder: string;
    buttonText: string;
  };
  ad: {
    enabled: boolean;
    title: string;
    description: string;
    imageUrl: string;
    buttonText: string;
    buttonUrl: string;
  };
}

/**
 * Live footer preview for the admin Footer Settings panel.
 * Renders the SAME FooterPresentation component used by the public site,
 * fed directly from the current (unsaved) form state so every edit is
 * reflected immediately.
 */
export function FooterPreview(props: FooterPreviewProps) {
  // Local demo newsletter behaviour — reflects the configured labels without touching the database
  const [previewEmail, setPreviewEmail] = useState('');
  const [previewDone, setPreviewDone] = useState(false);

  const siteName = props.brandName || 'News Site';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Live Preview</h3>
        <span style={{ fontSize: 11, color: '#64748b' }}>Updates as you type</span>
      </div>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}>
        <div style={{ background: '#1e293b', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>Public footer</span>
        </div>
        <FooterPresentation
          siteName={siteName}
          tagline={props.tagline || 'Fast. Accurate. Trusted.'}
          description={props.description || 'Your trusted digital news platform.'}
          logoUrl={props.logoUrl || null}
          copyrightText={props.copyrightText || `© ${new Date().getFullYear()} ${siteName}. All Rights Reserved.`}
          poweredByText={props.poweredByText || undefined}
          poweredByUrl={props.poweredByUrl || undefined}
          designByText={props.designByText || undefined}
          designByUrl={props.designByUrl || undefined}
          socialLinks={props.socialLinks}
          columns={props.columns}
          contact={props.contact}
          apps={props.apps}
          newsletter={props.newsletter}
          ad={props.ad}
          newsletterForm={{
            email: previewEmail,
            loading: false,
            success: previewDone,
            error: '',
            onEmailChange: (v) => { setPreviewEmail(v); setPreviewDone(false); },
            onSubmit: (e) => { e.preventDefault(); if (previewEmail) { setPreviewDone(true); setPreviewEmail(''); } },
          }}
        />
      </div>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
        Preview shows how the footer will appear to visitors once saved. The newsletter form in this preview is a simulation.
      </p>
    </div>
  );
}
