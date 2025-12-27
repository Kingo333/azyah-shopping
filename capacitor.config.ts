import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.azyah.style',
  appName: 'Azyah Style',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    // Enable URL scheme handling for deep links
    // Supabase auth redirects will use com.azyah.style:// scheme
  },
  plugins: {
    // Enable app URL open handling for OAuth and email callbacks
    App: {
      // This enables handling of custom URL schemes
    }
  },
  // For development: connect to the sandbox preview
  // Comment this out for production builds
  server: {
    url: 'https://fdc5efa8-4b59-4f52-b897-9383ae6220cb.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
