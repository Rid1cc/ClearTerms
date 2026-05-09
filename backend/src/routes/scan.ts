import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import { config } from '../config/env'
import { normalizeUrl } from '../utils/url'
import { scanRequestSchema } from '../schemas/scan'
import { analyzeUrl, AiAnalysisResult } from '../services/aiService'
import { backfillLeakAlertsForSite } from '../services/submittedDataLeak'

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

interface ScannedSiteRow {
  id: string
  url: string
  domain: string
  url_hash: string
  company_id: string | null
  last_analyzed_at: string | null
  scan_count: number
}

interface CompanyRow {
  id: string
  name: string
  headquarters_country: string | null
  website: string | null
  description: string | null
}

interface VerdictRow {
  id: string
  verdict: string
  score: number
  summary: string | null
  red_flags: unknown
  data_processing_countries: string[] | null
  analyzed_at: string
}

interface PrivacyAnalysisRow {
  short_summary: string
  data_collected: string[]
  key_clauses: unknown
  sells_data_to_third_parties: boolean | null
  transfers_outside_eea: boolean | null
  allows_account_deletion: boolean | null
  raw_policy_url: string | null
  raw_policy_excerpt: string | null
  language: string | null
}

interface CompanyAuditRow {
  known_breaches_count: number
  regulatory_fines_count: number
  incidents_timeline: unknown
  sources: unknown
  reliability_score: number | null
  last_researched_at: string
}

function isFresh(lastAnalyzedAt: string | null): boolean {
  if (!lastAnalyzedAt) return false
  const ageMs = Date.now() - new Date(lastAnalyzedAt).getTime()
  return ageMs < config.SCAN_CACHE_TTL_HOURS * 60 * 60 * 1000
}

async function getOrCreateSite(
  url: string,
  domain: string,
  hash: string
): Promise<ScannedSiteRow | null> {
  const { data: existing } = await supabaseAdmin
    .from('scanned_sites')
    .select('id, url, domain, url_hash, company_id, last_analyzed_at, scan_count')
    .eq('url_hash', hash)
    .maybeSingle()
  if (existing) return existing as ScannedSiteRow

  const { data: created, error } = await supabaseAdmin
    .from('scanned_sites')
    .insert({ url, domain, url_hash: hash })
    .select('id, url, domain, url_hash, company_id, last_analyzed_at, scan_count')
    .single()
  if (error || !created) return null
  return created as ScannedSiteRow
}

// Match po name. Dokładność jest tu ograniczona (różne firmy mogą mieć tę samą
// nazwę), ale wystarczy dla v1. Jeśli AI w przyszłości zwróci stabilniejszy
// identyfikator (domena, REGON itp.), warto przerzucić dedup na to pole.
async function upsertCompany(
  company: NonNullable<AiAnalysisResult['company']>
): Promise<CompanyRow | null> {
  const { data: existing } = await supabaseAdmin
    .from('companies')
    .select('id, name, headquarters_country, website, description')
    .eq('name', company.name)
    .maybeSingle()

  if (existing) {
    // Refresh metadata jeśli AI dostarczyło nowsze dane
    const updates: Record<string, unknown> = {}
    if (company.headquarters_country && !existing.headquarters_country)
      updates.headquarters_country = company.headquarters_country
    if (company.website && !existing.website) updates.website = company.website
    if (company.description && !existing.description) updates.description = company.description
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      const { data: updated } = await supabaseAdmin
        .from('companies')
        .update(updates)
        .eq('id', existing.id)
        .select('id, name, headquarters_country, website, description')
        .single()
      if (updated) return updated as CompanyRow
    }
    return existing as CompanyRow
  }

  const { data: created } = await supabaseAdmin
    .from('companies')
    .insert({
      name: company.name,
      headquarters_country: company.headquarters_country ?? null,
      website: company.website ?? null,
      description: company.description ?? null,
    })
    .select('id, name, headquarters_country, website, description')
    .single()
  return (created as CompanyRow) ?? null
}

async function upsertCompanyAudit(
  companyId: string,
  audit: NonNullable<AiAnalysisResult['company_audit']>
): Promise<CompanyAuditRow | null> {
  const payload = {
    company_id: companyId,
    known_breaches_count: audit.known_breaches_count,
    regulatory_fines_count: audit.regulatory_fines_count,
    incidents_timeline: audit.incidents_timeline,
    sources: audit.sources,
    reliability_score: audit.reliability_score ?? null,
    last_researched_at: new Date().toISOString(),
  }

  // Tabela ma unique(company_id) — używamy upsert.
  const { data, error } = await supabaseAdmin
    .from('company_audits')
    .upsert(payload, { onConflict: 'company_id' })
    .select(
      'known_breaches_count, regulatory_fines_count, incidents_timeline, sources, reliability_score, last_researched_at'
    )
    .single()
  if (error) return null
  return data as CompanyAuditRow
}

