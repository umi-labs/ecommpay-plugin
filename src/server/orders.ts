import type { Payload } from 'payload'
import { resolveOrderAmount } from '../config.js'
import type { OrderRef, PaymentStatus, SourceRegistry } from '../types.js'

/**
 * All order reads/writes go through `payload` passed in by the caller (an
 * endpoint handler or the consumer's hook), so this module has no dependency on
 * a specific Payload config — that was the main thing tying the original code
 * to the Turquoise app.
 */
export type OrderContext = {
  payload: Payload
  registry: SourceRegistry
  paymentFieldName: string
}

const source = (registry: SourceRegistry, collection: string) => {
  const s = registry.byCollection.get(collection)
  if (!s) throw new Error(`[ecommpay] unknown payment collection "${collection}".`)
  return s
}

const paymentOf = (order: unknown, field: string) =>
  (order as Record<string, { status?: PaymentStatus; transactionId?: string }> | null)?.[field]

export const loadPendingOrder = async (ctx: OrderContext, ref: OrderRef) => {
  const order = await ctx.payload.findByID({
    collection: ref.collection,
    id: ref.orderId,
    depth: 0,
    overrideAccess: true,
  })
  if (!order) throw new Error(`Order ${ref.collection}/${ref.orderId} not found.`)
  const status = paymentOf(order, ctx.paymentFieldName)?.status
  if (status && status !== 'pending') {
    throw new Error(`Order ${ref.collection}/${ref.orderId} is not pending (status: ${status}).`)
  }
  return order as unknown as Record<string, unknown>
}

export const amountForOrder = (
  ctx: OrderContext,
  ref: OrderRef,
  order: Record<string, unknown>,
): number => resolveOrderAmount(source(ctx.registry, ref.collection), order)

export const storePaymentId = async (
  ctx: OrderContext,
  ref: OrderRef,
  paymentId: string,
): Promise<void> => {
  await ctx.payload.update({
    collection: ref.collection,
    id: ref.orderId,
    data: { [ctx.paymentFieldName]: { transactionId: paymentId, status: 'pending' } },
    overrideAccess: true,
  })
}

/** Idempotent: returns false (no-op) if the order is already in a terminal state. */
export const applyPaymentResult = async (
  ctx: OrderContext,
  ref: OrderRef,
  status: PaymentStatus,
  ecommpayRef: string,
): Promise<boolean> => {
  const order = await ctx.payload.findByID({
    collection: ref.collection,
    id: ref.orderId,
    depth: 0,
    overrideAccess: true,
  })
  if (!order) throw new Error(`Order ${ref.collection}/${ref.orderId} not found.`)

  const current = paymentOf(order, ctx.paymentFieldName)
  if (current?.status === 'completed' || current?.status === 'failed') return false
  if (status === 'pending') return false

  await ctx.payload.update({
    collection: ref.collection,
    id: ref.orderId,
    data: {
      [ctx.paymentFieldName]: {
        transactionId: current?.transactionId,
        status,
        ecommpayRef,
      },
    },
    overrideAccess: true,
  })
  return true
}

export const readPayment = async (
  ctx: OrderContext,
  ref: OrderRef,
): Promise<{ status: PaymentStatus; transactionId: string | null }> => {
  const order = await ctx.payload.findByID({
    collection: ref.collection,
    id: ref.orderId,
    depth: 0,
    overrideAccess: true,
  })
  const payment = paymentOf(order, ctx.paymentFieldName)
  return { status: payment?.status ?? 'pending', transactionId: payment?.transactionId ?? null }
}
