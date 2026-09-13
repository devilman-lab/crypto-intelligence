import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

const sharedAlias = { '@shared': resolve(__dirname, 'shared') }

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: { input: { index: resolve(__dirname, 'electron/main/main.ts') } }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: { input: { index: resolve(__dirname, 'electron/preload/preload.ts') } }
    }
  },
  renderer: {
    root: '.',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': resolve(__dirname, 'src'), ...sharedAlias }
    },
    build: {
      rollupOptions: { input: { index: resolve(__dirname, 'index.html') } }
    }
  }
})
