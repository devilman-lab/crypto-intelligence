// Lists the artifacts in release/<version>/ and writes a SHA-256 checksum file next to each executable.
// Usage: node scripts/release-artifacts.mjs   (run automatically by the dist:* scripts)
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const version = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version
const dir = resolve('release', version)
const artifacts = readdirSync(dir).filter((f) => f.endsWith('.exe'))
if (artifacts.length === 0) {
  console.error(`No .exe artifacts found in ${dir}`)
  process.exit(1)
}
console.log(`\nRelease artifacts (${dir}):`)
for (const file of artifacts) {
  const full = join(dir, file)
  const sha256 = createHash('sha256').update(readFileSync(full)).digest('hex')
  writeFileSync(`${full}.sha256`, `${sha256} *${file}\n`)
  const mb = (statSync(full).size / 1024 / 1024).toFixed(1)
  console.log(`  ${file}\n    size   ${mb} MB\n    sha256 ${sha256}\n    -> ${full}`)
}
