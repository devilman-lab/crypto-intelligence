import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchJson, RateLimiter } from '../electron/main/market/http'
import { AppError, ErrorCodes } from '../electron/main/errors'

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

afterEach(() => vi.restoreAllMocks())

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: 1 }))
    await expect(fetchJson('https://x/y', new RateLimiter(0))).resolves.toEqual({ ok: 1 })
  })

  it('retries on 5xx then succeeds', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({}, 503)).mockResolvedValueOnce(jsonResponse({ ok: 2 }))
    await expect(fetchJson('https://x/y', new RateLimiter(0), { retries: 1 })).resolves.toEqual({ ok: 2 })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not retry on 4xx and reports PROVIDER', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 404))
    await expect(fetchJson('https://x/y', new RateLimiter(0), { retries: 2 })).rejects.toMatchObject({ code: ErrorCodes.PROVIDER })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('maps 429 to RATE_LIMITED and backs off the limiter', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 429, { 'retry-after': '1' }))
    const limiter = new RateLimiter(0)
    const spy = vi.spyOn(limiter, 'backOffUntil')
    await expect(fetchJson('https://x/y', limiter, { retries: 0 })).rejects.toBeInstanceOf(AppError)
    expect(spy).toHaveBeenCalled()
  })

  it('maps malformed JSON to PROVIDER', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 200 }))
    await expect(fetchJson('https://x/y', new RateLimiter(0), { retries: 0 })).rejects.toMatchObject({ code: ErrorCodes.PROVIDER })
  })

  it('maps network failures to NETWORK', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'))
    await expect(fetchJson('https://x/y', new RateLimiter(0), { retries: 0 })).rejects.toMatchObject({ code: ErrorCodes.NETWORK })
  })

  it('maps aborts to TIMEOUT', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))))
    await expect(fetchJson('https://x/y', new RateLimiter(0), { retries: 0, timeoutMs: 20 })).rejects.toMatchObject({ code: ErrorCodes.TIMEOUT })
  })
})

describe('RateLimiter', () => {
  it('spaces requests by the minimum interval', async () => {
    const limiter = new RateLimiter(40)
    const stamps: number[] = []
    await Promise.all([1, 2, 3].map(() => limiter.schedule(async () => stamps.push(Date.now()))))
    expect(stamps[2]! - stamps[0]!).toBeGreaterThanOrEqual(70)
  })
})
