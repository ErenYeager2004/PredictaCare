import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/', // <-- Ensure this is set explicitly

  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
  },

  define: {
    'process.env': process.env,
  },
})