async function fetchCurrentVerdict(siteId: string): Promise<VerdictRow | null> {
  const { data } = await supabaseAdmin
    .from('site_verdicts')
    .select('id, verdict, score, summary, red_flags, data_processing_countries, analyzed_at')
    .eq('site_id', siteId)
    .eq('is_current', true)
    .maybeSingle()
  return (data as VerdictRow) ?? null
}

async function fetchCurrentPrivacyAnalysis(
  siteId: string
): Promise<PrivacyAnalysisRow | null> {
  const { data } = await supabaseAdmin
    .from('privacy_policy_analyses')
    .select(
      'short_summary, data_collected, key_clauses, sells_data_to_third_parties, transfers_outside_eea, allows_account_deletion, raw_policy_url, raw_policy_excerpt, language'
    )
    .eq('site_id', siteId)
    .eq('is_current', true)
    .maybeSingle()
  return (data as PrivacyAnalysisRow) ?? null
}

async function fetchCompany(companyId: string | null): Promise<CompanyRow | null> {
  if (!companyId) return null
  const { data } = await supabaseAdmin
    .from('companies')
    .select('id, name, headquarters_country, website, description')
    .eq('id', companyId)
    .maybeSingle()
  return (data as CompanyRow) ?? null
}

async function fetchCompanyAudit(companyId: string | null): Promise<CompanyAuditRow | null> {
  if (!companyId) return null
  const { data } = await supabaseAdmin
    .from('company_audits')
    .select(
      'known_breaches_count, regulatory_fines_count, incidents_timeline, sources, reliability_score, last_researched_at'
    )
    .eq('company_id', companyId)
    .maybeSingle()
  return (data as CompanyAuditRow) ?? null
}

interface AssembledResponse {
  url: string
  verdict: string
  score: number
  summary: string | null
  data_collected: string[]
  red_flags: unknown
  company: {
    name: string
    headquarters_country: string | null
    website: string | null
    description: string | null
    data_processing_countries: string[] | null
  } | null
  company_audit: {
    known_breaches: number
    regulatory_fines: number
    incidents_timeline: unknown
    sources: unknown
    reliability_score: number | null
  } | null
  privacy_policy: {
    short_summary: string
    key_clauses: unknown
    sells_data_to_third_parties: boolean | null
    transfers_outside_eea: boolean | null
    allows_account_deletion: boolean | null
    raw_policy_url: string | null
    language: string | null
  } | null
  last_analyzed_at: string | null
  cached: boolean
  partial?: boolean
}

function assembleResponse(args: {
  url: string
  verdict: VerdictRow | null
  privacy: PrivacyAnalysisRow | null
  company: CompanyRow | null
  audit: CompanyAuditRow | null
  lastAnalyzedAt: string | null
  cached: boolean
  partial?: boolean
}): AssembledResponse {
  const { url, verdict, privacy, company, audit, lastAnalyzedAt, cached, partial } = args
  return {
    url,
    verdict: verdict?.verdict ?? 'unknown',
    score: verdict?.score ?? 0,
    summary: verdict?.summary ?? null,
    data_collected: privacy?.data_collected ?? [],
    red_flags: verdict?.red_flags ?? [],
    company: company
      ? {
          name: company.name,
          headquarters_country: company.headquarters_country,
          website: company.website,
          description: company.description,
          data_processing_countries: verdict?.data_processing_countries ?? [],
        }
      : null,
    company_audit: audit
      ? {
          known_breaches: audit.known_breaches_count,
          regulatory_fines: audit.regulatory_fines_count,
          incidents_timeline: audit.incidents_timeline,
          sources: audit.sources,
          reliability_score: audit.reliability_score,
        }
      : null,
    privacy_policy: privacy
      ? {
          short_summary: privacy.short_summary,
          key_clauses: privacy.key_clauses,
          sells_data_to_third_parties: privacy.sells_data_to_third_parties,
          transfers_outside_eea: privacy.transfers_outside_eea,
          allows_account_deletion: privacy.allows_account_deletion,
          raw_policy_url: privacy.raw_policy_url,
          language: privacy.language,
        }
      : null,
    last_analyzed_at: lastAnalyzedAt,
    cached,
    ...(partial ? { partial: true } : {}),
  }
}

