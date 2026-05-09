import { z } from 'zod'

export const scanRequestSchema = z.object({
  url: z.string().min(1).max(2048),
  // Opcjonalna treść DOM przesłana przez wtyczkę — przyspiesza pracę
  // serwisowi AI (nie musi sam scrapować). Limit ostry by nie pakować
  // megabajtów do każdego requestu.
  dom_content: z.string().max(500_000).optional(),
  // Stale-while-revalidate: jeśli werdykt jest > TTL ALE istnieje poprzedni,
  // zwróć stary natychmiast z `stale: true` i odśwież w tle. Default false:
  // klient czeka na świeży werdykt (sync). Wtyczka może preferować true
  // (instant feedback), dashboard "rescan" — false (chce świeże dane).
  prefer_stale: z.boolean().default(false),
})

export type ScanRequest = z.infer<typeof scanRequestSchema>
