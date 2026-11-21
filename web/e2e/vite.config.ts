import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
// Test-only alias: the production Vite configuration contains no authentication bypass.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: '@/auth/auth.client',
        replacement: fileURLToPath(new URL('./auth.stub.ts', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('../src', import.meta.url)),
      },
    ],
  },
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
})
