import { z } from 'zod'

/** Must match PostgreSQL enum `data_category`. */
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

export type DataCategory = z.infer<typeof dataCategorySchema>

export const submittedDataBodySchema = z.object({
  site_url: z.string().min(1).max(2048),
  data_categories: z.array(dataCategorySchema).min(1).max(32),
})

export const leaksMeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})
