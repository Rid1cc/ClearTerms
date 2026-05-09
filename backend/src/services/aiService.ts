import { z } from 'zod'
import { config } from '../config/env'

// ---------------------------------------------------------------------
// Kontrakt z zewnętrznym serwisem AI
// ---------------------------------------------------------------------
// Zod schemy są źródłem prawdy. Backend i serwis AI dzielą tę definicję
// (sugerowany monorepo z packages/types — patrz pkt 8 specyfikacji).
// Gdy serwis AI zwróci coś nieprawidłowego, traktujemy to jak błąd i
// idziemy w fallback.

export const dataCategorySchema = z.enum([
  'email',
  'password',
  'phone',
  'full_name',
  'address',
  'date_of_birth',
  'national_id',
  'credit_card',
  'bank_account',
  'gps_location',
  'ip_address',
  'device_id',
  'biometric',
  'photo',
  'browsing_history',
  'contacts',
  'other',
])

export const verdictSchema = z.enum(['safe', 'suspicious', 'phishing', 'unknown'])

export const keyClauseSchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
})

export const aiPrivacyAnalysisSchema = z.object({
  short_summary: z.string(),
  data_collected: z.array(dataCategorySchema).default([]),
  key_clauses: z.array(keyClauseSchema).default([]),
  sells_data_to_third_parties: z.boolean().nullable().optional(),
  transfers_outside_eea: z.boolean().nullable().optional(),
  allows_account_deletion: z.boolean().nullable().optional(),
  raw_policy_url: z.string().url().nullable().optional(),
  raw_policy_excerpt: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
})

export const aiCompanySchema = z.object({
  name: z.string(),
  headquarters_country: z.string().length(2).nullable().optional(),
  website: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
})

export const aiCompanyAuditSchema = z.object({
  known_breaches_count: z.number().int().min(0).default(0),
  regulatory_fines_count: z.number().int().min(0).default(0),
  incidents_timeline: z.array(z.unknown()).default([]),
  sources: z.array(z.string()).default([]),
  reliability_score: z.number().int().min(0).max(100).nullable().optional(),
})

export const aiAnalysisResultSchema = z.object({
  verdict: verdictSchema,
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  red_flags: z.array(z.string()).default([]),
  data_processing_countries: z.array(z.string()).default([]),
  privacy_policy: aiPrivacyAnalysisSchema.nullable().optional(),
  company: aiCompanySchema.nullable().optional(),
  company_audit: aiCompanyAuditSchema.nullable().optional(),
})

export type DataCategory = z.infer<typeof dataCategorySchema>
export type Verdict = z.infer<typeof verdictSchema>
export type AiAnalysisResult = z.infer<typeof aiAnalysisResultSchema>

export interface AnalyzeRequest {
  url: string
  domain: string
  dom_content?: string
}

export interface AnalyzeResponse {
  result: AiAnalysisResult
  partial: boolean // true gdy fallback heurystyczny (AI niedostępne)
}

// ---------------------------------------------------------------------
// Klient HTTP do serwisu AI z timeoutem + fallbackiem heurystycznym
// ---------------------------------------------------------------------
export async function analyzeUrl(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  if (!config.AI_SERVICE_URL) {
    return { result: heuristicFallback(req), partial: true }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.AI_SCAN_TIMEOUT_MS)

  try {
    const response = await fetch(`${config.AI_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.AI_SERVICE_API_KEY
          ? { authorization: `Bearer ${config.AI_SERVICE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    })

    if (!response.ok) {
      return { result: heuristicFallback(req), partial: true }
    }

    const json = await response.json()
    const parsed = aiAnalysisResultSchema.safeParse(json)
    if (!parsed.success) {
      return { result: heuristicFallback(req), partial: true }
    }

    return { result: parsed.data, partial: false }
  } catch {
    // network error / abort / parse fail — wszystko leci w fallback
    return { result: heuristicFallback(req), partial: true }
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------
// Fallback heurystyczny — używany gdy AI niedostępne
// ---------------------------------------------------------------------
// Nie wykonuje analizy polityki prywatności ani research firmy,
// zwraca minimalny werdykt z partial=true. Wtyczka może wtedy
// pokazać użytkownikowi "wynik niepewny — spróbuj ponownie później".
function heuristicFallback(req: AnalyzeRequest): AiAnalysisResult {
  return {
    verdict: 'unknown',
    score: 50,
    summary:
      'Nie udało się wykonać pełnej analizy AI. Zwracamy wynik tymczasowy. Spróbuj ponownie później.',
    red_flags: [],
    data_processing_countries: [],
    privacy_policy: null,
    company: null,
    company_audit: null,
  }
}
