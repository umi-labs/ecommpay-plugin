import { Callback, Payment } from 'ecommpay'
import { describe, expect, it } from 'vitest'
import { sign } from './signature.js'

const SECRET = 'test_secret_key'

describe('sign', () => {
  it('is deterministic and base64', () => {
    const sig = sign({ b: '2', a: '1' }, SECRET)
    expect(sig).toBe(sign({ a: '1', b: '2' }, SECRET))
    expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('ignores any existing signature field', () => {
    expect(sign({ a: '1', signature: 'x' }, SECRET)).toBe(sign({ a: '1' }, SECRET))
  })

  it('matches the signature the official SDK embeds in getUrl (flat params)', () => {
    const payment = new Payment(112, SECRET)
    payment.paymentId = 'FFCD12-30'
    payment.paymentAmount = 1000
    payment.paymentCurrency = 'GBP'
    const url = new URL(payment.getUrl())
    const sdkSignature = url.searchParams.get('signature') as string

    const ours = sign(
      {
        project_id: 112,
        interface_type: '{"id":22}', // Payment constructor always adds this
        payment_id: 'FFCD12-30',
        payment_amount: 1000,
        payment_currency: 'GBP',
      },
      SECRET,
    )
    expect(ours).toBe(sdkSignature)
  })

  it('produces a signature the SDK Callback accepts for a nested body', () => {
    const body: Record<string, unknown> = {
      project_id: 112,
      payment: { id: 'gl-1-abcd', status: 'success', sum: { amount: 1000, currency: 'GBP' } },
    }
    body.signature = sign(body, SECRET)
    expect(() => new Callback(SECRET, body)).not.toThrow()
  })
})
