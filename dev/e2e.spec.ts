import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const shot = (name: string) => path.resolve(dirname, 'screenshots', name)

test('capture admin screenshots', async ({ page }) => {
  test.setTimeout(180_000)

  const res = await page.request.post('/api/users/login', {
    data: { email: 'dev@payloadcms.com', password: 'test' },
  })
  expect(res.ok(), `login failed: ${res.status()}`).toBeTruthy()

  // 1. Orders list
  await page.goto('/admin/collections/orders')
  await page.waitForSelector('table, .collection-list, .no-results', { timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: shot('01-orders-list.png'), fullPage: true })

  // 2. Order edit view showing the injected Payment group (seeded completed order)
  const list = await page.request.get('/api/orders?where[reference][equals]=ORD-1001&limit=1')
  const id = (await list.json()).docs[0].id
  await page.goto(`/admin/collections/orders/${id}`)
  await page.waitForSelector('#field-reference', { timeout: 30_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: shot('02-order-payment-group.png'), fullPage: true })
})
