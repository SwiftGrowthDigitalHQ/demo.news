/**
 * Google Analytics Manager Component (Simple Configuration)
 * 
 * NO OAuth required. Customer enters:
 * 1. Website Domain
 * 2. GA4 Measurement ID
 * 
 * Configuration saved to database with validation.
 * Tracking script injected on customer website when enabled.
 */

import { useState, useEffect } from 'react';
import { Loader2, Save, RefreshCw, CheckCircle2, XCircle, AlertCircle, BarChart3, Settings as SettingsIcon, Globe, Hash } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  getGA4Config,
  saveGA4Config,
  disableGA4Tracking,
  disconnectGA4,
  validateDomainFormat,
  validateMeasurementIdFormat,
  type GA4Config,
} from '../../../services/ga4Service';

export function GoogleAnalyticsManager() {
  const auth = useAuth();
  
  // Form state
  const [domain, setDomain] = useState('');
  const [measurementId, setMeasurementId] = useState('');
  
  // Configuration state
  const [config, setConfig] = useState<GA4Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Validation errors
  const [domainError, setDomainError] = useState<string | null>(null);
  const [measurementIdError, setMeasurementIdError] = useState<string | null>(null);
  
  // Message banner
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load configuration
  const loadConfig = async () => {
    if (!auth.ready || !auth.profile?.owned_tenant_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await getGA4Config(auth.profile.owned_tenant_id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load configuration');
      }

      if (result.data) {
        setConfig(result.data);
        
        // Populate form if configured
        if (result.data.domain) {
          setDomain(result.data.domain);
        }
        if (result.data.measurement_id) {
          setMeasurementId(result.data.measurement_id);
        }
      }
    } catch (error: any) {
      console.error('[GA4 Manager] Error loading config:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [auth.ready, auth.profile?.owned_tenant_id]);

  // Validate form inputs
  const validateForm = (): boolean => {
    let isValid = true;

    // Validate domain
    const domainValidation = validateDomainFormat(domain);
    if (!domainValidation.valid) {
      setDomainError(domainValidation.error || 'Invalid domain');
      isValid = false;
    } else {
      setDomainError(null);
    }

    // Validate measurement ID
    const measurementIdValidation = validateMeasurementIdFormat(measurementId);
    if (!measurementIdValidation.valid) {
      setMeasurementIdError(measurementIdValidation.error || 'Invalid measurement ID');
      isValid = false;
    } else {
      setMeasurementIdError(null);
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.profile?.owned_tenant_id) {
      setMessage({ type: 'error', text: 'No tenant context available' });
      return;
    }

    // Validate form
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix validation errors before submitting' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const result = await saveGA4Config({
        tenant_id: auth.profile.owned_tenant_id,
        domain: domain.trim(),
        measurement_id: measurementId.trim(),
        enable: true, // Enable tracking on connect
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      setMessage({ 
        type: 'success', 
        text: 'Google Analytics configured successfully! Tracking is now active.' 
      });

      // Reload configuration
      await loadConfig();
    } catch (error: any) {
      console.error('[GA4 Manager] Submit error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle disable
  const handleDisable = async () => {
    if (!auth.profile?.owned_tenant_id) {
      return;
    }

    if (!confirm('Disable Google Analytics tracking? Configuration will be kept.')) {
      return;
    }

    setActionInProgress(true);
    setMessage(null);

    try {
      const result = await disableGA4Tracking(auth.profile.owned_tenant_id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to disable tracking');
      }

      setMessage({ type: 'success', text: 'Google Analytics tracking disabled' });
      await loadConfig();
    } catch (error: any) {
      console.error('[GA4 Manager] Disable error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disable tracking' });
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!auth.profile?.owned_tenant_id) {
      return;
    }

    if (!confirm('Disconnect Google Analytics completely? All configuration will be removed.')) {
      return;
    }

    setActionInProgress(true);
    setMessage(null);

    try {
      const result = await disconnectGA4(auth.profile.owned_tenant_id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect');
      }

      setMessage({ type: 'success', text: 'Google Analytics disconnected successfully' });
      
      // Reset form
      setDomain('');
      setMeasurementId('');
      setConfig(null);
      setDomainError(null);
      setMeasurementIdError(null);
    } catch (error: any) {
      console.error('[GA4 Manager] Disconnect error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect' });
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle re-enable
  const handleEnable = async () => {
    if (!auth.profile?.owned_tenant_id || !config?.domain || !config?.measurement_id) {
      setMessage({ type: 'error', text: 'Configuration is incomplete' });
      return;
    }

    setActionInProgress(true);
    setMessage(null);

    try {
      const result = await saveGA4Config({
        tenant_id: auth.profile.owned_tenant_id,
        domain: config.domain,
        measurement_id: config.measurement_id,
        enable: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to enable tracking');
      }

      setMessage({ type: 'success', text: 'Google Analytics tracking enabled' });
      await loadConfig();
    } catch (error: any) {
      console.error('[GA4 Manager] Enable error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to enable tracking' });
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isConfigured = config?.configured || false;
  const isActive = config?.tracking_active || false;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Google Analytics 4
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your website to Google Analytics by entering your domain and measurement ID
          </p>
        </div>
        <button
          onClick={loadConfig}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`border rounded-lg p-4 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start gap-3">
            {message.type === 'success' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {message.type === 'error' && <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {message.type === 'info' && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{message.text}</p>
          </div>
        </div>
      )}

      {/* Status Card */}
      {isConfigured && (
        <div className={`border-2 rounded-lg p-6 ${
          isActive 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
            : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 rounded-lg p-3 shadow-md ${
              isActive ? 'bg-white' : 'bg-gray-100'
            }`}>
              <BarChart3 className={`h-12 w-12 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {isActive ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-700">Tracking Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-600">Tracking Disabled</span>
                  </>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold text-gray-700">Domain:</span>
                  <span className="text-gray-900">{config.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold text-gray-700">Measurement ID:</span>
                  <code className={`px-2 py-1 rounded border font-mono text-sm ${
                    isActive 
                      ? 'bg-white border-green-200 text-green-700' 
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}>
                    {config.measurement_id}
                  </code>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                {isActive ? (
                  <button
                    onClick={handleDisable}
                    disabled={actionInProgress}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {actionInProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Disable Tracking
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleEnable}
                    disabled={actionInProgress}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {actionInProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Enable Tracking
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleDisconnect}
                  disabled={actionInProgress}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <XCircle className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">
            {isConfigured ? 'Update Configuration' : 'Connect Google Analytics'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Website Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Website Domain
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="domain"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setDomainError(null);
                }}
                placeholder="example.com"
                className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  domainError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                disabled={submitting}
              />
            </div>
            {domainError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                {domainError}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Enter your website domain without http:// or www. (e.g., example.com)
            </p>
          </div>

          {/* GA4 Measurement ID */}
          <div>
            <label htmlFor="measurementId" className="block text-sm font-medium text-gray-700 mb-2">
              GA4 Measurement ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="measurementId"
                value={measurementId}
                onChange={(e) => {
                  setMeasurementId(e.target.value);
                  setMeasurementIdError(null);
                }}
                placeholder="G-XXXXXXXXXX"
                className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono ${
                  measurementIdError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                disabled={submitting}
              />
            </div>
            {measurementIdError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                {measurementIdError}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Find this in your Google Analytics Admin → Data Streams → Web Stream Details
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {isConfigured ? (
                <>Changes will be saved and tracking will remain {isActive ? 'enabled' : 'disabled'}</>
              ) : (
                <>Configuration will be saved and tracking will be enabled</>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {isConfigured ? 'Update Configuration' : 'Connect & Enable'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          How to find your GA4 Measurement ID
        </h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">1.</span>
            <span>Sign in to your Google Analytics account</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">2.</span>
            <span>Click <strong>Admin</strong> (gear icon in bottom left)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">3.</span>
            <span>Under <strong>Property</strong>, click <strong>Data Streams</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">4.</span>
            <span>Click your web stream</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">5.</span>
            <span>Copy the <strong>Measurement ID</strong> (starts with G-)</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
