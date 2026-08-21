import type { EcommpayPluginConfig } from '@foundrykit/ecommpay-plugin'

// Test credentials — the flow never contacts EcommPay in tests; signing is
// deterministic from the secret. In a real app these come from env
// (ECOM_PROJECT_ID / ECOM_SECRET_KEY).
export const ecommpayConfig: EcommpayPluginConfig = {
  projectId: 112,
  secretKey: 'test_secret_key',
  currency: 'GBP',
  sources: [{ collection: 'orders', prefix: 'ord', amountField: 'amount' }],
}
