import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['.test', 'localhost'],
    proxy: {
      '/api/media-proxy': {
        target: 'https://csuocfxbucohfvowfwtq.supabase.co/functions/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            // Add aggressive caching for successful responses
            if (proxyRes.statusCode === 200 || proxyRes.statusCode === 302) {
              proxyRes.headers['cache-control'] = 'public, max-age=31536000, immutable';
            }
          });
        },
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          firebase: ['firebase/app', 'firebase/messaging'],
          charts: ['recharts'],
        },
      },
    },
  },
});
