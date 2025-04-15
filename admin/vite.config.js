import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // Set server port for development
  server: {
    port: 5174, // Admin panel specific port
  },

  // Use environment variables for the backend URL (VITE_BACKEND_URL should be set in .env files)
  define: {
    'process.env': process.env,
  },
})
