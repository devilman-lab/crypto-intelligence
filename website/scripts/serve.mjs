// Serves the static export in out/ exactly as a web host would (no dev compilation).
// Usage: npm run preview   → http://localhost:3000
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve('out')
const port = Number(process.env.PORT || 3000)
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain', '.woff2': 'font/woff2' }

if (!existsSync(root)) {
  console.error('out/ not found — run `npm run build` first.')
  process.exit(1)
}

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = normalize(join(root, urlPath))
  if (!file.startsWith(root)) {
    res.statusCode = 403
    return res.end()
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) {
    file = join(root, '404.html')
    res.statusCode = 404
  }
  res.setHeader('content-type', types[extname(file)] || 'application/octet-stream')
  createReadStream(file).pipe(res)
}).listen(port, () => console.log(`Serving static site at http://localhost:${port}`))
