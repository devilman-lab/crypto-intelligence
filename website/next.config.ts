import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // The repository has its own package-lock.json one level up; tell Turbopack this folder is the project root.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) }
}

export default nextConfig
