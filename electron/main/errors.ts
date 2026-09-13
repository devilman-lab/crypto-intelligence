/**
 * Application error with a stable machine-readable code. Thrown from services
 * and repositories; converted to an IpcErrorShape at the IPC boundary so the
 * renderer only ever receives a friendly message and a code.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = 'AppError'
  }
}

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
