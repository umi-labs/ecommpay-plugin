import type { Endpoint, PayloadRequest } from 'payload'
import { buildSourceRegistry, DEFAULT_BASE_PATH } from '../config.js'
import { parseCallback } from '../server/callback.js'
import { initiatePayment } from '../server/initiate.js'
import { applyPaymentResult, readPayment, type OrderContext } from '../server/orders.js'
import type { EcommpayPluginConfig } from '../types.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const readBody = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  if (typeof req.json === 'function') {
    try {
      return (await req.json()) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return (req.data as Record<string, unknown>) ?? {}
}

const ctxFor = (config: EcommpayPluginConfig, req: PayloadRequest): OrderContext => ({
  payload: req.payload,
  registry: buildSourceRegistry(config.sources),
  paymentFieldName: config.paymentFieldName ?? 'payment',
})

const isKnown = (config: EcommpayPluginConfig, collection: unknown): collection is string =>
  typeof collection === 'string' && config.sources.some((s) => s.collection === collection)

/**
 * Build the three EcommPay endpoints, mounted under `${basePath}` (default
 * `/payments/ecommpay`) → available at `/api/payments/ecommpay/...`.
 */
export const createEcommpayEndpoints = (config: EcommpayPluginConfig): Endpoint[] => {
  const base = config.basePath ?? DEFAULT_BASE_PATH

  return [
    {
      path: `${base}/initiate`,
      method: 'post',
      handler: async (req) => {
        const body = await readBody(req)
        const { collection, orderId } = body as { collection?: string; orderId?: string | number }
        if (!isKnown(config, collection) || orderId == null) {
          return json({ error: 'collection and orderId are required.' }, 400)
        }
        try {
          const params = await initiatePayment(
            req.payload,
            { collection, orderId: String(orderId) },
            config,
          )
          return json(params)
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : 'Unable to initiate payment.' },
            409,
          )
        }
      },
    },
    {
      path: `${base}/callback`,
      method: 'post',
      handler: async (req) => {
        const body = await readBody(req)
        const result = parseCallback(body, config)
        if (!result) return json({ error: 'Invalid signature.' }, 400)
        await applyPaymentResult(ctxFor(config, req), result.ref, result.status, result.ecommpayRef)
        // Always 200 for verified callbacks (incl. idempotent replays) so
        // EcommPay stops retrying.
        return json({ received: true })
      },
    },
    {
      path: `${base}/status`,
      method: 'get',
      handler: async (req) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const collection = url.searchParams.get('collection')
        const orderId = url.searchParams.get('orderId')
        if (!isKnown(config, collection) || !orderId) {
          return json({ error: 'collection and orderId are required.' }, 400)
        }
        const { status, transactionId } = await readPayment(ctxFor(config, req), {
          collection,
          orderId,
        })
        return json({ status, transactionId })
      },
    },
  ]
}
