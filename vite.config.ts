import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from 'node:child_process';

// Build identifier injected into the AR HUD so screenshots can be linked
// back to a specific commit. Hardcoded BUILD_ID was masking which version
// was deployed during AR debugging — now updates every build.
const buildId = (() => {
  const ts = new Date().toISOString().slice(0, 16).replace(':', '');
  try {
    return `${execSync('git rev-parse --short HEAD').toString().trim()}-${ts}`;
  } catch {
    return `local-${ts}`;
  }
})();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Allow tunnel hosts (ngrok / cloudflared / any) for mobile AR testing.
    // Dev-only — production builds don't run this server.
    allowedHosts: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
          'charts': ['echarts', 'echarts-for-react', 'recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
