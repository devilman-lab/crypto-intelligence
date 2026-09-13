# Security

## Electron configuration

[electron/main/window.ts](../electron/main/window.ts):

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`
- Renderer navigation is blocked except to the app's own origin; `window.open` is denied and `https:` links are handed to the OS browser.
- Content-Security-Policy in `index.html`: `default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data: https:` — the renderer cannot make network requests at all; asset icons are the only remote images.

## Preload bridge

[electron/preload/preload.ts](../electron/preload/preload.ts) exposes `window.api` with explicit functions per domain. There is no generic `invoke(channel)` escape hatch, no `ipcRenderer`, no filesystem, no paths the user did not pick.

## IPC validation

Every handler declares a zod schema for its argument tuple ([registry.ts](../electron/main/ipc/registry.ts)). Invalid calls are rejected with `VALIDATION` before reaching business code. Object schemas are `.strict()` so unknown keys are refused. Numeric inputs are bounded (quantities, prices, timestamps between 2000 and 2100, thresholds finite). Strings have length limits.

Errors are converted to `{ code, message }` with user-safe text; stack traces stay in the main-process log.

## Files and shell

- `app:openExternal` only accepts `https:` and `mailto:` URLs.
- `app:openPath` only opens the app's own data or log directory.
- Backup import/export uses native dialogs; the renderer never supplies a path.
- Imports are size-limited (200 MB), JSON-parsed defensively and schema-validated before any write.

## Paper trading

Simulated fills use the price held by the main process, never a price supplied by the renderer, and are refused when live prices are stale. The module has no code path to any exchange.

## Secrets and privacy

- No API keys exist in the code base; both providers are public endpoints.
- No user data leaves the machine. The log (electron-log) records operational events only: it never logs portfolio contents, journal text or personal information.
- The screenshot/diagnostic hooks (`CI_SCREENSHOT*`, `CI_OFFLINE`) are inert unless the corresponding environment variables are set when launching the process.

## Updates

`GitHubReleasesUpdateService` (electron-updater) is active only in packaged builds, never downloads without an explicit user action and never installs silently (`autoDownload: false`). Release artifacts should be code-signed before public distribution; see [release.md](release.md).
