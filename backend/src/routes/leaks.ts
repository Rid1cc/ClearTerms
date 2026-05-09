import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import { normalizeUrl } from '../utils/url'
import { submittedDataBodySchema, leaksMeQuerySchema } from '../schemas/leaks'
import { createLeakAlertIfRisky } from '../services/submittedDataLeak'

interface ScannedSiteRow {
  id: string
  url: string
  domain: string
  url_hash: string
}

async function getOrCreateScannedSite(
  url: string,
  domain: string,
  hash: string
): Promise<ScannedSiteRow | null> {
  const { data: existing } = await supabaseAdmin
    .from('scanned_sites')
    .select('id, url, domain, url_hash')
    .eq('url_hash', hash)
    .maybeSingle()
  if (existing) return existing as ScannedSiteRow

  const { data: created, error } = await supabaseAdmin
    .from('scanned_sites')
    .insert({ url, domain, url_hash: hash })
    .select('id, url, domain, url_hash')
    .single()
  if (error || !created) return null
  return created as ScannedSiteRow
}

async function fetchCurrentVerdict(siteId: string): Promise<{
  verdict: string
  score: number
} | null> {
  const { data } = await supabaseAdmin
    .from('site_verdicts')
    .select('verdict, score')
    .eq('site_id', siteId)
    .eq('is_current', true)
    .maybeSingle()
  return data as { verdict: string; score: number } | null
}

export default async function leaksRoutes(fastify: FastifyInstance) {
  // POST /api/submitted-data — wtyczka: kategorie pól formularza, bez wartości
  fastify.post('/submitted-data', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = submittedDataBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation error', details: parsed.error.flatten() })
    }

    const userId = request.user!.id
    const { url, domain, hash } = normalizeUrl(parsed.data.site_url)
    const site = await getOrCreateScannedSite(url, domain, hash)
    const siteId = site?.id ?? null

    const uniqueCategories = [...new Set(parsed.data.data_categories)]

    const { data: row, error } = await supabaseAdmin
      .from('submitted_data_log')
      .insert({
        user_id: userId,
        site_id: siteId,
        site_url: url,
        data_categories: uniqueCategories,
      })
      .select('id, site_id, site_url, data_categories, submitted_at')
      .single()

    if (error || !row) {
      return reply.code(500).send({ error: 'Failed to log submitted data' })
    }

    if (siteId) {
      const verdictRow = await fetchCurrentVerdict(siteId)
      if (verdictRow) {
        await createLeakAlertIfRisky({
          userId,
          submittedLogId: row.id,
          siteId,
          siteUrl: url,
          dataCategories: uniqueCategories,
          verdict: verdictRow.verdict,
        })
      }
    }

    return {
      id: row.id,
      site_url: row.site_url,
      site_id: row.site_id,
      data_categories: row.data_categories,
      submitted_at: row.submitted_at,
    }
  })

  // GET /api/leaks/me — historia przekazanych kategorii + alerty wycieków
  fastify.get('/leaks/me', { preHandler: [authenticate] }, async (request, reply) => {
    const q = leaksMeQuerySchema.safeParse(request.query)
    if (!q.success) {
      return reply.code(400).send({ error: 'Validation error', details: q.error.flatten() })
    }

    const userId = request.user!.id
    const { limit, offset } = q.data

    const { data: subs, error: sErr } = await supabaseAdmin
      .from('submitted_data_log')
      .select('id, site_id, site_url, data_categories, submitted_at')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (sErr) {
      return reply.code(500).send({ error: 'Failed to load submissions' })
    }

    const siteIds = [...new Set((subs ?? []).map((r) => r.site_id).filter(Boolean))] as string[]

    const verdictBySite = new Map<string, { verdict: string; score: number }>()
    if (siteIds.length > 0) {
      const { data: verdicts } = await supabaseAdmin
        .from('site_verdicts')
        .select('site_id, verdict, score')
        .in('site_id', siteIds)
        .eq('is_current', true)
      for (const v of verdicts ?? []) {
        verdictBySite.set(v.site_id, { verdict: v.verdict, score: v.score })
      }
    }

    const domainBySite = new Map<string, string>()
    if (siteIds.length > 0) {
      const { data: sites } = await supabaseAdmin
        .from('scanned_sites')
        .select('id, domain')
        .in('id', siteIds)
      for (const s of sites ?? []) {
        domainBySite.set(s.id, s.domain)
      }
    }

    const submissionsOut = (subs ?? []).map((r) => ({
      id: r.id,
      site_id: r.site_id,
      site_url: r.site_url,
      domain: r.site_id ? domainBySite.get(r.site_id) ?? null : null,
      data_categories: r.data_categories,
      submitted_at: r.submitted_at,
      verdict: r.site_id ? verdictBySite.get(r.site_id) ?? null : null,
    }))

    const { data: alerts, error: aErr } = await supabaseAdmin
      .from('leak_alerts')
      .select(
        'id, site_url, data_categories, severity, message, detected_at, acknowledged_at, submitted_data_log_id'
      )
      .eq('user_id', userId)
      .order('detected_at', { ascending: false })
      .limit(50)

    if (aErr) {
      return reply.code(500).send({ error: 'Failed to load leak alerts' })
    }

    return {
      submissions: submissionsOut,
      leak_alerts: alerts ?? [],
    }
  })
}
