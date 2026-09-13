import { AppError, ErrorCodes } from '../errors'
import { createLogger } from '../logger'

const log = createLogger('http')

export interface HttpOptions {
  timeoutMs?: number
  retries?: number
  headers?: Record<string, string>
}

/**
 * Minimal rate limiter: guarantees at least `minIntervalMs` between request
 * starts and honours provider back-off (Retry-After / 429) by pausing.
 */
export class RateLimiter {
  private queue: Promise<void> = Promise.resolve()
  private nextAllowedAt = 0

  constructor(private readonly minIntervalMs: number) {}

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.nextAllowedAt - Date.now()
      if (wait > 0) await sleep(wait)
      this.nextAllowedAt = Date.now() + this.minIntervalMs
    })
    this.queue = run.catch(() => undefined)
    return run.then(fn)
  }

  /** Pause all further requests until `untilMs` (absolute unix ms). */
  backOffUntil(untilMs: number): void {
    this.nextAllowedAt = Math.max(this.nextAllowedAt, untilMs)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * fetch + JSON with timeout, bounded retries (exponential back-off) and
 * normalised AppError codes. Only retries on network errors, timeouts,
 * 429 and 5xx. Never throws raw fetch errors.
 */
export async function fetchJson<T>(url: string, limiter: RateLimiter, opts: HttpOptions = {}): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 12_000
  const retries = opts.retries ?? 2
  let attempt = 0
  let lastErr: AppError | null = null

  while (attempt <= retries) {
    attempt++
    try {
      return await limiter.schedule(() => doFetch<T>(url, timeoutMs, opts.headers, limiter))
    } catch (err) {
      const e = err instanceof AppError ? err : new AppError(ErrorCodes.NETWORK, 'Network request failed.', { cause: err })
      lastErr = e
      if (!e.retryable || attempt > retries) break
      const delay = Math.min(8000, 500 * 2 ** (attempt - 1))
      log.debug(`retry ${attempt}/${retries} in ${delay}ms for ${url}: ${e.message}`)
      await sleep(delay)
    }
  }
  throw lastErr ?? new AppError(ErrorCodes.NETWORK, 'Network request failed.')
}

async function doFetch<T>(url: string, timeoutMs: number, headers: Record<string, string> | undefined, limiter: RateLimiter): Promise<T> {
  // Diagnostics: CI_OFFLINE=1 simulates a network outage (used to verify offline behaviour).
  if (process.env['CI_OFFLINE']) throw new AppError(ErrorCodes.NETWORK, 'Could not reach the market data provider.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json', ...headers } })
  } catch (err) {
    if (controller.signal.aborted) throw new AppError(ErrorCodes.TIMEOUT, 'The market data request timed out.', { cause: err })
    throw new AppError(ErrorCodes.NETWORK, 'Could not reach the market data provider.', { cause: err })
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const pause = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 30_000
    limiter.backOffUntil(Date.now() + pause)
    throw new AppError(ErrorCodes.RATE_LIMITED, 'The market data provider is rate limiting requests.')
  }
  if (res.status >= 500) throw new AppError(ErrorCodes.PROVIDER, `Provider error (${res.status}).`, { retryable: true })
  if (!res.ok) throw new AppError(ErrorCodes.PROVIDER, `Provider rejected the request (${res.status}).`)

  try {
    return (await res.json()) as T
  } catch (err) {
    throw new AppError(ErrorCodes.PROVIDER, 'Provider returned a malformed response.', { cause: err })
  }
}

/** Coerces a provider value into a finite number or null. */
export function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}
