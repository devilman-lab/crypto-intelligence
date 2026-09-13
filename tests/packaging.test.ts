import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { load } from 'js-yaml'

interface BuilderConfig {
  productName: string
  win: { target: { target: string; arch: string[] }[]; icon: string; artifactName?: string }
  nsis: { artifactName: string; perMachine: boolean; oneClick: boolean }
  portable: { artifactName: string; requestExecutionLevel: string }
  asarUnpack: string[]
  npmRebuild: boolean
  extraResources: { from: string; to: string }[]
}

const config = load(readFileSync(resolve('electron-builder.yml'), 'utf8')) as BuilderConfig
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string; scripts: Record<string, string> }
const targets = config.win.target.map((t) => t.target)

describe('electron-builder configuration', () => {
  it('builds both the NSIS installer and the portable executable for x64', () => {
    expect(targets).toContain('nsis')
    expect(targets).toContain('portable')
    for (const t of config.win.target) expect(t.arch).toEqual(['x64'])
  })

  it('names the artifacts per target so they cannot collide', () => {
    expect(config.win.artifactName).toBeUndefined()
    expect(config.nsis.artifactName).toBe('Crypto-Intelligence-Setup-${version}.${ext}')
    expect(config.portable.artifactName).toBe('Crypto-Intelligence-Portable-${version}.${ext}')
    const resolved = (n: string) => n.replace('${version}', pkg.version).replace('${ext}', 'exe')
    expect(resolved(config.nsis.artifactName)).toBe(`Crypto-Intelligence-Setup-${pkg.version}.exe`)
    expect(resolved(config.portable.artifactName)).toBe(`Crypto-Intelligence-Portable-${pkg.version}.exe`)
  })

  it('keeps the installer per-user and the portable exe at user execution level (no admin)', () => {
    expect(config.nsis.perMachine).toBe(false)
    expect(config.portable.requestExecutionLevel).toBe('user')
  })

  it('uses the application icon and product name', () => {
    expect(config.productName).toBe('Crypto Intelligence')
    expect(existsSync(resolve(config.win.icon))).toBe(true)
    expect(config.extraResources.some((r) => r.to === 'icon.png' && existsSync(resolve(r.from)))).toBe(true)
  })

  it('keeps the SQLite native module unpacked and never rebuilds it', () => {
    expect(config.asarUnpack).toContain('node_modules/better-sqlite3/**')
    expect(config.npmRebuild).toBe(false)
  })

  it('exposes dist scripts for installer, portable and both', () => {
    expect(pkg.scripts['dist:installer']).toMatch(/electron-builder --win nsis\b/)
    expect(pkg.scripts['dist:portable']).toMatch(/electron-builder --win portable\b/)
    expect(pkg.scripts['dist:all']).toMatch(/electron-builder --win nsis portable\b/)
    for (const s of ['dist:installer', 'dist:portable', 'dist:all']) {
      expect(pkg.scripts[s]).toMatch(/npm run typecheck/)
      expect(pkg.scripts[s]).toMatch(/npm run build/)
      expect(pkg.scripts[s]).toMatch(/release-artifacts\.mjs/)
    }
  })

  it('keeps the website release manifest in sync with the app version and artifact names', () => {
    const manifest = readFileSync(resolve('website/src/lib/release.ts'), 'utf8')
    expect(manifest).toContain(`const VERSION = '${pkg.version}'`)
    // The manifest derives file names from VERSION, so the templates must use the same artifact names as electron-builder.yml.
    expect(manifest).toContain('Crypto-Intelligence-Setup-${VERSION}.exe')
    expect(manifest).toContain('Crypto-Intelligence-Portable-${VERSION}.exe')
  })
})
