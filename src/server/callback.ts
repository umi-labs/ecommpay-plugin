import { Callback } from 'ecommpay'
import { buildSourceRegistry, resolveCredentials } from '../config.js'
import type { CallbackResult, EcommpayPluginConfig } from '../types.js'
import { decodePaymentId } from '../utilities/paymentId.js'
import { mapEcommpayStatus } from '../utilities/statusMap.js'

/**
 * Verify + decode an EcommPay callback body. Returns null when the signature is
 * invalid (the SDK `Callback` constructor throws) so the route can answer 400
 * without leaking detail. Otherwise returns the decoded, routed result.
 */
export const parseCallback = (
  body: unknown,
  config: EcommpayPluginConfig,
): CallbackResult | null => {
  const { secretKey } = resolveCredentials(config)
  const registry = buildSourceRegistry(config.sources)

  let callback: InstanceType<typeof Callback>
  try {
    callback = new Callback(secretKey, body as Record<string, unknown>)
  } catch {
    return null
  }

  const paymentId = callback.getPaymentId()
  const ref = decodePaymentId(registry, paymentId)

  const payload = (body ?? {}) as {
    payment?: { status?: string }
    operation?: { request_id?: string | number }
  }
  const status = mapEcommpayStatus(callback.isPaymentSuccess(), payload.payment?.status)
  const ecommpayRef = String(payload.operation?.request_id ?? paymentId)

  return { ref, paymentId, status, ecommpayRef }
}
