import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/GetMeasurements': 'http://localhost:8080',
      '/GetTurbines': 'http://localhost:8080',
      '/GetTurbineMetrics': 'http://localhost:8080',
      '/GetAlerts': 'http://localhost:8080',
      '/GetOperatorCommands': 'http://localhost:8080',
      '/SendTurbineCommand': 'http://localhost:8080',
      '/sse': { target: 'http://localhost:8080', ws: true },
      '/openapi.json': 'http://localhost:8080',
      '/swagger': 'http://localhost:8080',
    },
  },
})
