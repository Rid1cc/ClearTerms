import { z } from 'zod'

export const dashboardDaysSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
})

export const scanHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const topThreatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
})
