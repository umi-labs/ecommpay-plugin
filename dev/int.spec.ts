import type { Payload } from 'payload'
import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  applyPaymentResult,
  buildSourceRegistry,
  initiatePayment,
  parseCallback,
  readPayment,
  sign,
} from '@foundrykit/ecommpay-plugin'
import { ecommpayConfig } from './ecommpayConfig.js'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  await payload.destroy()
})

const registry = buildSourceRegistry(ecommpayConfig.sources)
const ctx = () => ({ payload, registry, paymentFieldName: 'payment' })

// A signed EcommPay callback body the SDK Callback will accept.
const signedCallback = (paymentId: string, status: string) => {
  const body: Record<string, unknown> = {
    project_id: 112,
    payment: { id: paymentId, status, sum: { amount: 15000, currency: 'GBP' } },
    operation: { request_id: 'op-1' },
  }
  body.signature = sign(body, 'test_secret_key')
  return body
}

describe('ecommpayPlugin wiring', () => {
  test('injects the payment group into the source collection', () => {
    const orders = payload.collections['orders']
    const field = orders.config.fields.find((f) => 'name' in f && f.name === 'payment')
    expect(field).toBeDefined()
  })

  test('registers the three endpoints under /payments/ecommpay', () => {
    const paths = (payload.config.endpoints ?? []).map((e) => `${e.method} ${e.path}`)
    expect(paths).toContain('post /payments/ecommpay/initiate')
    expect(paths).toContain('post /payments/ecommpay/callback')
    expect(paths).toContain('get /payments/ecommpay/status')
  })
})

describe('payment flow', () => {
  let orderId: string

  beforeAll(async () => {
    const order = await payload.create({
      collection: 'orders',
      data: { reference: 'FLOW-1', amount: 15000 },
    })
    orderId = String(order.id)
  })

  test('initiate returns signed widget params and marks the order pending', async () => {
    const params = await initiatePayment(payload, { collection: 'orders', orderId }, ecommpayConfig)
    expect(params.project_id).toBe(112)
    expect(params.payment_id).toMatch(/^ord-/)
    expect(params.payment_amount).toBe(15000)
    expect(params.payment_currency).toBe('GBP')
    expect(params.signature).toMatch(/^[A-Za-z0-9+/]+=*$/)

    const after = await readPayment(ctx(), { collection: 'orders', orderId })
    expect(after.status).toBe('pending')
    expect(after.transactionId).toBe(params.payment_id)
  })

  test('a verified success callback completes the order (and is idempotent)', async () => {
    const { transactionId } = await readPayment(ctx(), { collection: 'orders', orderId })
    const body = signedCallback(transactionId as string, 'success')

    const result = parseCallback(body, ecommpayConfig)
    expect(result).not.toBeNull()
    expect(result?.ref).toEqual({ collection: 'orders', orderId })
    expect(result?.status).toBe('completed')

    const applied = await applyPaymentResult(ctx(), result!.ref, result!.status, result!.ecommpayRef)
    expect(applied).toBe(true)
    expect((await readPayment(ctx(), { collection: 'orders', orderId })).status).toBe('completed')

    // Idempotent replay is a no-op.
    const again = await applyPaymentResult(ctx(), result!.ref, result!.status, result!.ecommpayRef)
    expect(again).toBe(false)
  })

  test('an invalid signature is rejected', () => {
    const body = { project_id: 112, payment: { id: 'ord-x-y', status: 'success' }, signature: 'nope' }
    expect(parseCallback(body, ecommpayConfig)).toBeNull()
  })

  test('initiating an already-completed order throws', async () => {
    await expect(
      initiatePayment(payload, { collection: 'orders', orderId }, ecommpayConfig),
    ).rejects.toThrow(/not pending/)
  })
})
