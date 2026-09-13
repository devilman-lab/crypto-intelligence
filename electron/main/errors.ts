/**
 * Application error with a stable machine-readable code. Thrown from services
 * and repositories; converted to an IpcErrorShape at the IPC boundary so the
 * renderer only ever receives a friendly message and a code.
 */
export class AppError extends Error {
  /** Whether a transient retry could succeed (network hiccup, timeout, 5xx, 429). */
  readonly retryable: boolean

  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown; retryable?: boolean }
  ) {
    super(message, { cause: options?.cause })
    this.name = 'AppError'
    this.retryable = options?.retryable ?? DEFAULT_RETRYABLE.has(code)
  }
}

const DEFAULT_RETRYABLE = new Set(['NETWORK', 'TIMEOUT', 'RATE_LIMITED'])

export const ErrorCodes = {
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE: 'DATABASE',
  NETWORK: 'NETWORK',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  PROVIDER: 'PROVIDER',
  INTERNAL: 'INTERNAL'
} as const
