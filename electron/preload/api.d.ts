import type { PreloadApi } from './preload'

declare global {
  interface Window {
    api: PreloadApi
  }
}

export {}
