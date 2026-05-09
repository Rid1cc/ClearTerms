import { z } from 'zod'

export const scanRequestSchema = z.object({
  url: z.string().min(1).max(2048),
  // Opcjonalna treść DOM przesłana przez wtyczkę — przyspiesza pracę
  // serwisowi AI (nie musi sam scrapować). Limit ostry by nie pakować
  // megabajtów do każdego requestu.
  dom_content: z.string().max(500_000).optional(),
})

export const extensionScanResultSchema = z.object({
  sourcePage: z.string().min(1).max(2048),
  privacyUrl: z.string().min(1).max(2048),
  analysis: z.string().min(1).max(50_000),
})

export type ScanRequest = z.infer<typeof scanRequestSchema>
export type ExtensionScanResult = z.infer<typeof extensionScanResultSchema>
