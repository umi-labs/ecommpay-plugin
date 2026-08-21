import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { ecommpayPlugin } from '@foundrykit/ecommpay-plugin'
import { ecommpayConfig } from './ecommpayConfig.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

export default buildConfig({
  admin: {
    importMap: { baseDir: path.resolve(dirname) },
    autoLogin: { email: 'dev@payloadcms.com', password: 'test', prefillOnly: true },
  },
  collections: [
    {
      slug: 'orders',
      admin: { useAsTitle: 'reference', defaultColumns: ['reference', 'amount', 'payment'] },
      fields: [
        { name: 'reference', type: 'text', required: true },
        { name: 'customerEmail', type: 'email' },
        {
          name: 'amount',
          type: 'number',
          required: true,
          admin: { description: 'Payable amount in minor units (pence).' },
        },
      ],
    },
    { slug: 'media', fields: [], upload: { staticDir: path.resolve(dirname, 'media') } },
  ],
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI || `file:${path.resolve(dirname, 'dev.db')}` },
    push: true,
  }),
  editor: lexicalEditor(),
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [ecommpayPlugin(ecommpayConfig)],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
