import { z } from 'zod'

export const scanRequestSchema = z.object({
  url: z.string().min(1).max(2048),
  // Opcjonalna treść DOM przesłana przez wtyczkę — przyspiesza pracę
  // serwisowi AI (nie musi sam scrapować). Limit ostry by nie pakować
  // megabajtów do każdego requestu.
  dom_content: z.string().max(500_000).optional(),
})

export type ScanRequest = z.infer<typeof scanRequestSchema>
