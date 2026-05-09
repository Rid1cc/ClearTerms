import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import { normalizeUrl } from '../utils/url'
import { checkUrlQuerySchema } from '../schemas/phishing'
import { recordParentalAlerts } from '../services/parentalAlerts'

// ---------------------------------------------------------------------
// GET /api/check-url?url=...
// Szybki blacklist-lookup zoptymalizowany pod niskie opóźnienie —
// wtyczka woła to PRZED załadowaniem strony.
//
// Implementacja:
// - Jeden indexed read na phishing_blacklist (url_hash lub domain match,
//   przy is_active=true i niewygasłych wpisach).
// - Zewnętrzne źródła (Google Safe Browsing, PhishTank) są synchronizowane
//   do tej tabeli przez osobny worker — sam endpoint NIE woła ich on-demand,
//   bo dodatkowe round-tripy zabiłyby latency wymagane dla pre-load checku.
// ---------------------------------------------------------------------
export default async function phishingRoutes(fastify: FastifyInstance) {
  fastify.get('/check-url', { preHandler: [authenticate] }, async (request, reply) => {
    const result = checkUrlQuerySchema.safeParse(request.query)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    let normalized
    try {
      normalized = normalizeUrl(result.data.url)
    } catch {
      return reply.code(400).send({ error: 'Invalid URL' })
    }

    const nowIso = new Date().toISOString()

    // Match: dokładny url_hash LUB blokada całej domeny.
    // Filtr aktywności i wygaśnięcia ANDowany przez kolejny .or().
    const { data, error } = await supabaseAdmin
      .from('phishing_blacklist')
      .select('source, reason')
      .or(`url_hash.eq.${normalized.hash},domain.eq.${normalized.domain}`)
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (error) {
      // Fail-open: nie blokujemy strony jeśli nasz blacklist padnie.
      // To jest pre-flight check; pełna analiza idzie i tak przez /api/scan.
      fastify.log.error({ err: error, url: normalized.url }, 'check-url query failed')
      return { blocked: false }
    }

    if (!data) return { blocked: false }

    // Fire-and-forget: jeśli ten użytkownik jest dzieckiem w jakiejś grupie,
    // log alert "visit_blocked" dla rodzica. Nie blokujemy response.
    void recordParentalAlerts(
      {
        userId: request.user!.id,
        siteId: null,
        siteUrl: normalized.url,
        eventType: 'visit_blocked',
        details: { source: data.source, reason: data.reason ?? null },
      },
      fastify.log
    )

    return {
      blocked: true,
      reason: data.reason ?? 'Listed on phishing blacklist',
      source: data.source,
    }
  })
}
