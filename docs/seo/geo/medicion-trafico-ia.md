# Tráfico desde asistentes de IA en GA4 (Fase 6, ítem 10)

**Qué hace el sitio (ya implementado):** cuando una visita llega desde ChatGPT, Perplexity, Gemini, Copilot, Claude,
DeepSeek, Meta AI, Grok, You.com o Poe — por el referrer o por `utm_source` — y el visitante aceptó las cookies de
analítica, se envía **una vez por sesión** el evento `ai_referral` con dos parámetros:

| Parámetro | Ejemplo | Para qué |
|---|---|---|
| `ai_source` | `chatgpt`, `perplexity`, `gemini`… | Qué asistente trajo la visita |
| `landing_page` | `/repuestos/yamaha/fz-2-0` | Qué página citó el asistente |

La detección es `detectAiSource` (dominio, probada) y el envío `AiReferralTracker` (web); lo verifica
`apps/web/e2e/analytics.spec.ts`.

## Configurar GA4 (una vez — tarea H-45)

1. **Administrar → Definiciones personalizadas → Crear dimensión personalizada:**
   - `ai_source` · ámbito **Evento** · parámetro `ai_source`
   - `landing_page` · ámbito **Evento** · parámetro `landing_page`
   (Sin esto los parámetros llegan pero no se pueden usar en informes.)
2. **Explorar → Exploración libre** "Tráfico desde IA":
   - Dimensiones: `ai_source`, `landing_page`, Fuente de la sesión.
   - Métricas: Eventos, Usuarios, Compras, Ingresos.
   - Filtro: Nombre del evento = `ai_referral`.
3. **Segmento alternativo sin el evento** (sirve también para visitas anteriores a esta versión y para quien rechazó el
   evento pero GA registró la sesión): Segmento de sesiones → Fuente de la sesión → **coincide con la expresión regular**:

```
chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|copilot\.cloud\.microsoft|claude\.ai|chat\.deepseek\.com|deepseek\.com|meta\.ai|grok\.com|you\.com|poe\.com
```

   (Es `GA4_AI_SOURCE_REGEX` en `packages/domain/src/shared/aiReferral.ts`; si se agrega un asistente allí, se actualiza
   aquí.)

## Límites

- Solo cuenta a quien aceptó las cookies de analítica: es una **muestra**, no el total. Para el total, mirar la tendencia,
  no la cifra absoluta.
- Algunas apps de asistentes no envían referrer ni UTM; esas visitas aparecen como "directas" y no se pueden atribuir.
- Se revisa junto con la medición de prompts (`prompts.md`): si un mes H2R aparece más en las respuestas y no sube el
  tráfico desde IA, el enlace que citan puede estar mal o la página no responder lo que se preguntó.
