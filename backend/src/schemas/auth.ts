import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1).max(100).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
})

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  preferences: z.record(z.unknown()).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
