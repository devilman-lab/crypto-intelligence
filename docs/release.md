# Release process

## Versioning

A single version lives in `package.json` (`version`). It is displayed in Settings → Application, embedded in the installer name (`Crypto-Intelligence-Setup-<version>.exe`), written into backups (`appVersion`) and read by the website's download page from `website/src/lib/release.ts`. Bump it with `npm version <patch|minor|major> --no-git-tag-version`, then update `website/src/lib/release.ts` to match.

## Pre-flight

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All four must pass. Launch the built app once (`env -u ELECTRON_RUN_AS_NODE npx electron .` from a VS Code terminal, or `npx electron .` elsewhere) and check Dashboard, Markets and Settings.

## Packaging (Windows)

```bash
npm run package        # → release/<version>/Crypto-Intelligence-Setup-<version>.exe
npm run package:dir    # unpacked directory only, for quick smoke tests
```

`electron-builder.yml`:

- NSIS installer, per-user, with an install-directory prompt and desktop/start-menu shortcuts.
- `npmRebuild: false` — `better-sqlite3` ships Node-API prebuilds, so no C++ toolchain is needed on the build machine; `asarUnpack` keeps the native binary outside the asar.
- `publish.provider: github` — electron-updater reads `latest.yml` from GitHub Releases of the configured repository.

### Code signing

Unsigned installers trigger SmartScreen warnings. Before a public release, set `CSC_LINK` / `CSC_KEY_PASSWORD` (or use an Azure Trusted Signing / EV certificate configuration) in the environment of the packaging step. Never commit certificates.

## Publishing

1. Build the installer on a clean Windows machine (or CI runner).
2. Create a GitHub release tagged `v<version>`; upload `Crypto-Intelligence-Setup-<version>.exe`, `Crypto-Intelligence-Setup-<version>.exe.blockmap` and `latest.yml` (electron-builder produces all three).
3. Update the website (`website/src/lib/release.ts`: version, date, download URL, SHA-256) and deploy it.
4. Installed apps will offer the new version through Settings → Check for updates.

## Testing an installer

On a clean Windows 10/11 VM: run the installer, launch the app, confirm the database is created under `%APPDATA%\Crypto Intelligence`, that market data loads, and that uninstalling leaves user data in place (the uninstaller does not delete `%APPDATA%`).
