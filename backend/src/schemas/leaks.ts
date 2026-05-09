import { z } from 'zod'
import { dataCategorySchema } from '../services/aiService'

// POST /api/submitted-data
// CRITICAL: tylko kategorie. Reject jeśli klient próbuje przemycić wartości.
// Backend NIGDY nie przyjmuje treści wpisanych przez użytkownika.
export const submittedDataSchema = z
  .object({
    url: z.string().min(1).max(2048),
    data_categories: z.array(dataCategorySchema).min(1).max(20),
  })
  .strict() // strict() blokuje pola których nie znamy — np. "values", "password", "email"

export const leaksQuerySchema = z.object({
  acknowledged: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const leakAlertParamsSchema = z.object({
  alertId: z.string().uuid(),
})

export type SubmittedDataInput = z.infer<typeof submittedDataSchema>
