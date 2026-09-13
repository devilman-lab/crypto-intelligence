/**
 * Single source of truth for the current release shown on the website.
 * Keep `version` in sync with the desktop app's package.json.
 */
export const release = {
  version: '0.1.0',
  date: '2026-09-14',
  /** Windows installer (NSIS). Points at the GitHub release asset for this version. */
  downloadUrl: 'https://github.com/crypto-intelligence/crypto-intelligence/releases/download/v0.1.0/Crypto-Intelligence-Setup-0.1.0.exe',
  releasesUrl: 'https://github.com/crypto-intelligence/crypto-intelligence/releases',
  fileName: 'Crypto-Intelligence-Setup-0.1.0.exe',
  /** Approximate installer size, shown for orientation. */
  sizeLabel: '~110 MB',
  requirements: ['Windows 10 or Windows 11 (64-bit)', 'Internet connection for live market data', 'About 300 MB of disk space'],
  /** SHA-256 of the installer; fill in after building the release. */
  sha256: ''
}
