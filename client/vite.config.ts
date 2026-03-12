import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5233',
      '/GetMeasurements': 'http://localhost:5233',
      '/GetTurbines': 'http://localhost:5233',
      '/GetTurbineMetrics': 'http://localhost:5233',
      '/GetAlerts': 'http://localhost:5233',
      '/GetOperatorCommands': 'http://localhost:5233',
      '/SendTurbineCommand': 'http://localhost:5233',
      '/sse': { target: 'http://localhost:5233', ws: true },
      '/openapi.json': 'http://localhost:5233',
      '/swagger': 'http://localhost:5233',
    },
  },
})
