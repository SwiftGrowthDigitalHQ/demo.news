/**
 * Google Analytics 4 Service
 * 
 * Simple domain + measurement ID configuration (NO OAuth required)
 * Calls Supabase database functions for validation and storage
 */

import { getSupabaseClient } from '../lib/supabase';

export interface GA4Config {
  enabled: boolean;
  domain: string | null;
  measurement_id: string | null;
  configured: boolean;
  tracking_active: boolean;
}

export interface SaveGA4ConfigParams {
  tenant_id: string;
  domain: string;
  measurement_id: string;
  enable?: boolean;
}

export interface GA4ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Get GA4 configuration for the current tenant
 */
export async function getGA4Config(tenantId: string): Promise<GA4ServiceResponse<GA4Config>> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    const { data, error } = await supabase.rpc('get_tenant_ga4_config', {
      p_tenant_id: tenantId
    });

    if (error) {
      console.error('Error fetching GA4 config:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch GA4 configuration'
      };
    }

    // RPC returns array, get first result or defaults
    const config = data && data.length > 0 ? data[0] : {
      enabled: false,
      domain: null,
      measurement_id: null,
      configured: false,
      tracking_active: false
    };

    return {
      success: true,
      data: config
    };
  } catch (error) {
    console.error('Unexpected error in getGA4Config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Save GA4 configuration (domain + measurement ID)
 */
export async function saveGA4Config(params: SaveGA4ConfigParams): Promise<GA4ServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    // Validate inputs before sending to database
    if (!params.domain || !params.domain.trim()) {
      return {
        success: false,
        error: 'Domain is required'
      };
    }

    if (!params.measurement_id || !params.measurement_id.trim()) {
      return {
        success: false,
        error: 'Measurement ID is required'
      };
    }

    // Basic client-side validation for measurement ID format
    const measurementIdPattern = /^G-[A-Z0-9]{10}$/i;
    if (!measurementIdPattern.test(params.measurement_id.trim())) {
      return {
        success: false,
        error: 'Invalid Measurement ID format. Must be G-XXXXXXXXXX (e.g., G-ABC1234567)'
      };
    }

    const { data, error } = await supabase.rpc('save_tenant_ga4_config', {
      p_tenant_id: params.tenant_id,
      p_domain: params.domain.trim(),
      p_measurement_id: params.measurement_id.trim().toUpperCase(),
      p_enable: params.enable !== false // Default to true
    });

    if (error) {
      console.error('Error saving GA4 config:', error);
      return {
        success: false,
        error: error.message || 'Failed to save GA4 configuration'
      };
    }

    // Database function returns JSONB with success/error
    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to save configuration'
        };
      }
      
      return {
        success: true,
        data: data.data,
        message: 'GA4 configuration saved successfully'
      };
    }

    return {
      success: true,
      message: 'GA4 configuration saved successfully'
    };
  } catch (error) {
    console.error('Unexpected error in saveGA4Config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Enable GA4 tracking
 */
export async function enableGA4Tracking(params: SaveGA4ConfigParams): Promise<GA4ServiceResponse> {
  return saveGA4Config({ ...params, enable: true });
}

/**
 * Disable GA4 tracking (keeps configuration)
 */
export async function disableGA4Tracking(tenantId: string): Promise<GA4ServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    const { data, error } = await supabase.rpc('disable_tenant_ga4', {
      p_tenant_id: tenantId
    });

    if (error) {
      console.error('Error disabling GA4:', error);
      return {
        success: false,
        error: error.message || 'Failed to disable GA4 tracking'
      };
    }

    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to disable tracking'
        };
      }
      
      return {
        success: true,
        message: data.message || 'GA4 tracking disabled successfully'
      };
    }

    return {
      success: true,
      message: 'GA4 tracking disabled successfully'
    };
  } catch (error) {
    console.error('Unexpected error in disableGA4Tracking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Disconnect GA4 (removes configuration completely)
 */
export async function disconnectGA4(tenantId: string): Promise<GA4ServiceResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not configured'
      };
    }

    const { data, error } = await supabase.rpc('disconnect_tenant_ga4', {
      p_tenant_id: tenantId
    });

    if (error) {
      console.error('Error disconnecting GA4:', error);
      return {
        success: false,
        error: error.message || 'Failed to disconnect GA4'
      };
    }

    if (data && typeof data === 'object') {
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to disconnect'
        };
      }
      
      return {
        success: true,
        message: data.message || 'GA4 disconnected successfully'
      };
    }

    return {
      success: true,
      message: 'GA4 disconnected successfully'
    };
  } catch (error) {
    console.error('Unexpected error in disconnectGA4:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Validate domain format (client-side pre-validation)
 */
export function validateDomainFormat(domain: string): { valid: boolean; error?: string } {
  if (!domain || !domain.trim()) {
    return { valid: false, error: 'Domain is required' };
  }

  const trimmed = domain.trim().toLowerCase();
  
  // Remove protocol if present
  let normalized = trimmed.replace(/^https?:\/\//, '');
  
  // Remove www. prefix
  normalized = normalized.replace(/^www\./, '');
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Remove any path
  normalized = normalized.split('/')[0];
  
  // Check if localhost
  if (normalized === 'localhost') {
    return { valid: true };
  }
  
  // Basic domain validation: must contain at least one dot
  const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainPattern.test(normalized)) {
    return { 
      valid: false, 
      error: 'Invalid domain format. Use format: example.com or subdomain.example.com' 
    };
  }
  
  return { valid: true };
}

/**
 * Validate measurement ID format (client-side pre-validation)
 */
export function validateMeasurementIdFormat(measurementId: string): { valid: boolean; error?: string } {
  if (!measurementId || !measurementId.trim()) {
    return { valid: false, error: 'Measurement ID is required' };
  }

  const trimmed = measurementId.trim().toUpperCase();
  const pattern = /^G-[A-Z0-9]{10}$/;
  
  if (!pattern.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid Measurement ID format. Must be G-XXXXXXXXXX (G- followed by 10 characters)' 
    };
  }
  
  return { valid: true };
}
