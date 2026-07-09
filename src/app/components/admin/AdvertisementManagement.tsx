import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Globe, IndianRupee, Plus, RefreshCw, Target, TrendingUp } from 'lucide-react';
import {
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import {
  AdminAd,
  CampaignRow,
  deleteAdminAd,
  deleteCampaign,
  listAdminAds,
  listCampaigns,
  loadSiteSettings,
  markAuditLog,
  upsertAdminAd,
  upsertCampaign,
  upsertSiteSettings,
} from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

type AdForm = {
  id?: string;
  placement: string;
  ad_type: 'adsense' | 'direct';
  advertiser_name: string;
  title: string;
  target_url: string;
  banner_url: string;
  position: string;
  start_date: string;
  end_date: string;
  click_count: string;
  impression_count: string;
  is_active: boolean;
  campaign_id: string;
  sponsored_article_id: string;
};

type CampaignForm = {
  id?: string;
  name: string;
  advertiser_name: string;
  campaign_type: 'adsense' | 'direct';
  status: string;
  budget: string;
  spent: string;
  impressions: string;
  clicks: string;
  start_date: string;
  end_date: string;
};

const emptyAd: AdForm = {
  placement: 'homepage-header-banner',
  ad_type: 'direct',
  advertiser_name: '',
  title: '',
  target_url: '',
  banner_url: '',
  position: '',
  start_date: '',
  end_date: '',
  click_count: '0',
  impression_count: '0',
  is_active: true,
  campaign_id: '',
  sponsored_article_id: '',
};

const emptyCampaign: CampaignForm = {
  name: '',
  advertiser_name: '',
  campaign_type: 'direct',
  status: 'draft',
  budget: '0',
  spent: '0',
  impressions: '0',
  clicks: '0',
  start_date: '',
  end_date: '',
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatPercent(clicks: number, impressions: number) {
  if (impressions <= 0) return '0.0% CTR';
  return `${((clicks / impressions) * 100).toFixed(1)}% CTR`;
}

export function AdvertisementManagement() {
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [siteName, setSiteName] = useState('');
  const [publisherId, setPublisherId] = useState('');
  const [adClient, setAdClient] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [autoAds, setAutoAds] = useState(true);
  const [pageLevelAds, setPageLevelAds] = useState(true);
  const [stickyMobile, setStickyMobile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAd, setOpenAd] = useState(false);
  const [openCampaign, setOpenCampaign] = useState(false);
  const [adForm, setAdForm] = useState<AdForm>(emptyAd);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(emptyCampaign);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    try {
      const [adRows, campaignRows, settings] = await Promise.all([
        listAdminAds(),
        listCampaigns(),
        loadSiteSettings(),
      ]);
      setAds(adRows);
      setCampaigns(campaignRows);
      const adConfig = (settings?.theme_config as Record<string, unknown> | undefined)?.ads as Record<string, unknown> | undefined;
      setSiteName(settings?.site_name ?? '');
      setPublisherId(String(adConfig?.publisher_id ?? ''));
      setAdClient(String(adConfig?.ad_client ?? ''));
      setFallbackMessage(String(adConfig?.fallback_message ?? 'Advertising space available'));
      setAutoAds(Boolean(adConfig?.auto_ads ?? true));
      setPageLevelAds(Boolean(adConfig?.page_level_ads ?? true));
      setStickyMobile(Boolean(adConfig?.sticky_mobile ?? true));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Failed to load ad settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const adStats = useMemo(() => {
    const totalRevenue = campaigns.reduce((sum, campaign) => sum + Number(campaign.spent ?? 0), 0);
    const activeCampaigns = campaigns.filter(campaign => campaign.status === 'Active' || campaign.status === 'active').length;
    const totalClicks = campaigns.reduce((sum, campaign) => sum + Number(campaign.clicks ?? 0), 0);
    const totalImpressions = campaigns.reduce((sum, campaign) => sum + Number(campaign.impressions ?? 0), 0);
    return { totalRevenue, activeCampaigns, totalClicks, totalImpressions };
  }, [campaigns]);

  const revenueSeries = useMemo(() => {
    const buckets = new Map<string, { month: string; sortKey: number; value: number }>();
    for (const campaign of campaigns) {
      const createdAt = new Date(campaign.created_at);
      const bucketDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
      const key = `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          month: bucketDate.toLocaleDateString('en-IN', { month: 'short' }),
          sortKey: bucketDate.getTime(),
          value: 0,
        });
      }
      const bucket = buckets.get(key);
      if (bucket) bucket.value += Number(campaign.spent ?? 0);
    }
    return [...buckets.values()].sort((a, b) => a.sortKey - b.sortKey).map(({ month, value }) => ({ month, value }));
  }, [campaigns]);

  const revenueSource = useMemo(() => {
    const adSenseRevenue = campaigns
      .filter(campaign => campaign.campaign_type === 'adsense')
      .reduce((sum, campaign) => sum + Number(campaign.spent ?? 0), 0);
    const directRevenue = campaigns
      .filter(campaign => campaign.campaign_type === 'direct')
      .reduce((sum, campaign) => sum + Number(campaign.spent ?? 0), 0);
    return [
      { name: 'Google AdSense', value: adSenseRevenue, color: '#dc2626' },
      { name: 'Direct Promotions', value: directRevenue, color: '#f59e0b' },
    ];
  }, [campaigns]);

  const directAds = useMemo(() => ads.filter(ad => ad.ad_type === 'direct').slice().sort((a, b) => Number(b.impression_count ?? 0) - Number(a.impression_count ?? 0)), [ads]);
  const sponsoredAds = useMemo(() => ads.filter(ad => ad.ad_type === 'adsense').slice().sort((a, b) => Number(b.impression_count ?? 0) - Number(a.impression_count ?? 0)), [ads]);
  const topCampaigns = useMemo(() => campaigns.slice().sort((a, b) => Number(b.spent ?? 0) - Number(a.spent ?? 0)).slice(0, 5), [campaigns]);

  const openAdEditor = (ad?: AdminAd) => {
    setAdForm(ad ? {
      id: ad.id,
      placement: ad.placement,
      ad_type: ad.ad_type,
      advertiser_name: ad.advertiser_name,
      title: ad.title,
      target_url: ad.target_url ?? '',
      banner_url: ad.banner_url ?? '',
      position: ad.position ?? '',
      start_date: ad.start_date ?? '',
      end_date: ad.end_date ?? '',
      click_count: String(ad.click_count ?? 0),
      impression_count: String(ad.impression_count ?? 0),
      is_active: ad.is_active,
      campaign_id: '',
      sponsored_article_id: '',
    } : emptyAd);
    setOpenAd(true);
  };

  const openCampaignEditor = (campaign?: CampaignRow) => {
    setCampaignForm(campaign ? {
      id: campaign.id,
      name: campaign.name,
      advertiser_name: campaign.advertiser_name,
      campaign_type: campaign.campaign_type,
      status: campaign.status,
      budget: String(campaign.budget ?? 0),
      spent: String(campaign.spent ?? 0),
      impressions: String(campaign.impressions ?? 0),
      clicks: String(campaign.clicks ?? 0),
      start_date: campaign.start_date ?? '',
      end_date: campaign.end_date ?? '',
    } : emptyCampaign);
    setOpenCampaign(true);
  };

  const saveAdSettings = async () => {
    setSaving(true);
    try {
      await upsertSiteSettings({
        site_name: siteName,
        theme_config: {
          ads: {
            publisher_id: publisherId,
            ad_client: adClient,
            fallback_message: fallbackMessage,
            auto_ads: autoAds,
            page_level_ads: pageLevelAds,
            sticky_mobile: stickyMobile,
          },
        } as Record<string, unknown>,
      });
      await markAuditLog({
        action: 'ads.settings.updated',
        entity_type: 'site_settings',
        metadata: { site_name: siteName },
      });
      toast.success('Ad settings saved.');
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save ad settings.');
    } finally {
      setSaving(false);
    }
  };

  const saveAd = async () => {
    if (!adForm.title.trim() || !adForm.advertiser_name.trim() || !adForm.placement.trim()) {
      toast.error('Ad title, advertiser, and placement are required.');
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertAdminAd({
        id: adForm.id,
        advertiser_name: adForm.advertiser_name.trim(),
        title: adForm.title.trim(),
        placement: adForm.placement.trim(),
        ad_type: adForm.ad_type,
        target_url: adForm.target_url.trim() || null,
        banner_url: adForm.banner_url.trim() || null,
        position: adForm.position.trim() || null,
        start_date: adForm.start_date || null,
        end_date: adForm.end_date || null,
        click_count: Number(adForm.click_count || 0),
        impression_count: Number(adForm.impression_count || 0),
        is_active: adForm.is_active,
        campaign_id: adForm.campaign_id.trim() || null,
        sponsored_article_id: adForm.sponsored_article_id.trim() || null,
      });
      await markAuditLog({
        action: adForm.id ? 'ad.updated' : 'ad.created',
        entity_type: 'advertisements',
        entity_id: (saved as { id?: string }).id ?? adForm.id ?? null,
        metadata: { title: adForm.title, placement: adForm.placement },
      });
      toast.success(adForm.id ? 'Ad updated.' : 'Ad created.');
      setOpenAd(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save ad.');
    } finally {
      setSaving(false);
    }
  };

  const saveCampaign = async () => {
    if (!campaignForm.name.trim() || !campaignForm.advertiser_name.trim()) {
      toast.error('Campaign name and advertiser are required.');
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertCampaign({
        id: campaignForm.id,
        name: campaignForm.name.trim(),
        advertiser_name: campaignForm.advertiser_name.trim(),
        campaign_type: campaignForm.campaign_type,
        status: campaignForm.status,
        budget: Number(campaignForm.budget || 0),
        spent: Number(campaignForm.spent || 0),
        impressions: Number(campaignForm.impressions || 0),
        clicks: Number(campaignForm.clicks || 0),
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
      });
      await markAuditLog({
        action: campaignForm.id ? 'campaign.updated' : 'campaign.created',
        entity_type: 'campaigns',
        entity_id: (saved as { id?: string }).id ?? campaignForm.id ?? null,
        metadata: { name: campaignForm.name, advertiser_name: campaignForm.advertiser_name },
      });
      toast.success(campaignForm.id ? 'Campaign updated.' : 'Campaign created.');
      setOpenCampaign(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  const removeAd = async (ad: AdminAd) => {
    if (!confirm(`Delete ad "${ad.title}"?`)) return;
    try {
      await deleteAdminAd(ad.id);
      await markAuditLog({
        action: 'ad.deleted',
        entity_type: 'advertisements',
        entity_id: ad.id,
        metadata: { title: ad.title },
      });
      toast.success('Ad deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete ad.');
    }
  };

  const removeCampaign = async (campaign: CampaignRow) => {
    if (!confirm(`Delete campaign "${campaign.name}"?`)) return;
    try {
      await deleteCampaign(campaign.id);
      await markAuditLog({
        action: 'campaign.deleted',
        entity_type: 'campaigns',
        entity_id: campaign.id,
        metadata: { name: campaign.name },
      });
      toast.success('Campaign deleted.');
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete campaign.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading advertisements...</div>;
  }

  const ctr = adStats.totalImpressions > 0 ? (adStats.totalClicks / adStats.totalImpressions) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Ad Revenue', value: formatMoney(adStats.totalRevenue), icon: IndianRupee },
          { label: 'Active Campaigns', value: String(adStats.activeCampaigns), icon: Target },
          { label: 'Total Clicks', value: adStats.totalClicks.toLocaleString('en-IN'), icon: Eye },
          { label: 'Total Impressions', value: adStats.totalImpressions.toLocaleString('en-IN'), icon: Globe },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className="text-lg font-semibold text-gray-900">{item.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">AdSense Settings</h3>
            <p className="text-sm text-gray-500">Live configuration stored in Supabase site settings.</p>
          </div>
          <Button className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Site Name</label>
            <Input value={siteName} onChange={event => setSiteName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Publisher ID</label>
            <Input value={publisherId} onChange={event => setPublisherId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ad Client</label>
            <Input value={adClient} onChange={event => setAdClient(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fallback Message</label>
            <Input value={fallbackMessage} onChange={event => setFallbackMessage(event.target.value)} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { label: 'Auto Ads', enabled: autoAds, setter: setAutoAds },
            { label: 'Page-Level Ads', enabled: pageLevelAds, setter: setPageLevelAds },
            { label: 'Sticky Mobile Ad', enabled: stickyMobile, setter: setStickyMobile },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">Live site setting.</div>
                </div>
                <Switch checked={item.enabled} onCheckedChange={item.setter} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => void saveAdSettings()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Revenue Dashboard</h3>
              <p className="text-sm text-gray-500">Campaign spend and performance from live rows.</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {ctr.toFixed(1)}% CTR
            </Badge>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              { label: 'Total Spend', value: formatMoney(adStats.totalRevenue), icon: IndianRupee },
              { label: 'Active Campaigns', value: String(adStats.activeCampaigns), icon: Target },
              { label: 'Total Clicks', value: adStats.totalClicks.toLocaleString('en-IN'), icon: Eye },
              { label: 'Total Impressions', value: adStats.totalImpressions.toLocaleString('en-IN'), icon: Globe },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{item.label}</div>
                      <div className="text-lg font-semibold text-gray-900">{item.value}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={value => `₹${Math.round(Number(value) / 1000)}k`} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff' }} formatter={(value: number) => [formatMoney(value), 'Spend']} />
                <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#dc2626' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900">Top Performing Ads</div>
              <div className="mt-4 space-y-3">
                {directAds.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">No records found</div>
                ) : (
                  directAds.slice(0, 4).map(item => (
                    <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{item.title}</div>
                          <div className="text-xs text-gray-500">{Number(item.impression_count ?? 0).toLocaleString('en-IN')} impressions</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{Number(item.click_count ?? 0).toLocaleString('en-IN')} clicks</div>
                          <div className="text-xs text-green-600">{formatPercent(Number(item.click_count ?? 0), Number(item.impression_count ?? 0))}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900">Source Mix</div>
              <div className="mt-3 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueSource} dataKey="value" innerRadius={35} outerRadius={60} paddingAngle={3}>
                      {revenueSource.map(item => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff' }} formatter={(value: number) => [formatMoney(value), 'Spend']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {revenueSource.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatMoney(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live Ad Inventory</h3>
              <p className="text-sm text-gray-500">Every card below is sourced from Supabase records.</p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => openAdEditor()}>
                <Plus className="h-4 w-4" />
                New Ad
              </Button>
              <Button variant="outline" onClick={() => openCampaignEditor()}>
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium text-gray-900">Direct Ads</div>
              <div className="space-y-3">
                {directAds.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">No records found</div>
                ) : (
                  paginate(directAds).map(item => (
                    <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{item.title}</div>
                          <div className="text-xs text-gray-500 truncate">{item.advertiser_name} · {item.placement}</div>
                        </div>
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Paused'}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-gray-500">{Number(item.impression_count ?? 0).toLocaleString('en-IN')} impressions</span>
                        <span className="font-medium text-gray-900">{formatPercent(Number(item.click_count ?? 0), Number(item.impression_count ?? 0))}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAdEditor(item)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => void removeAd(item)}>Delete</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Pagination total={directAds.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-gray-900">Campaigns</div>
              <div className="space-y-3">
                {topCampaigns.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">No records found</div>
                ) : (
                  topCampaigns.map(campaign => (
                    <div key={campaign.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{campaign.name}</div>
                          <div className="text-xs text-gray-500 truncate">{campaign.advertiser_name}</div>
                        </div>
                        <Badge variant="secondary">{campaign.status}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-slate-50 p-2">
                          <div className="text-xs text-gray-500">Spent</div>
                          <div className="font-medium text-gray-900">{formatMoney(Number(campaign.spent ?? 0))}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <div className="text-xs text-gray-500">Clicks</div>
                          <div className="font-medium text-gray-900">{Number(campaign.clicks ?? 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openCampaignEditor(campaign)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => void removeCampaign(campaign)}>Delete</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={openAd} onOpenChange={setOpenAd}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{adForm.id ? 'Edit Advertisement' : 'Create Advertisement'}</DialogTitle>
            <DialogDescription>Persist direct ad inventory to Supabase.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Input value={adForm.advertiser_name} onChange={event => setAdForm(current => ({ ...current, advertiser_name: event.target.value }))} placeholder="Advertiser Name" />
            <Input value={adForm.title} onChange={event => setAdForm(current => ({ ...current, title: event.target.value }))} placeholder="Ad Title" />
            <select value={adForm.placement} onChange={event => {
              const placement = event.target.value;
              const positionMap: Record<string, string> = {
                'homepage-header-banner': 'homepage_top_banner',
                'hero': 'homepage_mid_banner',
                'homepage-footer-banner': 'homepage_footer_banner',
                'sidebar': 'sidebar_top',
                'sidebar-middle': 'sidebar_middle',
                'sidebar-bottom': 'sidebar_bottom',
                'article-top': 'article_top',
                'article-middle': 'article_middle',
                'article-sidebar': 'article_sidebar',
              };
              setAdForm(current => ({ ...current, placement, position: positionMap[placement] || placement }));
            }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select Placement</option>
              <optgroup label="Homepage">
                <option value="homepage-header-banner">Homepage — Top Banner</option>
                <option value="hero">Homepage — Mid Banner (After Breaking)</option>
                <option value="homepage-footer-banner">Homepage — Footer Banner</option>
              </optgroup>
              <optgroup label="Sidebar">
                <option value="sidebar">Sidebar — Top</option>
                <option value="sidebar-middle">Sidebar — Middle</option>
                <option value="sidebar-bottom">Sidebar — Bottom</option>
              </optgroup>
              <optgroup label="Article Page">
                <option value="article-top">Article — Top Banner</option>
                <option value="article-middle">Article — Mid Banner (In Content)</option>
                <option value="article-sidebar">Article — Sidebar</option>
              </optgroup>
            </select>
            <Input value={adForm.ad_type} onChange={event => setAdForm(current => ({ ...current, ad_type: event.target.value as AdForm['ad_type'] }))} placeholder="Ad Type" />
            <Input value={adForm.target_url} onChange={event => setAdForm(current => ({ ...current, target_url: event.target.value }))} placeholder="Target URL" />
            <Input value={adForm.banner_url} onChange={event => setAdForm(current => ({ ...current, banner_url: event.target.value }))} placeholder="Banner URL" />
            <Input value={adForm.start_date} onChange={event => setAdForm(current => ({ ...current, start_date: event.target.value }))} placeholder="Start Date" />
            <Input value={adForm.end_date} onChange={event => setAdForm(current => ({ ...current, end_date: event.target.value }))} placeholder="End Date" />
            <Input value={adForm.click_count} onChange={event => setAdForm(current => ({ ...current, click_count: event.target.value }))} placeholder="Click Count" />
            <Input value={adForm.impression_count} onChange={event => setAdForm(current => ({ ...current, impression_count: event.target.value }))} placeholder="Impression Count" />
            <Input value={adForm.position} disabled className="bg-gray-100 cursor-not-allowed" placeholder="Auto-set from placement" />
            <Input value={adForm.campaign_id} onChange={event => setAdForm(current => ({ ...current, campaign_id: event.target.value }))} placeholder="Campaign ID" />
            <Input value={adForm.sponsored_article_id} onChange={event => setAdForm(current => ({ ...current, sponsored_article_id: event.target.value }))} placeholder="Sponsored Article ID" />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 p-4">
            <Switch checked={adForm.is_active} onCheckedChange={checked => setAdForm(current => ({ ...current, is_active: checked }))} />
            <span className="text-sm text-gray-700">Active advertisement</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAd(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={saveAd} disabled={saving}>{saving ? 'Saving...' : 'Save Ad'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCampaign} onOpenChange={setOpenCampaign}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{campaignForm.id ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>Persist campaign data to Supabase.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Input value={campaignForm.name} onChange={event => setCampaignForm(current => ({ ...current, name: event.target.value }))} placeholder="Campaign Name" />
            <Input value={campaignForm.advertiser_name} onChange={event => setCampaignForm(current => ({ ...current, advertiser_name: event.target.value }))} placeholder="Advertiser Name" />
            <Input value={campaignForm.campaign_type} onChange={event => setCampaignForm(current => ({ ...current, campaign_type: event.target.value as CampaignForm['campaign_type'] }))} placeholder="Campaign Type" />
            <Input value={campaignForm.status} onChange={event => setCampaignForm(current => ({ ...current, status: event.target.value }))} placeholder="Status" />
            <Input value={campaignForm.budget} onChange={event => setCampaignForm(current => ({ ...current, budget: event.target.value }))} placeholder="Budget" />
            <Input value={campaignForm.spent} onChange={event => setCampaignForm(current => ({ ...current, spent: event.target.value }))} placeholder="Spent" />
            <Input value={campaignForm.impressions} onChange={event => setCampaignForm(current => ({ ...current, impressions: event.target.value }))} placeholder="Impressions" />
            <Input value={campaignForm.clicks} onChange={event => setCampaignForm(current => ({ ...current, clicks: event.target.value }))} placeholder="Clicks" />
            <Input value={campaignForm.start_date} onChange={event => setCampaignForm(current => ({ ...current, start_date: event.target.value }))} placeholder="Start Date" />
            <Input value={campaignForm.end_date} onChange={event => setCampaignForm(current => ({ ...current, end_date: event.target.value }))} placeholder="End Date" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCampaign(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={saveCampaign} disabled={saving}>{saving ? 'Saving...' : 'Save Campaign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
