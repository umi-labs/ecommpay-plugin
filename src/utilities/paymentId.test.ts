import { describe, expect, it } from 'vitest'
import { buildSourceRegistry } from '../config.js'
import { decodePaymentId, encodePaymentId } from './paymentId.js'

const registry = buildSourceRegistry([
  { collection: 'contributions', prefix: 'gl' },
  { collection: 'voucher-orders', prefix: 'gov' },
])

describe('payment id codec', () => {
  it('encodes with the source prefix and round-trips', () => {
    const id = encodePaymentId(registry, { collection: 'contributions', orderId: '42' })
    expect(id).toMatch(/^gl-42-[a-z0-9]+$/)
    expect(decodePaymentId(registry, id)).toEqual({ collection: 'contributions', orderId: '42' })
  })

  it('round-trips order ids that contain dashes (e.g. UUIDs)', () => {
    const uuid = '3f9a1c2d-55aa-4bcd-9e01-abc123def456'
    const id = encodePaymentId(registry, { collection: 'voucher-orders', orderId: uuid })
    expect(decodePaymentId(registry, id)).toEqual({ collection: 'voucher-orders', orderId: uuid })
  })

  it('produces a distinct id each call (retry-safe)', () => {
    const a = encodePaymentId(registry, { collection: 'contributions', orderId: '1' })
    const b = encodePaymentId(registry, { collection: 'contributions', orderId: '1' })
    expect(a).not.toBe(b)
  })

  it('throws on an unknown prefix', () => {
    expect(() => decodePaymentId(registry, 'xx-1-abcd')).toThrow()
  })
})
