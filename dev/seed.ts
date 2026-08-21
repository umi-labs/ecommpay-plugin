import type { Payload } from 'payload'
import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload) => {
  const { totalDocs: userCount } = await payload.count({
    collection: 'users',
    where: { email: { equals: devUser.email } },
  })
  if (!userCount) {
    await payload.create({ collection: 'users', data: devUser })
  }

  const { totalDocs: orderCount } = await payload.count({ collection: 'orders' })
  if (!orderCount) {
    await payload.create({
      collection: 'orders',
      data: {
        reference: 'ORD-1001',
        customerEmail: 'alex@example.com',
        amount: 15000,
        payment: {
          status: 'completed',
          transactionId: 'ord-1-ab12cd34',
          ecommpayRef: 'op-55021',
        },
      },
    })
    await payload.create({
      collection: 'orders',
      data: { reference: 'ORD-1002', customerEmail: 'sam@example.com', amount: 4200 },
    })
  }
}
