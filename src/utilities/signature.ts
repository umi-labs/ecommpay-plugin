import { createHmac } from 'node:crypto'

type Params = Record<string, unknown>

// Mirrors the EcommPay SDK's converter.js reducer exactly:
// - Sorts keys alphabetically at each object level
// - Excludes the `signature` field at any depth
// - Recursively prefixes nested keys with `:` separator
// - Booleans become 1/0; null becomes empty string
// - Returns `key:value` pairs joined by `;` (no trailing separator)
const reducer = (obj: Params, prefix: string): string => {
  const sorted = Object.keys(obj)
    .filter((key) => key !== 'signature')
    .sort()

  return sorted.reduce((acc: string, key: string) => {
    let value: unknown = obj[key]

    if (value === null || value === undefined) {
      value = ''
    }

    const fullKey = prefix ? `${prefix}:${key}` : key

    if (typeof value === 'object') {
      return acc + reducer(value as Params, fullKey)
    }

    if (typeof value === 'boolean') {
      value = value ? 1 : 0
    }

    return `${acc}${fullKey}:${value};`
  }, '')
}

export const buildSignatureString = (params: Params): string => {
  const result = reducer(params, '')
  // Remove trailing semicolon, matching SDK's `.slice(0, -1)`
  return result.slice(0, -1)
}

export const sign = (params: Params, secretKey: string): string =>
  createHmac('sha512', secretKey).update(buildSignatureString(params), 'utf8').digest('base64')
