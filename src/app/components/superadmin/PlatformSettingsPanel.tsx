import { useState, useEffect } from 'react';
import { getPaymentConfig, updatePaymentConfig, type PaymentConfig } from '../../lib/superAdmin';

export function PlatformSettingsPanel() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    upi_id: '',
    merchant_name: '',
    monthly_price: 499,
    yearly_price: 5599,
    trial_days: 7,
    grace_period_days: 3,
    android_app_addon_price: 3000,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    const data = await getPaymentConfig();
    if (data) {
      setConfig(data);
      setFormData({
        upi_id: data.upi_id,
        merchant_name: data.merchant_name,
        monthly_price: data.monthly_price,
        yearly_price: data.yearly_price,
        trial_days: data.trial_days,
        grace_period_days: data.grace_period_days,
        android_app_addon_price: data.android_app_addon_price,
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    const confirmed = confirm('Are you sure you want to update platform settings? This affects all customers.');
    if (!confirmed) return;

    setSaving(true);
    const result = await updatePaymentConfig(formData);
    if (result.success) {
      alert('Settings updated successfully');
      loadConfig();
    } else {
      alert(`Error: ${result.error}`);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Payment Configuration</h2>

        <div className="space-y-6">
          {/* UPI Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Merchant Name
              </label>
              <input
                type="text"
                value={formData.merchant_name}
                onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-md font-bold text-slate-900 mb-4">Subscription Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monthly Price (₹)
                </label>
                <input
                  type="number"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Yearly Price (₹)
                </label>
                <input
                  type="number"
                  value={formData.yearly_price}
                  onChange={(e) => setFormData({ ...formData, yearly_price: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Android App Add-on (₹)
                </label>
                <input
                  type="number"
                  value={formData.android_app_addon_price}
                  onChange={(e) => setFormData({ ...formData, android_app_addon_price: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Trial & Grace Period */}
          <div>
            <h3 className="text-md font-bold text-slate-900 mb-4">Trial & Grace Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trial Period (days)
                </label>
                <input
                  type="number"
                  value={formData.trial_days}
                  onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Grace Period (days)
                </label>
                <input
                  type="number"
                  value={formData.grace_period_days}
                  onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={loadConfig}
              disabled={saving}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Current Values Display */}
      {config && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Current Active Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">UPI ID</p>
              <p className="text-slate-900 font-mono">{config.upi_id}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Monthly</p>
              <p className="text-slate-900 font-bold">₹{config.monthly_price}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Yearly</p>
              <p className="text-slate-900 font-bold">₹{config.yearly_price}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Trial</p>
              <p className="text-slate-900 font-bold">{config.trial_days} days</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
