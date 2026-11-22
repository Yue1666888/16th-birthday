import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // Keep the running development optimizer separate from the E2E auth alias.
    cacheDir: 'node_modules/.vite-dev',
    plugins: [react(), tailwindcss()],
    optimizeDeps: { include: ['keycloak-js'] },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'visitor-three-core',
                test: /three[/\\]build[/\\]three\.core\.js$/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:16621',
          changeOrigin: true,
        },
      },
    },
  }
})
