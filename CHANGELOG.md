# Changelog

## Unreleased

### Security

- `initiate` and `status` endpoints now require authorisation. Previously both
  were mounted unauthenticated while reading and writing orders with
  `overrideAccess: true`, so any caller could mint signed payment params for an
  arbitrary `orderId` (also flipping that order to `pending`) or read another
  order's payment status and transaction id.
- Both default to requiring an authenticated Payload user, and are configurable
  via the new `access` option. `callback` is unchanged — it stays public and
  signature-verified.
