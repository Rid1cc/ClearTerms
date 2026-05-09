import { z } from 'zod'

export const checkUrlQuerySchema = z.object({
  url: z.string().min(1).max(2048),
})

export type CheckUrlQuery = z.infer<typeof checkUrlQuerySchema>
