import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import {
  windowQuerySchema,
  scanHistoryQuerySchema,
  topThreatsQuerySchema,
} from '../schemas/dashboard'

// ---------------------------------------------------------------------
// Supabase typuje zagnieżdżone joiny jako tablice (nie wie czy FK jest 1:1).
// pickFirst rozpakowuje to do single object | null.
// ---------------------------------------------------------------------
function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

function sinceIsoForDays(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // -------------------------------------------------------------------
  // GET /api/dashboard/stats?days=30
  // -------------------------------------------------------------------
  // Top-line counters dla dashboardu webowego: liczba skanów, breakdown
  // werdyktów, otwarte alerty (leaks + parental gdy admin grupy).
  // -------------------------------------------------------------------
  fastify.get('/dashboard/stats', { preHandler: [authenticate] }, async (request, reply) => {
    const query = windowQuerySchema.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const userId = request.user!.id
    const sinceIso = sinceIsoForDays(query.data.days)

    // Wszystko w paraleli — niezależne agregacje.
    const [
      totalScansRes,
      windowScansRes,
      uniqueSitesRes,
      verdictBreakdownRaw,
      openLeaksRes,
      parentalAdminGroupsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('scan_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('scan_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('scanned_at', sinceIso),
      // Unikalne strony z ostatnich N dni — pobieramy site_id i liczymy w JS
      supabaseAdmin
        .from('scan_history')
        .select('site_id')
        .eq('user_id', userId)
        .gte('scanned_at', sinceIso)
        .limit(2000),
      supabaseAdmin
        .from('scan_history')
        .select('verdict:site_verdicts(verdict)')
        .eq('user_id', userId)
        .gte('scanned_at', sinceIso)
        .limit(2000),
      supabaseAdmin
        .from('leak_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('acknowledged_at', null),
      // Grupy w których jestem adminem — do liczenia parental alerts
      supabaseAdmin
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('role', 'admin'),
    ])

    const uniqueSites = new Set(
      (uniqueSitesRes.data ?? []).map((r) => r.site_id).filter(Boolean)
    )

    const verdictBreakdown = { safe: 0, suspicious: 0, phishing: 0, unknown: 0 }
    for (const row of (verdictBreakdownRaw.data ?? []) as Array<{
      verdict: { verdict: string } | { verdict: string }[] | null
    }>) {
      const v = pickFirst(row.verdict)?.verdict
      if (v && v in verdictBreakdown) {
        verdictBreakdown[v as keyof typeof verdictBreakdown] += 1
      }
    }

    let openParentalAlertsAsAdmin = 0
    const adminGroupIds = (parentalAdminGroupsRes.data ?? []).map((r) => r.group_id)
    if (adminGroupIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('parental_alerts')
        .select('id', { count: 'exact', head: true })
        .in('group_id', adminGroupIds)
        .is('acknowledged_at', null)
      openParentalAlertsAsAdmin = count ?? 0
    }

    return {
      window_days: query.data.days,
      total_scans: totalScansRes.count ?? 0,
      scans_in_window: windowScansRes.count ?? 0,
      unique_sites_in_window: uniqueSites.size,
      verdict_breakdown: verdictBreakdown,
      threats_in_window: verdictBreakdown.phishing + verdictBreakdown.suspicious,
      open_leak_alerts: openLeaksRes.count ?? 0,
      open_parental_alerts_as_admin: openParentalAlertsAsAdmin,
    }
  })

  // -------------------------------------------------------------------
  // GET /api/dashboard/scan-history?limit=50&offset=0&verdict=phishing
  // -------------------------------------------------------------------
  fastify.get(
    '/dashboard/scan-history',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = scanHistoryQuerySchema.safeParse(request.query)
      if (!query.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid query', details: query.error.flatten() })
      }

      let q = supabaseAdmin
        .from('scan_history')
        .select(
          'id, scanned_at, triggered_refresh, site:scanned_sites(id, url, domain), verdict:site_verdicts(verdict, score, summary)',
          { count: 'exact' }
        )
        .eq('user_id', request.user!.id)

      if (query.data.verdict) {
        // Filtr po werdykcie — ograniczamy poprzez join na verdict.verdict
        // Supabase JS nie pozwala filtrować po polach z embeddingu, więc
        // doczytujemy w JS dla małych zestawów. Dla większych skali można
        // przerzucić filtr do widoku/RPC.
      }

      const { data, error, count } = await q
        .order('scanned_at', { ascending: false })
        .range(query.data.offset, query.data.offset + query.data.limit - 1)

      if (error) return reply.code(500).send({ error: 'Failed to fetch history' })

      let history = data ?? []
      if (query.data.verdict) {
        history = history.filter((row: any) => {
          const v = pickFirst(row.verdict) as { verdict: string } | null
          return v?.verdict === query.data.verdict
        })
      }

      return {
        history,
        total: count ?? 0,
        limit: query.data.limit,
        offset: query.data.offset,
      }
    }
  )

  // -------------------------------------------------------------------
  // GET /api/dashboard/top-threats?days=30&limit=10
  // -------------------------------------------------------------------
  // Top zagrożenia z ostatnich N dni — strony z werdyktem phishing/suspicious
  // najczęściej skanowane przez użytkownika.
  // -------------------------------------------------------------------
  fastify.get(
    '/dashboard/top-threats',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = topThreatsQuerySchema.safeParse(request.query)
      if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

      const sinceIso = sinceIsoForDays(query.data.days)

      const { data, error } = await supabaseAdmin
        .from('scan_history')
        .select(
          'site:scanned_sites(id, url, domain), verdict:site_verdicts(verdict, score, summary)'
        )
        .eq('user_id', request.user!.id)
        .gte('scanned_at', sinceIso)
        .limit(2000)

      if (error) return reply.code(500).send({ error: 'Failed to fetch top threats' })

      type Aggr = {
        site_id: string
        url: string
        domain: string
        verdict: string
        score: number
        summary: string | null
        encounters: number
      }
      const byDomain = new Map<string, Aggr>()

      for (const row of (data ?? []) as Array<{
        site: { id: string; url: string; domain: string } | { id: string; url: string; domain: string }[] | null
        verdict: { verdict: string; score: number; summary: string | null } | { verdict: string; score: number; summary: string | null }[] | null
      }>) {
        const site = pickFirst(row.site)
        const verdict = pickFirst(row.verdict)
        if (!site || !verdict) continue
        if (verdict.verdict !== 'phishing' && verdict.verdict !== 'suspicious') continue

        const key = site.domain
        const existing = byDomain.get(key)
        if (existing) {
          existing.encounters += 1
          // Trzymamy najgorszy widziany score dla tego domain
          if (verdict.score < existing.score) {
            existing.score = verdict.score
            existing.verdict = verdict.verdict
            existing.summary = verdict.summary
          }
        } else {
          byDomain.set(key, {
            site_id: site.id,
            url: site.url,
            domain: site.domain,
            verdict: verdict.verdict,
            score: verdict.score,
            summary: verdict.summary,
            encounters: 1,
          })
        }
      }

      // Sortowanie: phishing przed suspicious, potem encounters desc, potem score asc
      const top = [...byDomain.values()]
        .sort((a, b) => {
          if (a.verdict !== b.verdict) return a.verdict === 'phishing' ? -1 : 1
          if (a.encounters !== b.encounters) return b.encounters - a.encounters
          return a.score - b.score
        })
        .slice(0, query.data.limit)

      return { window_days: query.data.days, threats: top }
    }
  )

  // -------------------------------------------------------------------
  // GET /api/dashboard/data-map
  // -------------------------------------------------------------------
  // Mapa sprzedaży danych — agregacja: do jakich krajów / firm trafiły
  // dane użytkownika. Łączy submitted_data_log z site → company →
  // privacy_policy_analyses (data_collected) + site_verdicts
  // (data_processing_countries).
  //
  // Output po krajach (kraj firmy + kraje przetwarzania) + per company
  // breakdown z kategoriami danych i liczbą submisji.
  // -------------------------------------------------------------------
  fastify.get(
    '/dashboard/data-map',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.id

      const { data: logs, error } = await supabaseAdmin
        .from('submitted_data_log')
        .select(
          'id, data_categories, submitted_at, site_url, site:scanned_sites(id, domain, company_id, company:companies(id, name, headquarters_country))'
        )
        .eq('user_id', userId)
        .not('site_id', 'is', null)
        .limit(5000)

      if (error) return reply.code(500).send({ error: 'Failed to fetch data map' })

      // Bulk-fetch krajów przetwarzania per site (current verdict)
      const siteIds = Array.from(
        new Set(
          (logs ?? [])
            .map((l: any) => pickFirst(l.site)?.id)
            .filter((id): id is string => !!id)
        )
      )

      let processingCountriesBySite = new Map<string, string[]>()
      if (siteIds.length > 0) {
        const { data: verdicts } = await supabaseAdmin
          .from('site_verdicts')
          .select('site_id, data_processing_countries')
          .in('site_id', siteIds)
          .eq('is_current', true)
        for (const v of verdicts ?? []) {
          processingCountriesBySite.set(v.site_id, (v.data_processing_countries as string[]) ?? [])
        }
      }

      // Agregacja
      type CompanyAgg = {
        company_id: string | null
        company_name: string | null
        headquarters_country: string | null
        sites: Set<string>
        data_categories: Set<string>
        submission_count: number
      }
      type CountryAgg = {
        country: string
        companies: Map<string, CompanyAgg>
        total_submissions: number
        total_categories: Set<string>
      }
      const byCountry = new Map<string, CountryAgg>()

      const ensureCountry = (country: string): CountryAgg => {
        let c = byCountry.get(country)
        if (!c) {
          c = {
            country,
            companies: new Map(),
            total_submissions: 0,
            total_categories: new Set(),
          }
          byCountry.set(country, c)
        }
        return c
      }

      const ensureCompany = (
        countryAgg: CountryAgg,
        companyId: string | null,
        companyName: string | null,
        hq: string | null
      ): CompanyAgg => {
        const key = companyId ?? `__nameonly:${companyName ?? 'unknown'}`
        let c = countryAgg.companies.get(key)
        if (!c) {
          c = {
            company_id: companyId,
            company_name: companyName,
            headquarters_country: hq,
            sites: new Set(),
            data_categories: new Set(),
            submission_count: 0,
          }
          countryAgg.companies.set(key, c)
        }
        return c
      }

      for (const row of (logs ?? []) as any[]) {
        const site = pickFirst(row.site) as
          | {
              id: string
              domain: string
              company_id: string | null
              company:
                | { id: string; name: string; headquarters_country: string | null }
                | { id: string; name: string; headquarters_country: string | null }[]
                | null
            }
          | null
        if (!site) continue

        const company = pickFirst(site.company)
        const categories = (row.data_categories ?? []) as string[]

        // Lista krajów dla tej submisji = HQ firmy + processing countries
        const countries = new Set<string>()
        if (company?.headquarters_country) countries.add(company.headquarters_country)
        for (const c of processingCountriesBySite.get(site.id) ?? []) countries.add(c)

        if (countries.size === 0) {
          countries.add('UNKNOWN')
        }

        for (const country of countries) {
          const countryAgg = ensureCountry(country)
          const companyAgg = ensureCompany(
            countryAgg,
            company?.id ?? null,
            company?.name ?? null,
            company?.headquarters_country ?? null
          )
          companyAgg.sites.add(site.id)
          companyAgg.submission_count += 1
          for (const cat of categories) {
            companyAgg.data_categories.add(cat)
            countryAgg.total_categories.add(cat)
          }
          countryAgg.total_submissions += 1
        }
      }

      const result = [...byCountry.values()]
        .map((c) => ({
          country: c.country,
          total_submissions: c.total_submissions,
          data_categories: [...c.total_categories],
          companies: [...c.companies.values()]
            .map((co) => ({
              company_id: co.company_id,
              name: co.company_name,
              headquarters_country: co.headquarters_country,
              site_count: co.sites.size,
              data_categories: [...co.data_categories],
              submission_count: co.submission_count,
            }))
            .sort((a, b) => b.submission_count - a.submission_count),
        }))
        .sort((a, b) => b.total_submissions - a.total_submissions)

      return { countries: result }
    }
  )
}
