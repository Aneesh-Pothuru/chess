import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: served from https://aneesh-pothuru.github.io/chess/ in production;
// plain / for local dev so localhost:5173 keeps working.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/chess/' : '/',
}))
