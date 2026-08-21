import type { CollectionConfig, Config } from 'payload'
import { createEcommpayEndpoints } from './endpoints/index.js'
import { paymentField } from './fields/paymentField.js'
import type { EcommpayPluginConfig } from './types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export type {
  EcommpayAccessArgs,
  EcommpayAccessCheck,
  EcommpayPluginConfig,
  PaymentSource,
  OrderRef,
  PaymentStatus,
  WidgetParams,
  CallbackResult,
} from './types.js'

export { resolveCredentials, buildSourceRegistry, resolveOrderAmount } from './config.js'
export { sign, buildSignatureString } from './utilities/signature.js'
export { encodePaymentId, decodePaymentId } from './utilities/paymentId.js'
export { mapEcommpayStatus } from './utilities/statusMap.js'
export { paymentField } from './fields/paymentField.js'
export { initiatePayment } from './server/initiate.js'
export { parseCallback } from './server/callback.js'
export {
  applyPaymentResult,
  readPayment,
  loadPendingOrder,
  storePaymentId,
  type OrderContext,
} from './server/orders.js'
export { createEcommpayEndpoints } from './endpoints/index.js'

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export const ecommpayPlugin =
  (pluginOptions: EcommpayPluginConfig) =>
  (config: Config): Config => {
    if (!pluginOptions.sources || pluginOptions.sources.length === 0) {
      throw new Error('[@foundrykit/ecommpay-plugin] `sources` must contain at least one source.')
    }

    const paymentFieldName = pluginOptions.paymentFieldName ?? 'payment'
    const addField = pluginOptions.addPaymentField !== false
    const sourceSlugs = new Set(pluginOptions.sources.map((s) => s.collection))

    // Inject the payment-state group into each source collection (unless it
    // already declares a field of that name).
    if (addField) {
      config.collections = (config.collections ?? []).map((collection: CollectionConfig) => {
        if (!sourceSlugs.has(collection.slug)) return collection
        const already = collection.fields?.some(
          (f) => 'name' in f && f.name === paymentFieldName,
        )
        if (already) return collection
        return { ...collection, fields: [...(collection.fields ?? []), paymentField(paymentFieldName)] }
      })
    }

    if (pluginOptions.disabled) {
      return config
    }

    config.endpoints = [...(config.endpoints ?? []), ...createEcommpayEndpoints(pluginOptions)]

    return config
  }

export default ecommpayPlugin
