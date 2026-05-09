import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import { normalizeUrl } from '../utils/url'
import {
  submittedDataSchema,
  leaksQuerySchema,
  leakAlertParamsSchema,
} from '../schemas/leaks'
import { checkLeakOnSubmission } from '../services/leakDetection'
import type { DataCategory } from '../services/aiService'

export default async function leakRoutes(fastify: FastifyInstance) {
  // -------------------------------------------------------------------
  // POST /api/submitted-data
  // -------------------------------------------------------------------
  // Wtyczka loguje co użytkownik wpisał (TYLKO kategorie, nigdy wartości).
  // Schema jest .strict() — każde nieznane pole (np. "values", "password")
  // wywala 400, więc backend nie może przypadkiem zaakceptować payloadu
  // który by przeniósł wartości. Wartości NIGDY nie opuszczają przeglądarki.
  // -------------------------------------------------------------------
  fastify.post('/submitted-data', { preHandler: [authenticate] }, async (request, reply) => {
    const result = submittedDataSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    let normalized
    try {
      normalized = normalizeUrl(result.data.url)
    } catch {
      return reply.code(400).send({ error: 'Invalid URL' })
    }

    // Lookup site po url_hash. Jeśli nie ma — site_id NULL, ale URL i tak
    // logujemy (po późniejszym zskanowaniu retroaktywnie połączymy alerty).
    const { data: site } = await supabaseAdmin
      .from('scanned_sites')
      .select('id')
      .eq('url_hash', normalized.hash)
      .maybeSingle()

    const userId = request.user!.id

    const { data: logRow, error: logErr } = await supabaseAdmin
      .from('submitted_data_log')
      .insert({
        user_id: userId,
        site_id: site?.id ?? null,
        site_url: normalized.url,
        data_categories: result.data.data_categories,
      })
      .select('id, submitted_at')
      .single()

    if (logErr || !logRow) {
      return reply.code(500).send({ error: 'Failed to log submission' })
    }

    // Jeśli mamy site_id, sprawdź aktualny werdykt — może strona już
    // jest znanym phishingiem, wtedy alert powstaje natychmiast.
    let alertedImmediately = false
    if (site?.id) {
      const { data: verdict } = await supabaseAdmin
        .from('site_verdicts')
        .select('verdict')
        .eq('site_id', site.id)
        .eq('is_current', true)
        .maybeSingle()

      if (verdict) {
        alertedImmediately = await checkLeakOnSubmission(
          {
            userId,
            submittedDataLogId: logRow.id,
            siteId: site.id,
            siteUrl: normalized.url,
            submittedAt: new Date(logRow.submitted_at),
            dataCategories: result.data.data_categories as DataCategory[],
            currentVerdict: verdict.verdict,
          },
          fastify.log
        )
      }
    }

    return reply.code(201).send({
      id: logRow.id,
      submitted_at: logRow.submitted_at,
      alerted: alertedImmediately,
    })
  })

  // -------------------------------------------------------------------
  // GET /api/leaks/me
  // -------------------------------------------------------------------
  // Lista wycieków zalogowanego użytkownika.
  // -------------------------------------------------------------------
  fastify.get('/leaks/me', { preHandler: [authenticate] }, async (request, reply) => {
    const query = leaksQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: 'Invalid query', details: query.error.flatten() })
    }

    let q = supabaseAdmin
      .from('leak_alerts')
      .select(
        'id, site_id, site_url, data_categories, severity, message, detected_at, acknowledged_at',
        { count: 'exact' }
      )
      .eq('user_id', request.user!.id)

    if (query.data.acknowledged === true) q = q.not('acknowledged_at', 'is', null)
    else if (query.data.acknowledged === false) q = q.is('acknowledged_at', null)

    const { data, error, count } = await q
      .order('detected_at', { ascending: false })
      .range(query.data.offset, query.data.offset + query.data.limit - 1)

    if (error) return reply.code(500).send({ error: 'Failed to fetch leaks' })
    return {
      leaks: data ?? [],
      total: count ?? 0,
      limit: query.data.limit,
      offset: query.data.offset,
    }
  })

  // -------------------------------------------------------------------
  // POST /api/leaks/:alertId/acknowledge
  // -------------------------------------------------------------------
  // Oznacza alert jako przejrzany (user już zmienił hasło / zignorował).
  // -------------------------------------------------------------------
  fastify.post(
    '/leaks/:alertId/acknowledge',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = leakAlertParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid alert id' })

      const { data, error } = await supabaseAdmin
        .from('leak_alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', params.data.alertId)
        .eq('user_id', request.user!.id)
        .is('acknowledged_at', null)
        .select('id, acknowledged_at')
        .maybeSingle()

      if (error) return reply.code(500).send({ error: 'Failed to acknowledge alert' })
      if (!data) return reply.code(404).send({ error: 'Alert not found or already acknowledged' })
      return data
    }
  )
}
