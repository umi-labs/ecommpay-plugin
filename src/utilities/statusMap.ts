import type { PaymentStatus } from '../types.js'

const FAILED_STATUSES = new Set([
  'decline',
  'declined',
  'error',
  'internal_error',
  'expired',
  'reversed',
  'refunded',
  'cancelled',
  'canceled',
])

// Conservative: only a confirmed success completes an order; only an explicit
// terminal-failure status fails it; everything else stays pending so a still-
// processing payment is never wrongly marked failed.
export const mapEcommpayStatus = (
  isSuccess: boolean,
  rawStatus: string | undefined,
): PaymentStatus => {
  if (isSuccess) return 'completed'
  if (rawStatus && FAILED_STATUSES.has(rawStatus.toLowerCase())) return 'failed'
  return 'pending'
}
