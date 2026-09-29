'use client'

/**
 * Evento `ai_referral` de GA4 para las visitas que llegan desde un asistente de
 * IA (docs/seo/, Fase 6 — ítem 10). La fuente se detecta al aterrizar
 * (`detectAiSource`: referrer o `utm_source`) y se guarda en la sesión; el
 * evento sale una sola vez por sesión y solo con consentimiento. Si el
 * visitante acepta las cookies después de aterrizar, se envía en ese momento.
 */
import { useEffect } from 'react'
import { detectAiSource } from '@h2r/domain'
import { subscribeToConsent, track } from '@/lib/analytics'

const SOURCE_KEY = 'h2r-ai-source'
const SENT_KEY = 'h2r-ai-source-sent'

const session = {
  get: (key: string) => {
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key: string, value: string) => {
    try {
      window.sessionStorage.setItem(key, value)
    } catch {
      /* sin storage: el evento puede repetirse, no pasa nada grave */
    }
  },
}

export function AiReferralTracker() {
  useEffect(() => {
    const utm = new URLSearchParams(window.location.search).get('utm_source')
    const detected = detectAiSource(document.referrer, utm)
    if (detected && !session.get(SOURCE_KEY)) session.set(SOURCE_KEY, detected)

    const source = session.get(SOURCE_KEY)
    if (!source || session.get(SENT_KEY)) return

    const send = () => {
      if (session.get(SENT_KEY)) return
      if (track('ai_referral', { ai_source: source, landing_page: window.location.pathname })) session.set(SENT_KEY, '1')
    }
    send()
    return subscribeToConsent(send)
  }, [])

  return null
}
