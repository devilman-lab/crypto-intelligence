# Release process

## Distribution formats

| Format | Artifact | Data location | Updates |
| --- | --- | --- | --- |
| **Installer** (NSIS, per-user) | `Crypto-Intelligence-Setup-<version>.exe` | `%APPDATA%\Crypto Intelligence\` | In-app check via electron-updater (`latest.yml`) |
| **Portable** (single self-extracting exe) | `Crypto-Intelligence-Portable-<version>.exe` | `<folder of the exe>\Crypto Intelligence Data\` | Manual: download the new exe and replace the old one |

Both are produced from the same build by electron-builder; neither requires administrator rights, Node.js, Python or any runtime on the target machine.

## Versioning

A single version lives in `package.json` (`version`). It is displayed in Settings → Application, embedded in both artifact names, written into backups (`appVersion`) and read by the website from `website/src/lib/release.ts` (`VERSION`). Bump it with `npm version <patch|minor|major> --no-git-tag-version`, then update `VERSION` in `website/src/lib/release.ts` (the `packaging.test.ts` suite fails if they diverge).

## Pre-flight

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All four must pass. Launch the built app once (`env -u ELECTRON_RUN_AS_NODE npx electron .` from a VS Code terminal, or `npx electron .` elsewhere) and check Dashboard, Markets and Settings.

## Building the artifacts

```bash
npm run dist:installer   # typecheck + build + NSIS installer            → release/<version>/Crypto-Intelligence-Setup-<version>.exe
npm run dist:portable    # typecheck + build + portable executable       → release/<version>/Crypto-Intelligence-Portable-<version>.exe
npm run dist:all         # both targets in one electron-builder run (also `npm run package`)
npm run package:dir      # unpacked directory only, for quick smoke tests → release/<version>/win-unpacked/
```

Every `dist:*` script ends with `node scripts/release-artifacts.mjs`, which prints the exact path, size and SHA-256 of each `.exe` and writes `<file>.sha256` next to it (`<hash> *<file>` format, verifiable with `sha256sum -c`). The build fails loudly if type checking, bundling or packaging fails.

`electron-builder.yml` essentials:

- `win.target`: `nsis` and `portable`, both x64. Artifact names are set **per target** (`nsis.artifactName`, `portable.artifactName`) so the two executables never collide.
- `nsis`: per-user, install-directory prompt, desktop/start-menu shortcuts.
- `portable`: `requestExecutionLevel: user` (no UAC prompt). The launcher unpacks the program into a per-launch `%TEMP%` folder, runs it and deletes that folder on exit; it passes `PORTABLE_EXECUTABLE_DIR` / `PORTABLE_EXECUTABLE_FILE` to the app, which is how portable mode is detected (see [architecture.md](architecture.md#data-location-and-portable-mode)).
- `npmRebuild: false` — `better-sqlite3` ships Node-API prebuilds; `asarUnpack` keeps the native binary outside the asar. Non-Windows prebuilds are excluded from the package.
- `publish.provider: github` — electron-updater reads `latest.yml` from GitHub Releases. `latest.yml` only references the installer; the portable exe is deliberately not an update target.

Output of a full build:

```
release/<version>/
  Crypto-Intelligence-Setup-<version>.exe            installer
  Crypto-Intelligence-Setup-<version>.exe.blockmap   differential-update metadata
  Crypto-Intelligence-Setup-<version>.exe.sha256
  Crypto-Intelligence-Portable-<version>.exe         portable (single file)
  Crypto-Intelligence-Portable-<version>.exe.sha256
  latest.yml                                         update manifest (installer only)
  win-unpacked/                                      intermediate, not distributed
```

## Portable build: behaviour and limitations

- **Data folder.** On first launch the app creates `Crypto Intelligence Data\` next to the exe with `database\crypto-intelligence.db`, `logs\`, `cache\` (Chromium profile) and, once used, `backups\` (the default location offered by the backup/CSV dialogs). Moving or copying the exe **together with this folder** moves all data; the app never deletes it.
- **Read-only locations.** If the exe's folder is not writable (CD/DVD, a protected folder, some network shares), the app falls back to `%LOCALAPPDATA%\Crypto Intelligence Portable\`, logs the rejected path and shows a one-time notice at start-up telling the user where the data went. If neither location is writable it shows an error and exits — data is never written into the exe, the asar or the temporary extraction folder.
- **Custom location.** Setting the environment variable `CRYPTO_INTELLIGENCE_DATA_DIR` before launching overrides the location for either build (Settings shows mode "custom").
- **Start-up time.** Every launch extracts ~380 MB into `%TEMP%` (LZMA), which adds several seconds compared with the installed version and needs that much free space on the system drive.
- **Network shares / USB.** USB drives work. Running the database over SMB is not recommended by SQLite (WAL locking); prefer copying the exe and data folder locally.
- **Two copies.** Two portable copies in different folders have independent data. A portable copy and an installed copy also do not share data.
- **No self-update.** Settings → Check for updates reports that the portable build must be updated by downloading the new exe; the app never replaces or deletes its own executable.

## Code signing and SmartScreen

Both executables are **unsigned** unless signing is configured. Windows SmartScreen may warn on either file until the publisher has reputation; portable packaging does not avoid that warning. Before public distribution set `CSC_LINK` / `CSC_KEY_PASSWORD` (or an Azure Trusted Signing / EV configuration) in the environment of the build step — electron-builder then signs the installer, its uninstaller and the portable exe with the same certificate. Never commit certificates. Tell users to download only from the official releases page and to compare the SHA-256 shown on the website with the `.sha256` file.

## Publishing

1. Build on a clean Windows machine (or CI runner): `npm run dist:all`.
2. Create a GitHub release tagged `v<version>`; upload the installer, its `.blockmap`, `latest.yml`, the portable exe and both `.sha256` files.
3. Update `website/src/lib/release.ts`: `VERSION`, `date`, both `sha256` values, `sizeLabel`s, and set `ASSETS_PUBLISHED = true` so the download buttons link to the assets instead of the releases page. Rebuild and deploy the site (`cd website && npm run build`).
4. Installed apps will offer the new version through Settings → Check for updates; portable users download the new exe.

## Testing a release

Installer, on a clean Windows 10/11 VM: run the installer, launch, confirm `%APPDATA%\Crypto Intelligence` is created and market data loads; uninstall and confirm user data is left in place.

Portable, on a clean VM: copy only the `.exe` to a writable folder, double-click it, confirm no wizard or UAC prompt, that `Crypto Intelligence Data\` appears next to it and that data survives a restart and a move of exe + folder. Also try a read-only folder and confirm the fallback notice.

Automated coverage of the same logic: `tests/dataLocation.test.ts` (mode/path resolution, fallback, errors), `tests/persistence.test.ts` (restart and move of the data folder), `tests/packaging.test.ts` (electron-builder targets, names, scripts, website manifest).
