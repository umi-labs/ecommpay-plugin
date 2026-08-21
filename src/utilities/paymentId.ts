import { randomBytes } from 'node:crypto'
import type { OrderRef, SourceRegistry } from '../types.js'

/**
 * Payment ids are `${prefix}-${orderId}-${suffix}`. Decoding splits on `-` but
 * rejoins the middle, so order ids that themselves contain dashes (e.g. UUIDs)
 * round-trip correctly — only the first (prefix) and last (random suffix)
 * segments are reserved.
 */
export const encodePaymentId = (registry: SourceRegistry, ref: OrderRef): string => {
  const source = registry.byCollection.get(ref.collection)
  if (!source) throw new Error(`[ecommpay] unknown payment collection "${ref.collection}".`)
  const suffix = randomBytes(4).toString('hex')
  return `${source.prefix}-${ref.orderId}-${suffix}`
}

export const decodePaymentId = (registry: SourceRegistry, paymentId: string): OrderRef => {
  const parts = paymentId.split('-')
  if (parts.length < 3) throw new Error(`[ecommpay] unrecognised payment id "${paymentId}".`)
  const prefix = parts[0]
  const orderId = parts.slice(1, -1).join('-')
  const source = registry.byPrefix.get(prefix)
  if (!source || !orderId) {
    throw new Error(`[ecommpay] unrecognised payment id "${paymentId}".`)
  }
  return { collection: source.collection, orderId }
}
