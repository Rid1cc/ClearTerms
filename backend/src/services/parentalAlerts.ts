import { supabaseAdmin } from '../config/supabase'
import type { FastifyBaseLogger } from 'fastify'

// Próg "niskiego scoringu" — werdykt < threshold = suspicious_site_visited.
// Hardcoded zamiast env var, bo to próg domenowy dla rodzica, nie operacyjny.
const LOW_SCORE_THRESHOLD = 40

type ParentalEventType =
  | 'visit_attempted'
  | 'visit_blocked'
  | 'data_submitted_to_phishing'
  | 'suspicious_site_visited'

// ---------------------------------------------------------------------
// recordParentalAlerts
// ---------------------------------------------------------------------
// Dla każdej grupy w której `userId` ma rolę `child`, wstawia wpis do
// parental_alerts. Wywoływane fire-and-forget z /api/scan i /api/check-url —
// błąd nie powinien wpływać na response do użytkownika.
// ---------------------------------------------------------------------
export async function recordParentalAlerts(
  args: {
    userId: string
    siteId: string | null
    siteUrl: string
    eventType: ParentalEventType
    details?: Record<string, unknown>
  },
  log?: FastifyBaseLogger
): Promise<void> {
  const { data: childGroups, error } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('user_id', args.userId)
    .eq('role', 'child')

  if (error) {
    log?.error({ err: error, user_id: args.userId }, 'failed to fetch child group memberships')
    return
  }
  if (!childGroups || childGroups.length === 0) return

  const rows = childGroups.map((row) => ({
    group_id: row.group_id,
    child_user_id: args.userId,
    site_id: args.siteId,
    site_url: args.siteUrl,
    event_type: args.eventType,
    details: args.details ?? {},
  }))

  const { error: insertErr } = await supabaseAdmin.from('parental_alerts').insert(rows)
  if (insertErr) {
    log?.error({ err: insertErr, user_id: args.userId }, 'failed to insert parental alerts')
  }
}

// ---------------------------------------------------------------------
// classifyVerdictForAlert
// ---------------------------------------------------------------------
// Mapuje wynik /api/scan na event_type. null = nie generujemy alertu.
// ---------------------------------------------------------------------
export function classifyVerdictForAlert(
  verdict: string,
  score: number
): ParentalEventType | null {
  if (verdict === 'phishing') return 'visit_attempted'
  if (verdict === 'suspicious' || score < LOW_SCORE_THRESHOLD) {
    return 'suspicious_site_visited'
  }
  return null
}

export { LOW_SCORE_THRESHOLD }
