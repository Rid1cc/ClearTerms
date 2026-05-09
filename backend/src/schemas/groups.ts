import { z } from 'zod'

export const groupRoleSchema = z.enum(['admin', 'member', 'child'])

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
})

export const updateMemberRoleSchema = z.object({
  role: groupRoleSchema,
})

export const joinByCodeSchema = z.object({
  invite_code: z.string().min(4).max(64),
})

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: groupRoleSchema.default('member'),
})

export const groupIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const groupAndUserParamsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
})

export const groupAndInvitationParamsSchema = z.object({
  id: z.string().uuid(),
  invitationId: z.string().uuid(),
})

export const tokenParamsSchema = z.object({
  token: z.string().min(8).max(128),
})

export const scanHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const parentalAlertsQuerySchema = z.object({
  acknowledged: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  event_type: z
    .enum([
      'visit_attempted',
      'visit_blocked',
      'data_submitted_to_phishing',
      'suspicious_site_visited',
    ])
    .optional(),
  child_user_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const groupAndAlertParamsSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
})

export const safetyStatsQuerySchema = z.object({
  // Okno czasowe w dniach (default 30)
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export type GroupRole = z.infer<typeof groupRoleSchema>
export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
