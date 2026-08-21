import type { Payload } from 'payload'
import { buildSourceRegistry, resolveCredentials } from '../config.js'
import type { EcommpayPluginConfig, OrderRef, WidgetParams } from '../types.js'
import { encodePaymentId } from '../utilities/paymentId.js'
import { sign } from '../utilities/signature.js'
import { amountForOrder, loadPendingOrder, storePaymentId, type OrderContext } from './orders.js'

/**
 * Prepare a payment: validate the order is pending and payable, mint + store a
 * payment id, and return the signed params for the client widget.
 */
export const initiatePayment = async (
  payload: Payload,
  ref: OrderRef,
  config: EcommpayPluginConfig,
): Promise<WidgetParams> => {
  const registry = buildSourceRegistry(config.sources)
  const ctx: OrderContext = {
    payload,
    registry,
    paymentFieldName: config.paymentFieldName ?? 'payment',
  }

  const order = await loadPendingOrder(ctx, ref)
  const amount = amountForOrder(ctx, ref, order)
  if (amount <= 0) {
    throw new Error(`Order ${ref.collection}/${ref.orderId} has no payable amount.`)
  }

  const paymentId = encodePaymentId(registry, ref)
  await storePaymentId(ctx, ref, paymentId)

  const { projectId, secretKey, currency } = resolveCredentials(config)
  const params = {
    project_id: projectId,
    payment_id: paymentId,
    payment_amount: amount,
    payment_currency: currency,
    customer_id: `${ref.collection}-${ref.orderId}`,
  }

  return { ...params, signature: sign(params, secretKey) }
}
