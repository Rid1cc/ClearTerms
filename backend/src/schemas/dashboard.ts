import { z } from 'zod'

export const windowQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export const scanHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  verdict: z.enum(['safe', 'suspicious', 'phishing', 'unknown']).optional(),
})

export const topThreatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const companyIdParamsSchema = z.object({
  id: z.string().uuid(),
})
