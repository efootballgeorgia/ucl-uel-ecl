/**
 * Configuration Management
 * 
 * This module handles application configuration including environment variables.
 * For production builds, these values should be injected at build time.
 */

// Default configuration
const defaultConfig = {
  supabase: {
    url: 'https://nturffjkprilmvqwbnml.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXJmZmprcHJpbG12cXdibm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDIxNzQsImV4cCI6MjA3NjM3ODE3NH0.wGNftRwd-AyBt38vKk2SfNwODdEhjIcmDXy9EQMAcuw'
  },
  app: {
    name: 'Efootball Georgia',
    version: '1.5.0',
    environment: 'development'
  },
  cache: {
    version: 5,
    staticCacheName: 'nekro-league-v5',
    dynamicCacheName: 'nekro-league-dynamic-v5'
  },
  analytics: {
    gaTrackingId: null,
    sentryDsn: null
  }
};

/**
 * Load configuration from window.__ENV__ (injected at runtime)
 * or fall back to default configuration
 */
function loadConfig() {
  // Check if environment variables were injected
  if (typeof window !== 'undefined' && window.__ENV__) {
    return {
      supabase: {
        url: window.__ENV__.SUPABASE_URL || defaultConfig.supabase.url,
        anonKey: window.__ENV__.SUPABASE_ANON_KEY || defaultConfig.supabase.anonKey
      },
      app: {
        name: window.__ENV__.APP_NAME || defaultConfig.app.name,
        version: window.__ENV__.APP_VERSION || defaultConfig.app.version,
        environment: window.__ENV__.APP_ENVIRONMENT || defaultConfig.app.environment
      },
      cache: {
        version: parseInt(window.__ENV__.CACHE_VERSION) || defaultConfig.cache.version,
        staticCacheName: `nekro-league-v${window.__ENV__.CACHE_VERSION || defaultConfig.cache.version}`,
        dynamicCacheName: `nekro-league-dynamic-v${window.__ENV__.CACHE_VERSION || defaultConfig.cache.version}`
      },
      analytics: {
        gaTrackingId: window.__ENV__.GA_TRACKING_ID || null,
        sentryDsn: window.__ENV__.SENTRY_DSN || null
      }
    };
  }
  
  return defaultConfig;
}

// Export the configuration
export const config = loadConfig();

// Helper function to check if running in production
export function isProduction() {
  return config.app.environment === 'production';
}

// Helper function to check if running in development
export function isDevelopment() {
  return config.app.environment === 'development';
}

// Log configuration in development (without sensitive data)
if (isDevelopment() && typeof console !== 'undefined') {
  console.log('🔧 App Configuration:', {
    name: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    cacheVersion: config.cache.version,
    supabaseConfigured: !!config.supabase.url && config.supabase.url !== defaultConfig.supabase.url
  });
}

export default config;
