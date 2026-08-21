import type { Payload, PayloadRequest } from 'payload'

export type PaymentStatus = 'pending' | 'completed' | 'failed'

/** A reference to a specific order document in a specific source collection. */
export type OrderRef = {
  collection: string
  orderId: string
}

/**
 * Declares a collection whose documents can be paid for. `prefix` is a short,
 * unique code baked into the EcommPay `payment_id` so callbacks can be routed
 * back to the right collection.
 */
export type PaymentSource = {
  /** Payload collection slug. */
  collection: string
  /** Short unique prefix for payment ids (e.g. `gl`, `ord`). No dashes. */
  prefix: string
  /**
   * Field on the order holding the payable amount in **minor units** (pence).
   * Ignored if `resolveAmount` is provided. Default `amount`.
   */
  amountField?: string
  /** Custom amount resolver (minor units). Overrides `amountField`. */
  resolveAmount?: (order: Record<string, unknown>) => number
}

/** Arguments handed to an endpoint access check. */
export type EcommpayAccessArgs = {
  req: PayloadRequest
  ref: OrderRef
}

export type EcommpayAccessCheck = (args: EcommpayAccessArgs) => boolean | Promise<boolean>

export type EcommpayPluginConfig = {
  /** Collections that can be paid for. */
  sources: PaymentSource[]
  /** ISO currency code. Default `GBP`. */
  currency?: string
  /** EcommPay project id. Falls back to `process.env.ECOM_PROJECT_ID`. */
  projectId?: number
  /** EcommPay secret key. Falls back to `process.env.ECOM_SECRET_KEY`. */
  secretKey?: string
  /** Hosted payment page base URL. Default `https://paymentpage.ecommpay.com`. */
  paymentPageBaseUrl?: string
  /**
   * Name of the group field holding payment state on each source collection.
   * Default `payment`.
   */
  paymentFieldName?: string
  /** Inject the payment state group into each source collection. Default true. */
  addPaymentField?: boolean
  /** Base path (under /api) for the registered endpoints. Default `/payments/ecommpay`. */
  basePath?: string
  /** Register the payment field but skip endpoints. */
  disabled?: boolean
  /**
   * Authorisation for the two customer-facing endpoints. Both default to
   * requiring an authenticated Payload user: without a gate here, anyone could
   * mint signed payment params for an arbitrary order id (and flip that order
   * to `pending`), or read another customer's payment status.
   *
   * The `callback` route is deliberately not listed — it must stay reachable by
   * EcommPay, and is gated by signature verification instead.
   *
   * Return `true` to allow. Override when payments are initiated by guests, and
   * scope the check to something the caller has proven they own (a cart token,
   * a signed session, an order-specific nonce) rather than allowing all.
   */
  access?: {
    initiate?: EcommpayAccessCheck
    status?: EcommpayAccessCheck
  }
}

export type ResolvedCredentials = {
  projectId: number
  secretKey: string
  currency: string
  paymentPageBaseUrl: string
}

/** Flat params handed to `EPayWidget.run` on the client. */
export type WidgetParams = {
  project_id: number
  payment_id: string
  payment_amount: number
  payment_currency: string
  customer_id: string
  signature: string
}

export type CallbackResult = {
  ref: OrderRef
  paymentId: string
  status: PaymentStatus
  ecommpayRef: string
}

/** Internal registry built from `sources` for id encode/decode + amount resolution. */
export type SourceRegistry = {
  byCollection: Map<string, PaymentSource>
  byPrefix: Map<string, PaymentSource>
}

export type PayloadClient = Payload
