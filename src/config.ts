import type {
  EcommpayPluginConfig,
  PaymentSource,
  ResolvedCredentials,
  SourceRegistry,
} from './types.js'

export const PAYMENT_PAGE_BASE_URL = 'https://paymentpage.ecommpay.com'
export const DEFAULT_BASE_PATH = '/payments/ecommpay'

/**
 * Resolve EcommPay credentials from explicit config first, then environment
 * (`ECOM_PROJECT_ID`, `ECOM_SECRET_KEY`). Throws a clear error if missing.
 */
export const resolveCredentials = (config: EcommpayPluginConfig): ResolvedCredentials => {
  const rawProjectId = config.projectId ?? process.env.ECOM_PROJECT_ID
  const secretKey = config.secretKey ?? process.env.ECOM_SECRET_KEY

  if (rawProjectId == null || !secretKey) {
    throw new Error(
      'EcommPay is not configured: provide projectId/secretKey or set ECOM_PROJECT_ID and ECOM_SECRET_KEY.',
    )
  }

  const projectId = Number(rawProjectId)
  if (!Number.isInteger(projectId)) {
    throw new Error(`EcommPay projectId must be an integer, got "${rawProjectId}".`)
  }

  return {
    projectId,
    secretKey,
    currency: config.currency ?? 'GBP',
    paymentPageBaseUrl: config.paymentPageBaseUrl ?? PAYMENT_PAGE_BASE_URL,
  }
}

/** Build lookup maps from the configured sources; validates prefixes are unique. */
export const buildSourceRegistry = (sources: PaymentSource[]): SourceRegistry => {
  const byCollection = new Map<string, PaymentSource>()
  const byPrefix = new Map<string, PaymentSource>()
  for (const source of sources) {
    if (source.prefix.includes('-')) {
      throw new Error(`[ecommpay] source prefix "${source.prefix}" must not contain "-".`)
    }
    if (byPrefix.has(source.prefix)) {
      throw new Error(`[ecommpay] duplicate source prefix "${source.prefix}".`)
    }
    byCollection.set(source.collection, source)
    byPrefix.set(source.prefix, source)
  }
  return { byCollection, byPrefix }
}

/** Payable amount in minor units for an order, per its source config. */
export const resolveOrderAmount = (
  source: PaymentSource,
  order: Record<string, unknown>,
): number => {
  if (source.resolveAmount) return source.resolveAmount(order)
  const value = order[source.amountField ?? 'amount']
  return typeof value === 'number' ? value : 0
}
