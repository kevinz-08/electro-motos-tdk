import { describe, it, expect } from 'vitest'
import { detectAiSource, GA4_AI_SOURCE_REGEX } from '@/domain/shared/aiReferral'

describe('detectAiSource', () => {
  it('reconoce el referrer de cada asistente (con www y subdominios)', () => {
    expect(detectAiSource('https://chatgpt.com/', null)).toBe('chatgpt')
    expect(detectAiSource('https://www.perplexity.ai/search?q=x', null)).toBe('perplexity')
    expect(detectAiSource('https://gemini.google.com/app', null)).toBe('gemini')
    expect(detectAiSource('https://copilot.microsoft.com/', null)).toBe('copilot')
    expect(detectAiSource('https://claude.ai/chat/1', null)).toBe('claude')
  })
  it('usa utm_source aunque no haya referrer, y le da prioridad', () => {
    expect(detectAiSource('', 'chatgpt.com')).toBe('chatgpt')
    expect(detectAiSource('https://www.google.com/', 'perplexity.ai')).toBe('perplexity')
  })
  it('no confunde buscadores ni dominios parecidos', () => {
    expect(detectAiSource('https://www.google.com/', null)).toBeNull()
    expect(detectAiSource('https://www.bing.com/search', null)).toBeNull()
    expect(detectAiSource('https://notchatgpt.com/', null)).toBeNull()
    expect(detectAiSource('https://google.com/?q=gemini.google.com', null)).toBeNull()
    expect(detectAiSource(null, 'newsletter')).toBeNull()
    expect(detectAiSource('no es una url %%', undefined)).toBeNull()
  })
  it('la expresión para GA4 cubre los dominios con los puntos escapados', () => {
    expect(new RegExp(GA4_AI_SOURCE_REGEX).test('perplexity.ai')).toBe(true)
    expect(GA4_AI_SOURCE_REGEX).toContain(String.raw`chatgpt\.com`)
  })
})
