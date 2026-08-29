import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import {
  getFooterSettings,
  updateFooterSettings,
  getFooterSocialLinks,
  createFooterSocialLink,
  updateFooterSocialLink,
  deleteFooterSocialLink,
  getFooterColumns,
  createFooterColumn,
  updateFooterColumn,
  deleteFooterColumn,
  getFooterLinks,
  createFooterLink,
  updateFooterLink,
  deleteFooterLink,
  getCustomPages,
  createCustomPage,
  updateCustomPage,
  deleteCustomPage,
  type FooterSettings,
  type FooterSocialLink,
  type FooterColumn,
  type FooterLink,
  type CustomPage,
} from '../../lib/footerApi';
import { FooterPreview } from '../FooterPreview';

export function FooterSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'social' | 'columns' | 'pages' | 'contact' | 'apps' | 'newsletter' | 'ads'>('brand');

  // Brand settings
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [footerLogoUrl, setFooterLogoUrl] = useState('');
  const [copyrightText, setCopyrightText] = useState('');

  // Contact settings
  const [contactEnabled, setContactEnabled] = useState(true);
  const [contactTitle, setContactTitle] = useState('Editorial Office');
  const [contactAddress, setContactAddress] = useState('');
  const [contactCity, setContactCity] = useState('');
  const [contactState, setContactState] = useState('');
  const [contactCountry, setContactCountry] = useState('');
  const [contactPostalCode, setContactPostalCode] = useState('');
  const [contactMapsUrl, setContactMapsUrl] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactHours, setContactHours] = useState('');

  // App downloads
  const [showGooglePlay, setShowGooglePlay] = useState(true);
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [googlePlayButtonText, setGooglePlayButtonText] = useState('Google Play');
  const [showAppStore, setShowAppStore] = useState(true);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [appStoreButtonText, setAppStoreButtonText] = useState('App Store');

  // Newsletter
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [newsletterTitle, setNewsletterTitle] = useState('Newsletter');
  const [newsletterDescription, setNewsletterDescription] = useState('Stay updated with the latest news');
  const [newsletterPlaceholder, setNewsletterPlaceholder] = useState('Enter your email');
  const [newsletterButtonText, setNewsletterButtonText] = useState('Subscribe');

  // Advertisement
  const [footerAdEnabled, setFooterAdEnabled] = useState(false);
  const [footerAdTitle, setFooterAdTitle] = useState('');
  const [footerAdDescription, setFooterAdDescription] = useState('');
  const [footerAdImageUrl, setFooterAdImageUrl] = useState('');
  const [footerAdButtonText, setFooterAdButtonText] = useState('Learn More');
  const [footerAdButtonUrl, setFooterAdButtonUrl] = useState('');

  // Social links
  const [socialLinks, setSocialLinks] = useState<FooterSocialLink[]>([]);
  const [showAddSocial, setShowAddSocial] = useState(false);

  // Columns & Links
  const [columns, setColumns] = useState<FooterColumn[]>([]);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [showAddColumn, setShowAddColumn] = useState(false);

  // Custom Pages
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [showAddPage, setShowAddPage] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const settings = await getFooterSettings();
      if (settings) {
        setBrandName(settings.brand_name || '');
        setTagline(settings.tagline || '');
        setDescription(settings.description || '');
        setLogoUrl(settings.logo_url || '');
        setFooterLogoUrl(settings.footer_logo_url || '');
        setCopyrightText(settings.copyright_text || '');
        
        setContactEnabled(settings.contact_enabled ?? true);
        setContactTitle(settings.contact_title || 'Editorial Office');
        setContactAddress(settings.contact_address || '');
        setContactCity(settings.contact_city || '');
        setContactState(settings.contact_state || '');
        setContactCountry(settings.contact_country || '');
        setContactPostalCode(settings.contact_postal_code || '');
        setContactMapsUrl(settings.contact_maps_url || '');
        setContactPhone(settings.contact_phone || '');
        setContactEmail(settings.contact_email || '');
        setContactWhatsapp(settings.contact_whatsapp || '');
        setContactHours(settings.contact_hours || '');
        
        setShowGooglePlay(settings.show_google_play ?? true);
        setGooglePlayUrl(settings.google_play_url || '');
        setGooglePlayButtonText(settings.google_play_button_text || 'Google Play');
        setShowAppStore(settings.show_app_store ?? true);
        setAppStoreUrl(settings.app_store_url || '');
        setAppStoreButtonText(settings.app_store_button_text || 'App Store');

        setNewsletterEnabled(settings.newsletter_enabled ?? true);
        setNewsletterTitle(settings.newsletter_title || 'Newsletter');
        setNewsletterDescription(settings.newsletter_description || 'Stay updated with the latest news');
        setNewsletterPlaceholder(settings.newsletter_placeholder || 'Enter your email');
        setNewsletterButtonText(settings.newsletter_button_text || 'Subscribe');

        setFooterAdEnabled(settings.footer_ad_enabled ?? false);
        setFooterAdTitle(settings.footer_ad_title || '');
        setFooterAdDescription(settings.footer_ad_description || '');
        setFooterAdImageUrl(settings.footer_ad_image_url || '');
        setFooterAdButtonText(settings.footer_ad_button_text || 'Learn More');
        setFooterAdButtonUrl(settings.footer_ad_button_url || '');
      }

      const social = await getFooterSocialLinks();
      setSocialLinks(social);

      const cols = await getFooterColumns();
      setColumns(cols);

      const lnks = await getFooterLinks();
      setLinks(lnks);

      const pages = await getCustomPages();
      setCustomPages(pages);
    } catch {
      toast.error('Failed to load footer settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const settings: FooterSettings = {
        brand_name: brandName || null,
        tagline: tagline || null,
        description: description || null,
        logo_url: logoUrl || null,
        footer_logo_url: footerLogoUrl || null,
        copyright_text: copyrightText || null,
        // Platform attribution locked - cannot be edited by tenant admin
        powered_by_text: null,
        powered_by_url: null,
        
        contact_enabled: contactEnabled,
        contact_title: contactTitle || null,
        contact_address: contactAddress || null,
        contact_city: contactCity || null,
        contact_state: contactState || null,
        contact_country: contactCountry || null,
        contact_postal_code: contactPostalCode || null,
        contact_maps_url: contactMapsUrl || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        contact_whatsapp: contactWhatsapp || null,
        contact_hours: contactHours || null,
        
        show_google_play: showGooglePlay,
        google_play_url: googlePlayUrl || null,
        google_play_button_text: googlePlayButtonText || null,
        show_app_store: showAppStore,
        app_store_url: appStoreUrl || null,
        app_store_button_text: appStoreButtonText || null,

        newsletter_enabled: newsletterEnabled,
        newsletter_title: newsletterTitle || null,
        newsletter_description: newsletterDescription || null,
        newsletter_placeholder: newsletterPlaceholder || null,
        newsletter_button_text: newsletterButtonText || null,

        footer_ad_enabled: footerAdEnabled,
        footer_ad_title: footerAdTitle || null,
        footer_ad_description: footerAdDescription || null,
        footer_ad_image_url: footerAdImageUrl || null,
        footer_ad_button_text: footerAdButtonText || null,
        footer_ad_button_url: footerAdButtonUrl || null,
      };

      await updateFooterSettings(settings);
      toast.success('Footer settings saved successfully');
      await load();
    } catch {
      toast.error('Failed to save footer settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSocial = async (platform: string, url: string, followers: string) => {
    try {
      await createFooterSocialLink({
        platform: platform as any,
        platform_name: platform.charAt(0).toUpperCase() + platform.slice(1),
        profile_url: url,
        follower_count: followers || null,
        enabled: true,
        sort_order: socialLinks.length,
      });
      toast.success('Social link added');
      await load();
      setShowAddSocial(false);
    } catch {
      toast.error('Failed to add social link');
    }
  };

  const handleDeleteSocial = async (id: string) => {
    if (!confirm('Delete this social link?')) return;
    try {
      await deleteFooterSocialLink(id);
      toast.success('Social link deleted');
      await load();
    } catch {
      toast.error('Failed to delete social link');
    }
  };

  const handleToggleSocial = async (id: string, enabled: boolean) => {
    try {
      await updateFooterSocialLink(id, { enabled: !enabled });
      await load();
    } catch {
      toast.error('Failed to update social link');
    }
  };

  const handleAddColumn = async (title: string) => {
    try {
      await createFooterColumn({
        title,
        enabled: true,
        sort_order: columns.length,
      });
      toast.success('Column added');
      await load();
      setShowAddColumn(false);
    } catch {
      toast.error('Failed to add column');
    }
  };

  const handleDeleteColumn = async (id: string) => {
    if (!confirm('Delete this column and all its links?')) return;
    try {
      await deleteFooterColumn(id);
      toast.success('Column deleted');
      await load();
    } catch {
      toast.error('Failed to delete column');
    }
  };

  const handleAddLink = async (columnId: string, title: string, url: string, linkType: string, customPageId?: string) => {
    try {
      await createFooterLink({
        column_id: columnId,
        title,
        url,
        link_type: linkType as any,
        custom_page_id: customPageId || null,
        is_external: linkType === 'external',
        enabled: true,
        sort_order: links.filter(l => l.column_id === columnId).length,
      });
      toast.success('Link added');
      await load();
    } catch {
      toast.error('Failed to add link');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Delete this link?')) return;
    try {
      await deleteFooterLink(id);
      toast.success('Link deleted');
      await load();
    } catch {
      toast.error('Failed to delete link');
    }
  };

  const handleAddPage = async (title: string, slug: string, content: string) => {
    try {
      await createCustomPage({
        title,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        content,
        enabled: true,
        sort_order: customPages.length,
      });
      toast.success('Page created');
      await load();
      setShowAddPage(false);
    } catch {
      toast.error('Failed to create page');
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    try {
      await deleteCustomPage(id);
      toast.success('Page deleted');
      await load();
    } catch {
      toast.error('Failed to delete page');
    }
  };

  const handleTogglePage = async (id: string, enabled: boolean) => {
    try {
      await updateCustomPage(id, { enabled: !enabled });
      await load();
    } catch {
      toast.error('Failed to update page');
    }
  };

  const handleReorderSocial = async (id: string, direction: 'up' | 'down') => {
    const index = socialLinks.findIndex(l => l.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === socialLinks.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const swapItem = socialLinks[newIndex];

    try {
      await updateFooterSocialLink(id, { sort_order: swapItem.sort_order });
      await updateFooterSocialLink(swapItem.id!, { sort_order: socialLinks[index].sort_order });
      await load();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleReorderColumn = async (id: string, direction: 'up' | 'down') => {
    const index = columns.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === columns.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const swapItem = columns[newIndex];

    try {
      await updateFooterColumn(id, { sort_order: swapItem.sort_order });
      await updateFooterColumn(swapItem.id!, { sort_order: columns[index].sort_order });
      toast.success('Column order saved');
      await load();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleReorderLink = async (columnId: string, id: string, direction: 'up' | 'down') => {
    const columnLinks = links
      .filter(l => l.column_id === columnId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = columnLinks.findIndex(l => l.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === columnLinks.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const swapItem = columnLinks[newIndex];

    try {
      await updateFooterLink(id, { sort_order: swapItem.sort_order });
      await updateFooterLink(swapItem.id!, { sort_order: columnLinks[index].sort_order });
      toast.success('Link order saved');
      await load();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleFollowerChange = async (id: string, value: string) => {
    // Optimistic local update so the preview reacts instantly; persisted on blur
    setSocialLinks(current => current.map(l => (l.id === id ? { ...l, follower_count: value } : l)));
  };

  const persistFollowerCount = async (id: string, value: string) => {
    const link = socialLinks.find(l => l.id === id);
    if (!link || (link.follower_count ?? '') === value) return;
    try {
      await updateFooterSocialLink(id, { follower_count: value || null });
      toast.success('Follower count updated');
    } catch {
      toast.error('Failed to update follower count');
    }
  };

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Loading footer settings...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Footer Settings</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Configure your website footer</p>
        </div>
        <button
          onClick={() => void save()}
          disabled={saving}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, 
            background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', 
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 320 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        {(['brand', 'social', 'columns', 'pages', 'contact', 'apps', 'newsletter', 'ads'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === tab ? '#dc2626' : '#64748b',
              borderBottom: activeTab === tab ? '2px solid #dc2626' : 'none',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'apps' ? 'App Downloads' : tab === 'pages' ? 'Custom Pages' : tab === 'ads' ? 'Advertisement' : tab}
          </button>
        ))}
      </div>

      {/* Brand Tab */}
      {activeTab === 'brand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Brand Name" value={brandName} onChange={setBrandName} />
          <Input label="Tagline" value={tagline} onChange={setTagline} />
          <TextArea label="Description" value={description} onChange={setDescription} rows={3} />
          <Input label="Logo URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." />
          <Input label="Footer Logo URL (optional)" value={footerLogoUrl} onChange={setFooterLogoUrl} placeholder="https://..." />
          <Input label="Copyright Text" value={copyrightText} onChange={setCopyrightText} placeholder="© 2026 Your Company" />
          
          {/* Platform Attribution - Locked */}
          <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Platform Attribution</h4>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              The following attribution is managed by the platform and cannot be changed:
            </div>
            <div style={{ padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginBottom: 4 }}>
                Powered by <a href="https://sangtx.com" target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'none' }}>SangTX</a>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>
                Design by <a href="https://swiftgrowthdigital.com" target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'none' }}>SwiftGrowthDigital</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Tab */}
      {activeTab === 'social' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Social Media Links</h3>
            <button
              onClick={() => setShowAddSocial(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              <Plus size={14} />
              Add Social
            </button>
          </div>

          {showAddSocial && <AddSocialForm onAdd={handleAddSocial} onCancel={() => setShowAddSocial(false)} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {socialLinks.map((link, index) => (
              <div key={link.id} style={{ padding: 16, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{link.platform_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{link.profile_url}</div>
                  <input
                    type="text"
                    value={link.follower_count ?? ''}
                    onChange={(e) => handleFollowerChange(link.id!, e.target.value)}
                    onBlur={(e) => persistFollowerCount(link.id!, e.target.value)}
                    placeholder="Follower count (e.g., 245K)"
                    style={{ marginTop: 4, width: '100%', maxWidth: 240, padding: '5px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 11 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleReorderSocial(link.id!, 'up')} disabled={index === 0} style={{ padding: 6, background: 'transparent', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>
                    <ChevronUp size={16} color="#64748b" />
                  </button>
                  <button onClick={() => handleReorderSocial(link.id!, 'down')} disabled={index === socialLinks.length - 1} style={{ padding: 6, background: 'transparent', border: 'none', cursor: index === socialLinks.length - 1 ? 'not-allowed' : 'pointer', opacity: index === socialLinks.length - 1 ? 0.3 : 1 }}>
                    <ChevronDown size={16} color="#64748b" />
                  </button>
                  <button onClick={() => handleToggleSocial(link.id!, link.enabled!)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    {link.enabled ? <Eye size={16} color="#10b981" /> : <EyeOff size={16} color="#64748b" />}
                  </button>
                  <button onClick={() => handleDeleteSocial(link.id!)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Columns Tab */}
      {activeTab === 'columns' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Footer Columns & Links</h3>
            <button
              onClick={() => setShowAddColumn(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              <Plus size={14} />
              Add Column
            </button>
          </div>

          {showAddColumn && <AddColumnForm onAdd={handleAddColumn} onCancel={() => setShowAddColumn(false)} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {columns.map((column, colIndex) => (
              <ColumnPanel
                key={column.id}
                column={column}
                links={links.filter(l => l.column_id === column.id)}
                onDeleteColumn={handleDeleteColumn}
                onAddLink={handleAddLink}
                onDeleteLink={handleDeleteLink}
                onReorderLink={handleReorderLink}
                onReorderColumn={handleReorderColumn}
                isFirst={colIndex === 0}
                isLast={colIndex === columns.length - 1}
                customPages={customPages}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Custom Pages</h3>
            <button
              onClick={() => setShowAddPage(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              <Plus size={14} />
              Add Page
            </button>
          </div>

          {showAddPage && <AddPageForm onAdd={handleAddPage} onCancel={() => setShowAddPage(false)} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {customPages.map(page => (
              <div key={page.id} style={{ padding: 16, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{page.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>/{page.slug}</div>
                  {page.seo_title && (
                    <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>SEO: {page.seo_title}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleTogglePage(page.id!, page.enabled!)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    {page.enabled ? <Eye size={16} color="#10b981" /> : <EyeOff size={16} color="#64748b" />}
                  </button>
                  <button onClick={() => handleDeletePage(page.id!)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={contactEnabled} onChange={(e) => setContactEnabled(e.target.checked)} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Enable Contact Section</span>
          </label>
          {contactEnabled && (
            <>
              <Input label="Contact Title" value={contactTitle} onChange={setContactTitle} />
              <Input label="Address" value={contactAddress} onChange={setContactAddress} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="City" value={contactCity} onChange={setContactCity} />
                <Input label="State" value={contactState} onChange={setContactState} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="Country" value={contactCountry} onChange={setContactCountry} />
                <Input label="Postal Code" value={contactPostalCode} onChange={setContactPostalCode} />
              </div>
              <Input label="Google Maps URL" value={contactMapsUrl} onChange={setContactMapsUrl} placeholder="https://maps.google.com/..." />
              <Input label="Phone" value={contactPhone} onChange={setContactPhone} placeholder="+1 234 567 8900" />
              <Input label="Email" value={contactEmail} onChange={setContactEmail} placeholder="contact@example.com" />
              <Input label="WhatsApp" value={contactWhatsapp} onChange={setContactWhatsapp} placeholder="+1 234 567 8900" />
              <Input label="Support Hours" value={contactHours} onChange={setContactHours} placeholder="Mon-Fri: 9AM-6PM" />
            </>
          )}
        </div>
      )}

      {/* Apps Tab */}
      {activeTab === 'apps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={showGooglePlay} onChange={(e) => setShowGooglePlay(e.target.checked)} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Show Google Play Button</span>
          </label>
          {showGooglePlay && (
            <>
              <Input label="Google Play URL" value={googlePlayUrl} onChange={setGooglePlayUrl} placeholder="https://play.google.com/..." />
              <Input label="Button Text" value={googlePlayButtonText} onChange={setGooglePlayButtonText} />
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <input type="checkbox" checked={showAppStore} onChange={(e) => setShowAppStore(e.target.checked)} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Show App Store Button</span>
          </label>
          {showAppStore && (
            <>
              <Input label="App Store URL" value={appStoreUrl} onChange={setAppStoreUrl} placeholder="https://apps.apple.com/..." />
              <Input label="Button Text" value={appStoreButtonText} onChange={setAppStoreButtonText} />
            </>
          )}
        </div>
      )}
      {/* Newsletter Tab */}
      {activeTab === 'newsletter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={newsletterEnabled} onChange={(e) => setNewsletterEnabled(e.target.checked)} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Show Newsletter Column</span>
          </label>
          {newsletterEnabled && (
            <>
              <Input label="Title" value={newsletterTitle} onChange={setNewsletterTitle} />
              <TextArea label="Description" value={newsletterDescription} onChange={setNewsletterDescription} rows={2} />
              <Input label="Input Placeholder" value={newsletterPlaceholder} onChange={setNewsletterPlaceholder} />
              <Input label="Button Text" value={newsletterButtonText} onChange={setNewsletterButtonText} />
            </>
          )}
        </div>
      )}

      {/* Advertisement Tab */}
      {activeTab === 'ads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={footerAdEnabled} onChange={(e) => setFooterAdEnabled(e.target.checked)} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Show Footer Advertisement</span>
          </label>
          {footerAdEnabled && (
            <>
              <Input label="Ad Title" value={footerAdTitle} onChange={setFooterAdTitle} />
              <TextArea label="Ad Description" value={footerAdDescription} onChange={setFooterAdDescription} rows={2} />
              <Input label="Image URL" value={footerAdImageUrl} onChange={setFooterAdImageUrl} placeholder="https://..." />
              <Input label="Button Text" value={footerAdButtonText} onChange={setFooterAdButtonText} />
              <Input label="Button URL" value={footerAdButtonUrl} onChange={setFooterAdButtonUrl} placeholder="https://..." />
            </>
          )}
        </div>
      )}

      </div>

      {/* Live Preview */}
      <aside style={{ width: 460, maxWidth: '100%', flexShrink: 0, position: 'sticky', top: 16 }}>
        <FooterPreview
          brandName={brandName}
          tagline={tagline}
          description={description}
          logoUrl={footerLogoUrl || logoUrl}
          copyrightText={copyrightText}
          // Platform attribution - always locked
          poweredByText="Powered by SangTX"
          poweredByUrl="https://sangtx.com"
          designByText="Design by SwiftGrowthDigital"
          designByUrl="https://swiftgrowthdigital.com"
          socialLinks={socialLinks.map(link => ({
            id: link.id!,
            platform: link.platform,
            platform_name: link.platform_name,
            profile_url: link.profile_url,
            follower_count: link.follower_count ?? null,
          }))}
          columns={columns.map(column => ({
            column: { id: column.id!, title: column.title },
            links: links
              .filter(l => l.column_id === column.id)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map(link => ({
                id: link.id!,
                title: link.title,
                url: link.url,
                is_external: link.is_external,
                open_new_tab: link.open_new_tab,
              })),
          }))}
          contact={{
            enabled: contactEnabled,
            title: contactTitle,
            address: contactAddress,
            city: contactCity,
            state: contactState,
            country: contactCountry,
            postalCode: contactPostalCode,
            mapsUrl: contactMapsUrl,
            phone: contactPhone,
            email: contactEmail,
            whatsapp: contactWhatsapp,
            hours: contactHours,
          }}
          apps={{
            showGooglePlay,
            googlePlayUrl,
            googlePlayButtonText,
            showAppStore,
            appStoreUrl,
            appStoreButtonText,
          }}
          newsletter={{
            enabled: newsletterEnabled,
            title: newsletterTitle,
            description: newsletterDescription,
            placeholder: newsletterPlaceholder,
            buttonText: newsletterButtonText,
          }}
          ad={{
            enabled: footerAdEnabled,
            title: footerAdTitle,
            description: footerAdDescription,
            imageUrl: footerAdImageUrl,
            buttonText: footerAdButtonText,
            buttonUrl: footerAdButtonUrl,
          }}
        />
      </aside>
      </div>
    </div>
  );
}
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows || 3}
        placeholder={placeholder}
        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical' }}
      />
    </div>
  );
}

function AddSocialForm({ onAdd, onCancel }: { onAdd: (platform: string, url: string, followers: string) => void; onCancel: () => void }) {
  const [platform, setPlatform] = useState('facebook');
  const [url, setUrl] = useState('');
  const [followers, setFollowers] = useState('');

  return (
    <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
          <option value="facebook">Facebook</option>
          <option value="twitter">Twitter/X</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="telegram">Telegram</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="linkedin">LinkedIn</option>
          <option value="threads">Threads</option>
          <option value="pinterest">Pinterest</option>
        </select>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <input type="text" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Follower count (e.g., 245K)" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onAdd(platform, url, followers)} disabled={!url} style={{ padding: '8px 16px', borderRadius: 6, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: !url ? 'not-allowed' : 'pointer', opacity: !url ? 0.5 : 1 }}>Add</button>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 6, background: '#f1f5f9', color: '#0f172a', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddColumnForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');

  return (
    <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Column title..." style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onAdd(title)} disabled={!title} style={{ padding: '8px 16px', borderRadius: 6, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: !title ? 'not-allowed' : 'pointer', opacity: !title ? 0.5 : 1 }}>Add</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 6, background: '#f1f5f9', color: '#0f172a', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function ColumnPanel({ column, links, onDeleteColumn, onAddLink, onDeleteLink, onReorderLink, onReorderColumn, isFirst, isLast, customPages }: {
  column: FooterColumn;
  links: FooterLink[];
  onDeleteColumn: (id: string) => void;
  onAddLink: (columnId: string, title: string, url: string, linkType: string, customPageId?: string) => void;
  onDeleteLink: (id: string) => void;
  onReorderLink: (columnId: string, id: string, direction: 'up' | 'down') => void;
  onReorderColumn: (id: string, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
  customPages: CustomPage[];
}) {
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<'system' | 'custom_page' | 'internal' | 'external'>('internal');
  const [selectedPageId, setSelectedPageId] = useState('');

  const systemPages = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about-us' },
    { label: 'Contact Us', path: '/contact-us' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
    { label: 'Terms & Conditions', path: '/terms-and-conditions' },
    { label: 'Disclaimer', path: '/disclaimer' },
    { label: 'Editorial Policy', path: '/editorial-policy' },
    { label: 'Advertise With Us', path: '/advertise-with-us' },
    { label: 'Cookie Policy', path: '/cookie-policy' },
    { label: 'Sitemap', path: '/sitemap' },
  ];

  const handleAdd = () => {
    let finalUrl = linkUrl;
    let customPageId: string | undefined;

    if (linkType === 'system') {
      finalUrl = linkUrl;
    } else if (linkType === 'custom_page' && selectedPageId) {
      const page = customPages.find(p => p.id === selectedPageId);
      if (page) {
        finalUrl = `/${page.slug}`;
        customPageId = selectedPageId;
      }
    }

    onAddLink(column.id!, linkTitle, finalUrl, linkType, customPageId);
    setLinkTitle('');
    setLinkUrl('');
    setLinkType('internal');
    setSelectedPageId('');
    setShowAddLink(false);
  };

  return (
    <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600 }}>{column.title}</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => onReorderColumn(column.id!, 'up')} disabled={isFirst} title="Move column up" style={{ padding: 4, background: 'transparent', border: 'none', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.3 : 1 }}>
            <ChevronUp size={16} color="#64748b" />
          </button>
          <button onClick={() => onReorderColumn(column.id!, 'down')} disabled={isLast} title="Move column down" style={{ padding: 4, background: 'transparent', border: 'none', cursor: isLast ? 'not-allowed' : 'pointer', opacity: isLast ? 0.3 : 1 }}>
            <ChevronDown size={16} color="#64748b" />
          </button>
          <button onClick={() => setShowAddLink(!showAddLink)} title="Add link" style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} color="#dc2626" />
          </button>
          <button onClick={() => onDeleteColumn(column.id!)} title="Delete column" style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={16} color="#ef4444" />
          </button>
        </div>
      </div>

      {showAddLink && (
        <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
          <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Link title..." style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 8 }} />
          
          <select value={linkType} onChange={(e) => setLinkType(e.target.value as any)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 8 }}>
            <option value="system">System Page</option>
            <option value="custom_page">Custom Page</option>
            <option value="internal">Internal URL</option>
            <option value="external">External URL</option>
          </select>

          {linkType === 'system' && (
            <select value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 8 }}>
              <option value="">Select page...</option>
              {systemPages.map(page => (
                <option key={page.path} value={page.path}>{page.label}</option>
              ))}
            </select>
          )}

          {linkType === 'custom_page' && (
            <select value={selectedPageId} onChange={(e) => setSelectedPageId(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 8 }}>
              <option value="">Select custom page...</option>
              {customPages.filter(p => p.enabled).map(page => (
                <option key={page.id} value={page.id}>{page.title}</option>
              ))}
            </select>
          )}

          {(linkType === 'internal' || linkType === 'external') && (
            <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={linkType === 'internal' ? '/category/news' : 'https://...'} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 8 }} />
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAdd} disabled={!linkTitle || (!linkUrl && !selectedPageId)} style={{ padding: '4px 12px', borderRadius: 4, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 600, border: 'none', cursor: (!linkTitle || (!linkUrl && !selectedPageId)) ? 'not-allowed' : 'pointer', opacity: (!linkTitle || (!linkUrl && !selectedPageId)) ? 0.5 : 1 }}>Add</button>
            <button onClick={() => setShowAddLink(false)} style={{ padding: '4px 12px', borderRadius: 4, background: '#f1f5f9', color: '#0f172a', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...links]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((link, linkIndex, sorted) => (
          <div key={link.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: '#f8fafc', borderRadius: 4 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{link.title}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{link.url}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={() => onReorderLink(column.id!, link.id!, 'up')} disabled={linkIndex === 0} title="Move link up" style={{ padding: 3, background: 'transparent', border: 'none', cursor: linkIndex === 0 ? 'not-allowed' : 'pointer', opacity: linkIndex === 0 ? 0.3 : 1 }}>
                <ChevronUp size={14} color="#64748b" />
              </button>
              <button onClick={() => onReorderLink(column.id!, link.id!, 'down')} disabled={linkIndex === sorted.length - 1} title="Move link down" style={{ padding: 3, background: 'transparent', border: 'none', cursor: linkIndex === sorted.length - 1 ? 'not-allowed' : 'pointer', opacity: linkIndex === sorted.length - 1 ? 0.3 : 1 }}>
                <ChevronDown size={14} color="#64748b" />
              </button>
              <button onClick={() => onDeleteLink(link.id!)} title="Delete link" style={{ padding: 3, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={14} color="#ef4444" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function AddPageForm({ onAdd, onCancel }: { onAdd: (title: string, slug: string, content: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === title.toLowerCase().replace(/\s+/g, '-')) {
      setSlug(value.toLowerCase().replace(/\s+/g, '-'));
    }
  };

  return (
    <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => handleTitleChange(e.target.value)} 
          placeholder="Page title..." 
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} 
        />
        <input 
          type="text" 
          value={slug} 
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
          placeholder="page-slug" 
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} 
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Page content (HTML supported)..."
          rows={6}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => onAdd(title, slug, content)} 
            disabled={!title || !slug || !content} 
            style={{ padding: '8px 16px', borderRadius: 6, background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: (!title || !slug || !content) ? 'not-allowed' : 'pointer', opacity: (!title || !slug || !content) ? 0.5 : 1 }}
          >
            Create Page
          </button>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 6, background: '#f1f5f9', color: '#0f172a', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
