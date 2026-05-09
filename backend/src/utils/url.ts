import crypto from 'crypto'

// Tracking params usuwane przy normalizacji — nie wpływają na tożsamość strony
// (różne wartości UTM nie powinny powodować dublowania wpisów w cache).
const STRIPPED_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  '_ga',
])

export interface NormalizedUrl {
  url: string // znormalizowany URL do persistencji
  domain: string // host bez www, do szybkich lookupów
  hash: string // SHA-256 hex znormalizowanego URL
}

export function normalizeUrl(input: string): NormalizedUrl {
  const trimmed = input.trim()

  // Dopuszczamy URL bez schematu — dokładamy https://
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  const parsed = new URL(withScheme)

  parsed.protocol = parsed.protocol.toLowerCase()
  parsed.hostname = parsed.hostname.toLowerCase()
  parsed.hash = ''

  // Strip default ports
  if (
    (parsed.protocol === 'http:' && parsed.port === '80') ||
    (parsed.protocol === 'https:' && parsed.port === '443')
  ) {
    parsed.port = ''
  }

  // Strip tracking params, zachowujemy resztę queries
  const filteredParams = new URLSearchParams()
  parsed.searchParams.forEach((value, key) => {
    if (!STRIPPED_QUERY_PARAMS.has(key.toLowerCase())) {
      filteredParams.append(key, value)
    }
  })
  parsed.search = filteredParams.toString() ? `?${filteredParams.toString()}` : ''

  // Trailing slash dla samego origin → zostawiamy '/'; dla głębszych ścieżek nic nie ruszamy
  const url = parsed.toString()
  const domain = parsed.hostname.replace(/^www\./, '')
  const hash = crypto.createHash('sha256').update(url).digest('hex')

  return { url, domain, hash }
}
