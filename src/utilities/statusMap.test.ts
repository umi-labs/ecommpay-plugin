import { describe, expect, it } from 'vitest'
import { mapEcommpayStatus } from './statusMap.js'

describe('mapEcommpayStatus', () => {
  it('maps a successful payment to completed', () => {
    expect(mapEcommpayStatus(true, 'success')).toBe('completed')
  })

  it('maps explicit terminal failures to failed', () => {
    for (const s of ['decline', 'declined', 'error', 'internal_error', 'expired']) {
      expect(mapEcommpayStatus(false, s)).toBe('failed')
    }
  })

  it('leaves unknown / intermediate statuses pending (never falsely fail a payment)', () => {
    expect(mapEcommpayStatus(false, 'awaiting customer')).toBe('pending')
    expect(mapEcommpayStatus(false, undefined)).toBe('pending')
  })
})
