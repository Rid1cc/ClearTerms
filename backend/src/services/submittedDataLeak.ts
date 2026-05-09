import { supabaseAdmin } from '../config/supabase'

function severityForVerdict(verdict: string): 'low' | 'medium' | 'high' | 'critical' {
  if (verdict === 'phishing') return 'critical'
  if (verdict === 'suspicious') return 'high'
  return 'medium'
}

/** Tworzy leak_alert jeśli werdykt strony jest ryzykowny i alert jeszcze nie istnieje. */
export async function createLeakAlertIfRisky(params: {
  userId: string
  submittedLogId: string
  siteId: string | null
  siteUrl: string
  dataCategories: string[]
  verdict: string
}): Promise<void> {
  if (params.verdict !== 'phishing' && params.verdict !== 'suspicious') return

  const { data: existing } = await supabaseAdmin
    .from('leak_alerts')
    .select('id')
    .eq('submitted_data_log_id', params.submittedLogId)
    .maybeSingle()
  if (existing) return

  const severity = severityForVerdict(params.verdict)
  const message = `Przekazano dane (kategorie: ${params.dataCategories.join(', ')}) stronie ocenionej jako „${params.verdict}".`

  await supabaseAdmin.from('leak_alerts').insert({
    user_id: params.userId,
    submitted_data_log_id: params.submittedLogId,
    site_id: params.siteId,
    site_url: params.siteUrl,
    data_categories: params.dataCategories,
    severity,
    message,
  })
}

/** Po nowym werdykcie phishing/suspicious — alerty dla wcześniejszych wpisów submitted_data_log. */
export async function backfillLeakAlertsForSite(siteId: string, verdict: string): Promise<void> {
  if (verdict !== 'phishing' && verdict !== 'suspicious') return

  const { data: logs } = await supabaseAdmin
    .from('submitted_data_log')
    .select('id, user_id, site_url, data_categories')
    .eq('site_id', siteId)

  for (const log of logs ?? []) {
    await createLeakAlertIfRisky({
      userId: log.user_id,
      submittedLogId: log.id,
      siteId,
      siteUrl: log.site_url,
      dataCategories: log.data_categories as string[],
      verdict,
    })
  }
}
