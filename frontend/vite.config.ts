import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // expõe na LAN para acesso pelo celular (PWA)
    port: 5173,
    proxy: {
      // Repassa /api/* pro backend FastAPI, evita CORS pelo celular
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // Document AI pode demorar 15s+ processando NF; o default do Vite
        // (~30s) costuma bastar mas em conexao mobile lenta o body do upload
        // demora pra chegar. Subo pra 120s.
        timeout: 120_000,
        proxyTimeout: 120_000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            // eslint-disable-next-line no-console
            console.error('[vite-proxy] error:', err.message);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            if (req.method === 'POST' && req.url?.includes('parse-nf')) {
              // eslint-disable-next-line no-console
              console.log('[vite-proxy] forwarding parse-nf, content-length:', req.headers['content-length']);
            }
          });
        },
      },
    },
  },
})
