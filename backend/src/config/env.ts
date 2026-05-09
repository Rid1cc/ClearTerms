import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim())),

  // Zewnętrzny serwis AI (analiza polityk prywatności + research firm).
  // Jeśli puste — backend użyje fallbacku heurystycznego (verdict=unknown, partial=true).
  AI_SERVICE_URL: z.string().url().optional(),
  AI_SERVICE_API_KEY: z.string().optional(),
  AI_SCAN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),

  // TTL cache strony — werdykt świeższy niż TTL zwracamy bez ponownej analizy.
  SCAN_CACHE_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
