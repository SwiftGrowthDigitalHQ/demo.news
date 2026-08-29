import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Save, Globe, Mail, Palette, Share2, Key, Database, Image as ImageIcon, AlertCircle, Upload } from 'lucide-react';
import { loadSiteSettings, markAuditLog, upsertSiteSettings, uploadAdminMedia } from '../../lib/admin';
import { resolveAssetUrl, isValidAssetUrl } from '../../lib/assetResolver';

const tabs = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'social', label: 'Social Media', icon: Share2 },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'backup', label: 'Backup', icon: Database },
];

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0, minWidth: 240 }}>{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none' }}
    />
  );
}

function ColorPicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  // Normalize HEX value (ensure it has # and is uppercase)
  const normalizeHex = (hex: string): string => {
    let normalized = hex.trim().toUpperCase();
    if (!normalized.startsWith('#')) {
      normalized = '#' + normalized;
    }
    // Validate HEX format
    if (/^#[0-9A-F]{6}$/.test(normalized) || /^#[0-9A-F]{3}$/.test(normalized)) {
      // Expand 3-digit HEX to 6-digit
      if (normalized.length === 4) {
        normalized = '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
      }
      return normalized;
    }
    return value; // Return original if invalid
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toUpperCase());
  };

  const handleTextInputChange = (newValue: string) => {
    onChange(newValue.toUpperCase());
  };

  const handleTextInputBlur = () => {
    // Normalize on blur
    onChange(normalizeHex(value));
  };

  return (
    <div className="flex items-center gap-2">
      <input 
        type="color" 
        value={value} 
        onChange={handleColorInputChange}
        style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', cursor: 'pointer', padding: 2 }}
        title={label}
      />
      <input
        type="text"
        value={value}
        onChange={e => handleTextInputChange(e.target.value)}
        onBlur={handleTextInputBlur}
        placeholder="#000000"
        maxLength={7}
        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'monospace' }}
      />
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', background: value ? '#dc2626' : '#e2e8f0', position: 'relative', transition: 'background 0.2s ease' }}
    >
      <span style={{ position: 'absolute', top: 4, left: value ? 22 : 4, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease' }} />
    </button>
  );
}

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('website');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [tagline, setTagline] = useState('Fast. Accurate. Trusted.');
  const [siteUrl, setSiteUrl] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [articlesPerPage, setArticlesPerPage] = useState('20');
  const [breakingTicker, setBreakingTicker] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#DC2626');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState('Medium (16px)');
  const [heroLayout, setHeroLayout] = useState('Full Width Slider');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [fromName, setFromName] = useState('');
  const [breakingAlerts, setBreakingAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [facebookPage, setFacebookPage] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState('');
  const [whatsappChannel, setWhatsappChannel] = useState('+91 98765 43210');
  const [autoShare, setAutoShare] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupRetention, setBackupRetention] = useState('30 days');

  const load = async () => {
    setLoading(true);
    try {
      const settings = await loadSiteSettings();
      if (settings) {
        const theme = settings.theme_config as Record<string, unknown>;
        
        // Helper to normalize HEX color
        const normalizeHex = (color: unknown, fallback: string): string => {
          let hex = String(color ?? fallback).trim().toUpperCase();
          if (!hex.startsWith('#')) hex = '#' + hex;
          // Expand 3-digit HEX to 6-digit
          if (hex.length === 4 && /^#[0-9A-F]{3}$/.test(hex)) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
          }
          // Validate 6-digit HEX
          if (/^#[0-9A-F]{6}$/.test(hex)) {
            return hex;
          }
          return fallback;
        };
        
        setSiteName(settings.site_name ?? '');
        setLogoUrl(String(theme.logo ?? settings.logo_url ?? ''));
        setFaviconUrl(String(theme.favicon ?? settings.logo_url ?? ''));
        setTagline(String(theme.tagline ?? tagline));
        setSiteUrl(String(theme.site_url ?? ''));
        setAdminEmail(String(settings.contact_email ?? ''));
        setContactPhone(String(settings.contact_phone ?? contactPhone));
        setArticlesPerPage(String(theme.articles_per_page ?? articlesPerPage));
        setBreakingTicker(Boolean(theme.breaking_ticker ?? true));
        setCommentsEnabled(Boolean(theme.comments_enabled ?? true));
        setMaintenanceMode(Boolean(theme.maintenance_mode ?? false));
        setPrimaryColor(normalizeHex(theme.primary_color, '#DC2626'));
        setSecondaryColor(normalizeHex(theme.secondary_color, '#0F172A'));
        setDarkMode(Boolean(theme.dark_mode ?? false));
        setFontSize(String(theme.font_size ?? fontSize));
        setHeroLayout(String(theme.hero_layout ?? heroLayout));
        setSmtpHost(String(theme.smtp_host ?? ''));
        setSmtpPort(String(theme.smtp_port ?? ''));
        setSmtpUsername(String(theme.smtp_username ?? ''));
        setFromName(String(theme.from_name ?? settings.site_name ?? ''));
        setBreakingAlerts(Boolean(theme.breaking_alerts ?? true));
        setWeeklyDigest(Boolean(theme.weekly_digest ?? true));
        setFacebookPage(String(theme.facebook_page ?? ''));
        setTwitterHandle(String(theme.twitter_handle ?? ''));
        setInstagramHandle(String(theme.instagram_handle ?? ''));
        setYoutubeChannel(String(theme.youtube_channel ?? ''));
        setWhatsappChannel(String(theme.whatsapp_channel ?? whatsappChannel));
        setAutoShare(Boolean(theme.auto_share ?? true));
        setAutoBackup(Boolean(theme.auto_backup ?? true));
        setBackupRetention(String(theme.backup_retention ?? backupRetention));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const settings = await loadSiteSettings();
      await upsertSiteSettings({
        site_name: siteName,
        logo_url: logoUrl || settings?.logo_url || null,
        contact_name: settings?.contact_name ?? null,
        contact_phone: contactPhone,
        contact_email: adminEmail,
        social_links: {
          facebook: facebookPage,
          twitter: twitterHandle,
          instagram: instagramHandle,
          youtube: youtubeChannel,
          whatsapp: whatsappChannel,
        },
        footer_text: settings?.footer_text ?? null,
        theme_config: {
          tagline,
          site_url: siteUrl,
          logo: logoUrl,
          favicon: faviconUrl,
          articles_per_page: articlesPerPage,
          breaking_ticker: breakingTicker,
          comments_enabled: commentsEnabled,
          maintenance_mode: maintenanceMode,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          dark_mode: darkMode,
          font_size: fontSize,
          hero_layout: heroLayout,
          // REMOVED: smtp_host, smtp_port, smtp_username, from_name (backend secrets)
          // REMOVED: breaking_alerts, weekly_digest (backend notification config)
          // REMOVED: auto_share, auto_backup, backup_retention (backend operations)
        },
      });
      void markAuditLog({ action: 'site_settings.updated', entity_type: 'site_settings', metadata: { site_name: siteName } }).catch(() => undefined);
      toast.success('Settings saved.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setLogoUploading(true);
    try {
      const media = await uploadAdminMedia(file, { alt_text: 'Site logo' });
      setLogoUrl(media.url);
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error('Failed to upload logo');
      console.error(error);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setFaviconUploading(true);
    try {
      const media = await uploadAdminMedia(file, { alt_text: 'Site favicon' });
      setFaviconUrl(media.url);
      toast.success('Favicon uploaded');
    } catch (error) {
      toast.error('Failed to upload favicon');
      console.error(error);
    } finally {
      setFaviconUploading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="flex gap-6 p-6">
      <div className="flex flex-col gap-1" style={{ width: 180, flexShrink: 0 }}>
        {tabs.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex items-center gap-3 rounded-lg px-3"
              style={{ height: 40, fontSize: 13, background: activeTab === item.id ? '#fef2f2' : 'transparent', color: activeTab === item.id ? '#dc2626' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: activeTab === item.id ? 600 : 400, textAlign: 'left' }}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 rounded-xl border p-6" style={{ background: '#fff', borderColor: 'rgba(15,23,42,0.08)' }}>
        {activeTab === 'website' && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Website Settings</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Configure your news portal's basic information</p>
            <SettingRow label="Site Name" desc="Displayed in browser tab and SEO"><TextInput value={siteName} onChange={setSiteName} /></SettingRow>
            
            {/* Logo with Preview */}
            <SettingRow label="Logo" desc="Used in the header (supports Google Drive, Supabase Storage, or direct URLs)">
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <label style={{ cursor: logoUploading ? 'not-allowed' : 'pointer' }}>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} style={{ display: 'none' }} />
                    <div style={{ padding: '8px 12px', borderRadius: 6, background: logoUploading ? '#f1f5f9' : '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: logoUploading ? 0.5 : 1 }}>
                      <Upload size={16} />
                      {logoUploading ? 'Uploading...' : 'Upload'}
                    </div>
                  </label>
                </div>
                {logoUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isValidAssetUrl(logoUrl) ? (
                      <>
                        <img 
                          src={resolveAssetUrl(logoUrl)} 
                          alt="Logo preview" 
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444' }}>
                          <AlertCircle size={14} />
                          <span>Unable to load image</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                        <ImageIcon size={14} />
                        <span>Enter a valid image URL</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SettingRow>
            
            {/* Favicon with Preview */}
            <SettingRow label="Favicon" desc="Browser tab icon (supports Google Drive, Supabase Storage, or direct URLs)">
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <label style={{ cursor: faviconUploading ? 'not-allowed' : 'pointer' }}>
                    <input type="file" accept="image/*" onChange={handleFaviconUpload} disabled={faviconUploading} style={{ display: 'none' }} />
                    <div style={{ padding: '8px 12px', borderRadius: 6, background: faviconUploading ? '#f1f5f9' : '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: faviconUploading ? 0.5 : 1 }}>
                      <Upload size={16} />
                      {faviconUploading ? 'Uploading...' : 'Upload'}
                    </div>
                  </label>
                </div>
                {faviconUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isValidAssetUrl(faviconUrl) ? (
                      <>
                        <img 
                          src={resolveAssetUrl(faviconUrl)} 
                          alt="Favicon preview" 
                          style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444' }}>
                          <AlertCircle size={14} />
                          <span>Unable to load image</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                        <ImageIcon size={14} />
                        <span>Enter a valid image URL</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SettingRow>
            
            <SettingRow label="Tagline" desc="Short description of your portal"><TextInput value={tagline} onChange={setTagline} /></SettingRow>
            <SettingRow label="Site URL" desc="Your website URL (read-only)"><TextInput value={siteUrl} onChange={setSiteUrl} /></SettingRow>
            <SettingRow label="Admin Email"><TextInput value={adminEmail} onChange={setAdminEmail} /></SettingRow>
            <SettingRow label="Contact Phone"><TextInput value={contactPhone} onChange={setContactPhone} /></SettingRow>
            <SettingRow label="Articles Per Page">
              <select value={articlesPerPage} onChange={e => setArticlesPerPage(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', fontSize: 13, color: '#0f172a', background: '#f8fafc' }}>
                <option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="30">30</option>
              </select>
            </SettingRow>
            <SettingRow label="Breaking News Ticker" desc="Show breaking news at top of page"><Toggle value={breakingTicker} onChange={setBreakingTicker} /></SettingRow>
            <SettingRow label="Comment System" desc="Allow reader comments on articles"><Toggle value={commentsEnabled} onChange={setCommentsEnabled} /></SettingRow>
            <SettingRow label="Maintenance Mode" desc="Take site offline temporarily"><Toggle value={maintenanceMode} onChange={setMaintenanceMode} /></SettingRow>
            
            {/* Custom Domain Section */}
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Custom Domain</h4>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Connect your own domain to your news website. <a href="/admin/domains" style={{ color: '#dc2626', textDecoration: 'none' }}>Manage domains →</a></p>
            </div>
          </>
        )}

        {activeTab === 'theme' && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Theme Settings</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Customize your portal's appearance</p>
            <SettingRow label="Primary Color" desc="Main brand color">
              <ColorPicker value={primaryColor} onChange={setPrimaryColor} label="Primary Color" />
            </SettingRow>
            <SettingRow label="Secondary Color" desc="Supporting brand color">
              <ColorPicker value={secondaryColor} onChange={setSecondaryColor} label="Secondary Color" />
            </SettingRow>
            <SettingRow label="Dark Mode" desc="Enable dark mode for readers"><Toggle value={darkMode} onChange={setDarkMode} /></SettingRow>
            <SettingRow label="Font Size" desc="Base font size for articles">
              <select value={fontSize} onChange={e => setFontSize(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', fontSize: 13, color: '#0f172a', background: '#f8fafc' }}>
                <option>Small (14px)</option><option>Medium (16px)</option><option>Large (18px)</option>
              </select>
            </SettingRow>
            <SettingRow label="Hero Layout">
              <select value={heroLayout} onChange={e => setHeroLayout(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', fontSize: 13, color: '#0f172a', background: '#f8fafc' }}>
                <option>Full Width Slider</option><option>Grid Layout</option><option>Single Large</option>
              </select>
            </SettingRow>
          </>
        )}

        {activeTab === 'email' && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Email Settings</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>SMTP and notification configuration</p>
            <SettingRow label="SMTP Host"><TextInput value={smtpHost} onChange={setSmtpHost} /></SettingRow>
            <SettingRow label="SMTP Port"><TextInput value={smtpPort} onChange={setSmtpPort} /></SettingRow>
            <SettingRow label="SMTP Username"><TextInput value={smtpUsername} onChange={setSmtpUsername} /></SettingRow>
            <SettingRow label="From Name"><TextInput value={siteName} onChange={setSiteName} /></SettingRow>
            <SettingRow label="Breaking News Alerts" desc="Email subscribers on breaking news"><Toggle value={breakingAlerts} onChange={setBreakingAlerts} /></SettingRow>
            <SettingRow label="Weekly Digest" desc="Send weekly news summary to subscribers"><Toggle value={weeklyDigest} onChange={setWeeklyDigest} /></SettingRow>
          </>
        )}

        {activeTab === 'social' && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Social Media</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Connect your social media accounts</p>
            {[
              { label: 'Facebook Page', value: facebookPage, setter: setFacebookPage },
              { label: 'Twitter / X', value: twitterHandle, setter: setTwitterHandle },
              { label: 'Instagram', value: instagramHandle, setter: setInstagramHandle },
              { label: 'YouTube Channel', value: youtubeChannel, setter: setYoutubeChannel },
              { label: 'WhatsApp Channel', value: whatsappChannel, setter: setWhatsappChannel },
            ].map((item, index) => (
              <SettingRow key={index} label={item.label}><TextInput value={item.value} onChange={item.setter} /></SettingRow>
            ))}
            <SettingRow label="Auto-share on Publish" desc="Post to all channels when article published"><Toggle value={autoShare} onChange={setAutoShare} /></SettingRow>
          </>
        )}

        {activeTab === 'api' && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>API Keys</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Sensitive integrations are managed through deployment environment variables.</p>
            <div className="rounded-xl border border-dashed border-gray-200 bg-slate-50 p-4 text-sm text-gray-600">
              Store analytics, messaging, mapping, and AI credentials in environment variables only. They are not written to `site_settings`.
            </div>
          </>
        )}

        {activeTab === 'backup' && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Backup & Restore</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Manage database and file backups</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Last Backup', value: '31 May 2026, 3:00 AM', color: '#16a34a' },
                { label: 'Backup Size', value: '2.4 GB', color: '#0891b2' },
                { label: 'Next Scheduled', value: '1 Jun 2026, 3:00 AM', color: '#7c3aed' },
                { label: 'Backup Location', value: 'AWS S3 (ap-south-1)', color: '#f59e0b' },
              ].map((item, index) => (
                <div key={index} className="rounded-lg p-4" style={{ background: '#f8fafc' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <SettingRow label="Auto Backup" desc="Daily automatic backups at 3:00 AM"><Toggle value={autoBackup} onChange={setAutoBackup} /></SettingRow>
            <SettingRow label="Backup Retention" desc="How long to keep old backups">
              <select value={backupRetention} onChange={e => setBackupRetention(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', fontSize: 13, color: '#0f172a', background: '#f8fafc' }}>
                <option>7 days</option><option>30 days</option><option>90 days</option>
              </select>
            </SettingRow>
          </>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
          <button onClick={() => void save()} disabled={saving} className="flex items-center gap-2" style={{ padding: '8px 24px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
