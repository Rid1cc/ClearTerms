import { supabaseAdmin } from '../config/supabase'
import type { FastifyBaseLogger } from 'fastify'
import type { DataCategory } from './aiService'

type Severity = 'low' | 'medium' | 'high' | 'critical'

// ---------------------------------------------------------------------
// Klasyfikacja severity na podstawie tego, co użytkownik wpisał.
// ---------------------------------------------------------------------
// critical — coś co sprawi że trzeba natychmiast zmienić hasło / zablokować kartę
// high     — pełna tożsamość (email + dane osobowe) na phishingu
// medium   — pojedyncze dane osobowe
// low      — dane techniczne (IP, device_id) lub mało wrażliwe
// ---------------------------------------------------------------------
const CRITICAL_CATEGORIES = new Set<DataCategory>([
  'password',
  'credit_card',
  'bank_account',
  'national_id',
  'biometric',
])

const PERSONAL_CATEGORIES = new Set<DataCategory>([
  'email',
  'phone',
  'full_name',
  'address',
  'date_of_birth',
])

function classifySeverity(categories: DataCategory[]): Severity {
  if (categories.some((c) => CRITICAL_CATEGORIES.has(c))) return 'critical'
  const personalCount = categories.filter((c) => PERSONAL_CATEGORIES.has(c)).length
  if (personalCount >= 2) return 'high'
  if (personalCount >= 1) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------
// Polski opis kategorii do wiadomości dla użytkownika.
// ---------------------------------------------------------------------
const CATEGORY_LABELS_PL: Record<DataCategory, string> = {
  email: 'email',
  password: 'hasło',
  phone: 'numer telefonu',
  full_name: 'imię i nazwisko',
  address: 'adres',
  date_of_birth: 'datę urodzenia',
  national_id: 'PESEL',
  credit_card: 'numer karty płatniczej',
  bank_account: 'numer konta bankowego',
  gps_location: 'lokalizację',
  ip_address: 'adres IP',
  device_id: 'identyfikator urządzenia',
  biometric: 'dane biometryczne',
  photo: 'zdjęcie',
  browsing_history: 'historię przeglądania',
  contacts: 'kontakty',
  other: 'inne dane',
}

function joinPolish(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return items.slice(0, -1).join(', ') + ' i ' + items[items.length - 1]
}

function buildLeakMessage(
  submittedAt: Date,
  categories: DataCategory[],
  verdict: string
): string {
  const dateStr = submittedAt.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const cats = joinPolish(categories.map((c) => CATEGORY_LABELS_PL[c] ?? c))
  const verdictLabel = verdict === 'phishing' ? 'phishingowa' : 'niewiarygodna'
  const action = categories.includes('password')
    ? ' Zmień hasło wszędzie gdzie używasz tego samego.'
    : ''
  return `${dateStr} przekazałeś tej stronie ${cats}. Strona jest ${verdictLabel} —${action || ' rozważ konsekwencje.'}`
}

// ---------------------------------------------------------------------
// detectLeaksForSite
// ---------------------------------------------------------------------
// Wywoływane po scanie który dał verdict=phishing/suspicious. Skanuje
// historię submitted_data_log dla tej strony i tworzy leak_alerts dla
// wszystkich użytkowników którzy wcześniej coś tam wpisali. Idempotentne
// — dedup po submitted_data_log_id.
// ---------------------------------------------------------------------
export async function detectLeaksForSite(
  args: {
    siteId: string
    verdict: string
  },
  log?: FastifyBaseLogger
): Promise<number> {
  if (args.verdict !== 'phishing' && args.verdict !== 'suspicious') return 0

  const { data: logs, error: logsErr } = await supabaseAdmin
    .from('submitted_data_log')
    .select('id, user_id, site_url, data_categories, submitted_at')
    .eq('site_id', args.siteId)

  if (logsErr) {
    log?.error({ err: logsErr, site_id: args.siteId }, 'leak detection: log query failed')
    return 0
  }
  if (!logs || logs.length === 0) return 0

  const logIds = logs.map((l) => l.id)
  const { data: existing } = await supabaseAdmin
    .from('leak_alerts')
    .select('submitted_data_log_id')
    .in('submitted_data_log_id', logIds)

  const existingSet = new Set((existing ?? []).map((e) => e.submitted_data_log_id))

  const toInsert = logs
    .filter((l) => !existingSet.has(l.id))
    .map((l) => {
      const categories = (l.data_categories ?? []) as DataCategory[]
      return {
        user_id: l.user_id,
        submitted_data_log_id: l.id,
        site_id: args.siteId,
        site_url: l.site_url,
        data_categories: categories,
        severity: classifySeverity(categories),
        message: buildLeakMessage(new Date(l.submitted_at), categories, args.verdict),
      }
    })

  if (toInsert.length === 0) return 0

  const { error: insertErr } = await supabaseAdmin.from('leak_alerts').insert(toInsert)
  if (insertErr) {
    log?.error({ err: insertErr, site_id: args.siteId }, 'leak detection: insert failed')
    return 0
  }
  return toInsert.length
}

// ---------------------------------------------------------------------
// checkLeakOnSubmission
// ---------------------------------------------------------------------
// Wywoływane przy POST /api/submitted-data, jeśli strona JEST już znana
// jako phishing/suspicious — wtedy wpis to natychmiastowy wyciek.
// ---------------------------------------------------------------------
export async function checkLeakOnSubmission(
  args: {
    userId: string
    submittedDataLogId: string
    siteId: string
    siteUrl: string
    submittedAt: Date
    dataCategories: DataCategory[]
    currentVerdict: string | null
  },
  log?: FastifyBaseLogger
): Promise<boolean> {
  if (args.currentVerdict !== 'phishing' && args.currentVerdict !== 'suspicious') return false

  const { error } = await supabaseAdmin.from('leak_alerts').insert({
    user_id: args.userId,
    submitted_data_log_id: args.submittedDataLogId,
    site_id: args.siteId,
    site_url: args.siteUrl,
    data_categories: args.dataCategories,
    severity: classifySeverity(args.dataCategories),
    message: buildLeakMessage(args.submittedAt, args.dataCategories, args.currentVerdict),
  })

  if (error) {
    log?.error({ err: error, log_id: args.submittedDataLogId }, 'immediate leak alert insert failed')
    return false
  }
  return true
}
