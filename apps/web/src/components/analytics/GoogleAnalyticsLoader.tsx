'use client'

/**
 * Carga GA4 únicamente si hay ID configurado y el visitante aceptó las cookies
 * de analítica. Ver `lib/analytics.ts` para las reglas.
 */
import { useSyncExternalStore } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'
import { GA_ID, readConsent, subscribeToConsent, type ConsentState } from '@/lib/analytics'

const noConsentOnServer = (): ConsentState => null

export function GoogleAnalyticsLoader() {
  const consent = useSyncExternalStore(subscribeToConsent, readConsent, noConsentOnServer)
  if (!GA_ID || consent !== 'granted') return null
  return <GoogleAnalytics gaId={GA_ID} />
}
