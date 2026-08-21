'use client'

import { useEffect, useId, useRef } from 'react'
import type { WidgetParams } from '../types.js'

declare global {
  interface Window {
    EPayWidget?: { run: (params: Record<string, unknown>) => void }
  }
}

type EcommpayWidgetProps = {
  params: WidgetParams
  /** Base URL of the hosted payment page assets. Default paymentpage.ecommpay.com. */
  baseUrl?: string
  onSuccess?: () => void
  onError?: () => void
  onClose?: () => void
}

const DEFAULT_BASE = 'https://paymentpage.ecommpay.com'

const ensureStylesheet = (href: string) => {
  if (typeof document === 'undefined') return
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('failed to load ' + src)))
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    })
    script.addEventListener('error', () => reject(new Error('failed to load ' + src)))
    document.body.appendChild(script)
  })

/**
 * Mounts the EcommPay hosted payment page widget from signed params (get these
 * from the initiate endpoint). Framework-agnostic — pure React, no Next
 * dependency. One-shot: the widget runs once per mount.
 */
export function EcommpayWidget({
  params,
  baseUrl = DEFAULT_BASE,
  onSuccess,
  onError,
  onClose,
}: EcommpayWidgetProps) {
  const targetId = useId().replace(/:/g, '')
  const hasRun = useRef(false)

  useEffect(() => {
    let cancelled = false
    ensureStylesheet(`${baseUrl}/shared/merchant.css`)
    loadScript(`${baseUrl}/shared/merchant.js`)
      .then(() => {
        if (cancelled || hasRun.current || !window.EPayWidget) return
        hasRun.current = true
        window.EPayWidget.run({
          ...params,
          target_element: targetId,
          onSuccess: () => onSuccess?.(),
          onError: () => onError?.(),
          onClose: () => onClose?.(),
        })
      })
      .catch(() => onError?.())
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div id={targetId} />
}
