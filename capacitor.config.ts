import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.azyah.style',
  appName: 'Azyah Style',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  plugins: {
    App: {}
  }
  // DEVELOPMENT ONLY - Uncomment for hot-reload during local dev:
  // server: {
  //   url: 'https://fdc5efa8-4b59-4f52-b897-9383ae6220cb.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
