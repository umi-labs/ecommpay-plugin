import type { Field } from 'payload'

/**
 * The payment-state group the plugin injects into each source collection (or
 * you can add manually). Read-only in the admin — it's written by the payment
 * flow, not by editors.
 */
export const paymentField = (name = 'payment'): Field => ({
  name,
  type: 'group',
  label: 'Payment',
  admin: {
    description: 'Managed by the EcommPay payment flow.',
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'transactionId',
      type: 'text',
      admin: { readOnly: true, description: 'EcommPay payment id.' },
    },
    {
      name: 'ecommpayRef',
      type: 'text',
      admin: { readOnly: true, description: 'EcommPay operation request id from the callback.' },
    },
  ],
})
