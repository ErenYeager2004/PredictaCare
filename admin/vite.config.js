import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/admin/', // 🔥 Important for correct asset paths in production

  plugins: [react(), tailwindcss()],

  server: {
    port: 5174, // Admin panel port (dev only)
  },

  define: {
    'process.env': process.env,
  },
})
