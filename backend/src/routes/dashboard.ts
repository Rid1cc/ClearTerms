import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import {
  dashboardDaysSchema,
  scanHistoryQuerySchema,
  topThreatsQuerySchema,
} from '../schemas/dashboard'

async function fetchVerdictsByIds(
  ids: string[]
): Promise<Map<string, { verdict: string; score: number; data_processing_countries: string[] | null }>> {
  const map = new Map<
    string,
    { verdict: string; score: number; data_processing_countries: string[] | null }
  >()
  if (!ids.length) return map
  const { data } = await supabaseAdmin
    .from('site_verdicts')
    .select('id, verdict, score, data_processing_countries')
    .in('id', ids)
  for (const v of data ?? []) {
    map.set(v.id, {
      verdict: v.verdict as string,
      score: v.score as number,
      data_processing_countries: v.data_processing_countries as string[] | null,
    })
  }
  return map
}

async function fetchSitesByIds(
  ids: string[]
): Promise<Map<string, { url: string; domain: string }>> {
  const map = new Map<string, { url: string; domain: string }>()
  if (!ids.length) return map
  const { data } = await supabaseAdmin.from('scanned_sites').select('id, url, domain').in('id', ids)
  for (const s of data ?? []) {
    map.set(s.id, { url: s.url as string, domain: s.domain as string })
  }
  return map
}

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard/stats', { preHandler: [authenticate] }, async (request, reply) => {
    const q = dashboardDaysSchema.safeParse(request.query)
    if (!q.success) {
      return reply.code(400).send({ error: 'Validation error', details: q.error.flatten() })
    }
    const userId = request.user!.id
    const days = q.data.days
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { count: totalScans, error: e1 } = await supabaseAdmin
      .from('scan_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (e1) return reply.code(500).send({ error: 'Failed to load stats' })

    const { data: windowScans, error: e2 } = await supabaseAdmin
      .from('scan_history')
      .select('verdict_id')
      .eq('user_id', userId)
      .gte('scanned_at', since)

    if (e2) return reply.code(500).send({ error: 'Failed to load stats' })

    const verdictIds = [...new Set((windowScans ?? []).map((r) => r.verdict_id).filter(Boolean))] as string[]
    const verdictById = await fetchVerdictsByIds(verdictIds)

    let threatsInWindow = 0
    const verdictBreakdown: Record<string, number> = {
      safe: 0,
      suspicious: 0,
      phishing: 0,
      unknown: 0,
    }

    for (const row of windowScans ?? []) {
      const v = row.verdict_id ? verdictById.get(row.verdict_id)?.verdict ?? 'unknown' : 'unknown'
      if (v === 'phishing' || v === 'suspicious') threatsInWindow++
      if (verdictBreakdown[v] !== undefined) verdictBreakdown[v]++
      else verdictBreakdown.unknown++
    }

    const { count: openLeaks, error: e4 } = await supabaseAdmin
      .from('leak_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('acknowledged_at', null)

    if (e4) return reply.code(500).send({ error: 'Failed to load stats' })

    const { count: groupsCount, error: e5 } = await supabaseAdmin
      .from('group_members')
      .select('group_id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (e5) return reply.code(500).send({ error: 'Failed to load stats' })

    const { count: submissionsInWindow, error: e6 } = await supabaseAdmin
      .from('submitted_data_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('submitted_at', since)

    if (e6) return reply.code(500).send({ error: 'Failed to load stats' })

    return {
      total_scans: totalScans ?? 0,
      scans_in_window: windowScans?.length ?? 0,
      threats_in_window: threatsInWindow,
      open_leak_alerts: openLeaks ?? 0,
      groups_count: groupsCount ?? 0,
      submissions_in_window: submissionsInWindow ?? 0,
      verdict_breakdown: verdictBreakdown,
      window_days: days,
    }
  })

  fastify.get('/dashboard/activity', { preHandler: [authenticate] }, async (request, reply) => {
    const q = dashboardDaysSchema.safeParse(request.query)
    if (!q.success) {
      return reply.code(400).send({ error: 'Validation error', details: q.error.flatten() })
    }
    const userId = request.user!.id
    const days = q.data.days
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data: rows, error } = await supabaseAdmin
      .from('scan_history')
      .select('scanned_at, verdict_id')
      .eq('user_id', userId)
      .gte('scanned_at', since)
      .order('scanned_at', { ascending: true })

    if (error) return reply.code(500).send({ error: 'Failed to load activity' })

    const verdictIds = [...new Set((rows ?? []).map((r) => r.verdict_id).filter(Boolean))] as string[]
    const verdictById = await fetchVerdictsByIds(verdictIds)

    const byDay = new Map<string, { scans: number; threats: number }>()
    for (const row of rows ?? []) {
      const day = row.scanned_at.slice(0, 10)
      const verdict = row.verdict_id ? verdictById.get(row.verdict_id)?.verdict ?? 'unknown' : 'unknown'
      const cur = byDay.get(day) ?? { scans: 0, threats: 0 }
      cur.scans++
      if (verdict === 'phishing' || verdict === 'suspicious') cur.threats++
      byDay.set(day, cur)
    }

    const series = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        scans: v.scans,
        threats: v.threats,
      }))

    return { by_day: series }
  })

  fastify.get('/dashboard/scan-history', { preHandler: [authenticate] }, async (request, reply) => {
    const q = scanHistoryQuerySchema.safeParse(request.query)
    if (!q.success) {
      return reply.code(400).send({ error: 'Validation error', details: q.error.flatten() })
    }
    const userId = request.user!.id
    const { limit, offset } = q.data

    const { data: rows, error } = await supabaseAdmin
      .from('scan_history')
      .select('id, scanned_at, site_id, verdict_id')
      .eq('user_id', userId)
      .order('scanned_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return reply.code(500).send({ error: 'Failed to load history' })

    const siteIds = [...new Set((rows ?? []).map((r) => r.site_id))]
    const verdictIds = [...new Set((rows ?? []).map((r) => r.verdict_id).filter(Boolean))] as string[]
    const [sites, verdicts] = await Promise.all([fetchSitesByIds(siteIds), fetchVerdictsByIds(verdictIds)])

    const history = (rows ?? []).map((r) => ({
      id: r.id,
      scanned_at: r.scanned_at,
      site: sites.get(r.site_id) ?? { url: '', domain: '' },
      verdict: r.verdict_id
        ? verdicts.get(r.verdict_id) ?? { verdict: 'unknown', score: 0 }
        : { verdict: 'unknown', score: 0 },
    }))

    return { history }
  })

  fastify.get('/dashboard/top-threats', { preHandler: [authenticate] }, async (request, reply) => {
    const q = topThreatsQuerySchema.safeParse(request.query)
    if (!q.success) {
      return reply.code(400).send({ error: 'Validation error', details: q.error.flatten() })
    }
    const userId = request.user!.id
    const since = new Date(Date.now() - q.data.days * 86400000).toISOString()
    const limit = q.data.limit

    const { data: rows, error } = await supabaseAdmin
      .from('scan_history')
      .select('site_id, scanned_at, verdict_id')
      .eq('user_id', userId)
      .gte('scanned_at', since)
      .order('scanned_at', { ascending: false })
      .limit(400)

    if (error) return reply.code(500).send({ error: 'Failed to load threats' })

    const siteIds = [...new Set((rows ?? []).map((r) => r.site_id))]
    const verdictIds = [...new Set((rows ?? []).map((r) => r.verdict_id).filter(Boolean))] as string[]
    const [sites, verdicts] = await Promise.all([fetchSitesByIds(siteIds), fetchVerdictsByIds(verdictIds)])

    const best = new Map<
      string,
      { site_id: string; domain: string; verdict: string; score: number; last_at: string }
    >()

    for (const row of rows ?? []) {
      const vrow = row.verdict_id ? verdicts.get(row.verdict_id) : null
      if (!vrow) continue
      const site = sites.get(row.site_id)
      const domain = site?.domain ?? site?.url ?? 'unknown'
      const prev = best.get(row.site_id)
      if (!prev || vrow.score < prev.score) {
        best.set(row.site_id, {
          site_id: row.site_id,
          domain,
          verdict: vrow.verdict,
          score: vrow.score,
          last_at: row.scanned_at,
        })
      }
    }

    const threats = [...best.values()]
      .filter(
        (t) => t.verdict === 'phishing' || t.verdict === 'suspicious' || t.verdict === 'unknown' || t.score < 55
      )
      .sort((a, b) => a.score - b.score || b.last_at.localeCompare(a.last_at))
      .slice(0, limit)

    return { threats }
  })

  fastify.get(
    '/dashboard/submissions-by-day',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const q = dashboardDaysSchema.safeParse(request.query)
      if (!q.success) {
        return reply.code(400).send({ error: 'Validation error', details: q.error.flatten() })
      }
      const userId = request.user!.id
      const days = q.data.days
      const since = new Date(Date.now() - days * 86400000).toISOString()

      const { data: rows, error } = await supabaseAdmin
        .from('submitted_data_log')
        .select('submitted_at, data_categories, site_id')
        .eq('user_id', userId)
        .gte('submitted_at', since)
        .order('submitted_at', { ascending: true })

      if (error) {
        request.log.error({ err: error }, 'submissions-by-day query failed')
        return reply.code(500).send({ error: 'Failed to load submissions' })
      }

      const verdictIds: string[] = []
      const siteIds = [...new Set((rows ?? []).map((r) => r.site_id).filter(Boolean))] as string[]
      // We map verdict via the most recent verdict per site so we can colour risky submissions.
      const verdictBySite = new Map<string, string>()
      if (siteIds.length) {
        const { data: vs } = await supabaseAdmin
          .from('site_verdicts')
          .select('site_id, verdict, is_current')
          .in('site_id', siteIds)
        for (const v of vs ?? []) {
          if (v.is_current) verdictBySite.set(v.site_id as string, v.verdict as string)
          verdictIds.push(v.site_id as string)
        }
      }

      const byDay = new Map<
        string,
        { submissions: number; risky: number; categories: number }
      >()
      for (const row of rows ?? []) {
        const day = (row.submitted_at as string).slice(0, 10)
        const cur = byDay.get(day) ?? { submissions: 0, risky: 0, categories: 0 }
        cur.submissions++
        cur.categories += Array.isArray(row.data_categories) ? row.data_categories.length : 0
        const v = row.site_id ? verdictBySite.get(row.site_id as string) : null
        if (v === 'phishing' || v === 'suspicious') cur.risky++
        byDay.set(day, cur)
      }

      const series = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }))

      return { by_day: series }
    }
  )

  fastify.get(
    '/dashboard/data-categories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const q = dashboardDaysSchema.safeParse(request.query)
      if (!q.success) {
        return reply.code(400).send({ error: 'Validation error', details: q.error.flatten() })
      }
      const userId = request.user!.id
      const days = q.data.days
      const since = new Date(Date.now() - days * 86400000).toISOString()

      const { data: rows, error } = await supabaseAdmin
        .from('submitted_data_log')
        .select('data_categories')
        .eq('user_id', userId)
        .gte('submitted_at', since)

      if (error) {
        request.log.error({ err: error }, 'data-categories query failed')
        return reply.code(500).send({ error: 'Failed to load data categories' })
      }

      const counts = new Map<string, number>()
      for (const row of rows ?? []) {
        const cats = (row.data_categories ?? []) as string[]
        for (const c of cats) {
          counts.set(c, (counts.get(c) ?? 0) + 1)
        }
      }

      const categories = [...counts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)

      return { categories }
    }
  )

  fastify.get(
    '/dashboard/leak-severity',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.id

      const { data: rows, error } = await supabaseAdmin
        .from('leak_alerts')
        .select('severity, acknowledged_at')
        .eq('user_id', userId)

      if (error) {
        request.log.error({ err: error }, 'leak-severity query failed')
        return reply.code(500).send({ error: 'Failed to load leak severity' })
      }

      const severity: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      }
      let open = 0
      let acknowledged = 0

      for (const row of rows ?? []) {
        const s = (row.severity ?? 'medium') as string
        if (severity[s] !== undefined) severity[s]++
        else severity.medium++
        if (row.acknowledged_at) acknowledged++
        else open++
      }

      return { severity, open, acknowledged, total: (rows ?? []).length }
    }
  )

  fastify.get('/dashboard/data-map', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id
    const since = new Date(Date.now() - 90 * 86400000).toISOString()

    const { data: scans, error } = await supabaseAdmin
      .from('scan_history')
      .select('verdict_id')
      .eq('user_id', userId)
      .gte('scanned_at', since)
      .not('verdict_id', 'is', null)

    if (error) return reply.code(500).send({ error: 'Failed to load data map' })

    const verdictIds = [...new Set((scans ?? []).map((r) => r.verdict_id).filter(Boolean))] as string[]
    const verdictById = await fetchVerdictsByIds(verdictIds)

    const counts = new Map<string, number>()
    for (const s of scans ?? []) {
      if (!s.verdict_id) continue
      const countries = verdictById.get(s.verdict_id)?.data_processing_countries
      if (!countries?.length) continue
      for (const c of countries) {
        const code = (c || '').trim().toUpperCase()
        if (!code) continue
        counts.set(code, (counts.get(code) ?? 0) + 1)
      }
    }

    const countries = [...counts.entries()]
      .map(([country, total_submissions]) => ({ country, total_submissions }))
      .sort((a, b) => b.total_submissions - a.total_submissions)

    return { countries }
  })
}
