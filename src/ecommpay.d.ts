// Ambient types for the untyped `ecommpay` npm package (only the surface we use).
declare module 'ecommpay' {
  export class Payment {
    constructor(projectId: number, secretKey: string)
    paymentId: string
    paymentAmount: number
    paymentCurrency: string
    getUrl(): string
  }
  export class Callback {
    constructor(secretKey: string, data: Record<string, unknown>)
    getPaymentId(): string
    isPaymentSuccess(): boolean
  }
}