// ---------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------
export default async function scanRoutes(fastify: FastifyInstance) {
  // POST /api/scan
  // Pełna analiza strony (cache 24h → AI → DB → response).
  fastify.post('/scan', { preHandler: [authenticate] }, async (request, reply) => {
    const result = scanRequestSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    let normalized
    try {
      normalized = normalizeUrl(result.data.url)
    } catch {
      return reply.code(400).send({ error: 'Invalid URL' })
    }

    const userId = request.user!.id

    // -----------------------------------------------------------------
    // 1. Cache lookup
    // -----------------------------------------------------------------
    let site = await getOrCreateSite(normalized.url, normalized.domain, normalized.hash)
    if (!site) {
      return reply.code(500).send({ error: 'Failed to register site' })
    }

    if (isFresh(site.last_analyzed_at)) {
      const [verdict, privacy, company] = await Promise.all([
        fetchCurrentVerdict(site.id),
        fetchCurrentPrivacyAnalysis(site.id),
        fetchCompany(site.company_id),
      ])
      const audit = await fetchCompanyAudit(site.company_id)

      // Log do historii skanów (cached scan, triggered_refresh=false)
      await supabaseAdmin.from('scan_history').insert({
        user_id: userId,
        site_id: site.id,
        verdict_id: verdict?.id ?? null,
        triggered_refresh: false,
      })

      // Inkrement scan_count (best effort, nie blokujemy responsem)
      await supabaseAdmin
        .from('scanned_sites')
        .update({ scan_count: site.scan_count + 1 })
        .eq('id', site.id)

      return assembleResponse({
        url: site.url,
        verdict,
        privacy,
        company,
        audit,
        lastAnalyzedAt: site.last_analyzed_at,
        cached: true,
      })
    }

    // -----------------------------------------------------------------
    // 2. Pełna analiza przez serwis AI (z timeoutem + fallbackiem)
    // -----------------------------------------------------------------
    const triggeredRefresh = site.last_analyzed_at !== null
    const { result: ai, partial } = await analyzeUrl({
      url: normalized.url,
      domain: normalized.domain,
      dom_content: result.data.dom_content,
    })

    // -----------------------------------------------------------------
    // 3. Persist: company + audit → site → verdict + privacy
    // -----------------------------------------------------------------
    let company: CompanyRow | null = null
    let audit: CompanyAuditRow | null = null

    if (ai.company) {
      company = await upsertCompany(ai.company)
      if (company && ai.company_audit) {
        audit = await upsertCompanyAudit(company.id, ai.company_audit)
      } else if (company) {
        audit = await fetchCompanyAudit(company.id)
      }
    }

    const now = new Date().toISOString()
    const { data: updatedSite } = await supabaseAdmin
      .from('scanned_sites')
      .update({
        company_id: company?.id ?? site.company_id ?? null,
        last_analyzed_at: now,
        scan_count: site.scan_count + 1,
        updated_at: now,
      })
      .eq('id', site.id)
      .select('id, url, domain, url_hash, company_id, last_analyzed_at, scan_count')
      .single()

    if (updatedSite) site = updatedSite as ScannedSiteRow

    // Werdykt — trigger DB sam ustawi poprzednie is_current=false
    const { data: verdictRow } = await supabaseAdmin
      .from('site_verdicts')
      .insert({
        site_id: site.id,
        verdict: ai.verdict,
        score: ai.score,
        summary: ai.summary,
        red_flags: ai.red_flags,
        data_processing_countries: ai.data_processing_countries,
        is_current: true,
      })
      .select('id, verdict, score, summary, red_flags, data_processing_countries, analyzed_at')
      .single()

    await backfillLeakAlertsForSite(site.id, ai.verdict)

    let privacy: PrivacyAnalysisRow | null = null
    if (ai.privacy_policy) {
      const { data: privacyRow } = await supabaseAdmin
        .from('privacy_policy_analyses')
        .insert({
          site_id: site.id,
          short_summary: ai.privacy_policy.short_summary,
          data_collected: ai.privacy_policy.data_collected,
          key_clauses: ai.privacy_policy.key_clauses,
          sells_data_to_third_parties:
            ai.privacy_policy.sells_data_to_third_parties ?? null,
          transfers_outside_eea: ai.privacy_policy.transfers_outside_eea ?? null,
          allows_account_deletion: ai.privacy_policy.allows_account_deletion ?? null,
          raw_policy_url: ai.privacy_policy.raw_policy_url ?? null,
          raw_policy_excerpt: ai.privacy_policy.raw_policy_excerpt ?? null,
          language: ai.privacy_policy.language ?? null,
          is_current: true,
        })
        .select(
          'short_summary, data_collected, key_clauses, sells_data_to_third_parties, transfers_outside_eea, allows_account_deletion, raw_policy_url, raw_policy_excerpt, language'
        )
        .single()
      privacy = (privacyRow as PrivacyAnalysisRow) ?? null
    }

    // -----------------------------------------------------------------
    // 4. Historia skanów per user
    // -----------------------------------------------------------------
    await supabaseAdmin.from('scan_history').insert({
      user_id: userId,
      site_id: site.id,
      verdict_id: (verdictRow as VerdictRow | null)?.id ?? null,
      triggered_refresh: triggeredRefresh,
    })

    // -----------------------------------------------------------------
    // 5. Response
    // -----------------------------------------------------------------
    return assembleResponse({
      url: site.url,
      verdict: (verdictRow as VerdictRow | null) ?? null,
      privacy,
      company,
      audit,
      lastAnalyzedAt: now,
      cached: false,
      partial,
    })
  })
}
