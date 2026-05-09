import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import {
  createGroupSchema,
  updateGroupSchema,
  updateMemberRoleSchema,
  joinByCodeSchema,
  createInvitationSchema,
  groupIdParamsSchema,
  groupAndUserParamsSchema,
  groupAndInvitationParamsSchema,
  tokenParamsSchema,
  scanHistoryQuerySchema,
  parentalAlertsQuerySchema,
  groupAndAlertParamsSchema,
  safetyStatsQuerySchema,
  GroupRole,
} from '../schemas/groups'

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Backend operates with service_role (bypasses RLS), so we enforce membership
// and role here in code.
async function getMembership(
  groupId: string,
  userId: string
): Promise<{ role: GroupRole } | null> {
  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return { role: data.role as GroupRole }
}

function generateInviteCode(): string {
  // 16 chars, url-safe
  return crypto.randomBytes(12).toString('base64url')
}

function generateInvitationToken(): string {
  // 32 bytes ≈ 43 url-safe chars
  return crypto.randomBytes(32).toString('base64url')
}

export default async function groupRoutes(fastify: FastifyInstance) {
  // -------------------------------------------------------------------
  // POST /api/groups
  // Tworzy nową grupę. Twórca automatycznie zostaje administratorem.
  // -------------------------------------------------------------------
  fastify.post('/groups', { preHandler: [authenticate] }, async (request, reply) => {
    const result = createGroupSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    const userId = request.user!.id

    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({
        name: result.data.name,
        description: result.data.description ?? null,
        created_by: userId,
      })
      .select('id, name, description, invite_code, created_by, created_at, updated_at')
      .single()

    if (groupError || !group) {
      return reply.code(500).send({ error: 'Failed to create group' })
    }

    // Creator becomes admin
    const { error: memberError } = await supabaseAdmin.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
    })

    if (memberError) {
      // Rollback: kasujemy grupę żeby nie zostawić sieroty
      await supabaseAdmin.from('groups').delete().eq('id', group.id)
      return reply.code(500).send({ error: 'Failed to create group membership' })
    }

    return reply.code(201).send({ ...group, role: 'admin' as GroupRole })
  })

  // -------------------------------------------------------------------
  // GET /api/groups
  // Lista grup, do których należy zalogowany użytkownik.
  // -------------------------------------------------------------------
  fastify.get('/groups', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id

    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select(
        'role, joined_at, group:groups(id, name, description, invite_code, created_by, created_at, updated_at)'
      )
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })

    if (error) {
      return reply.code(500).send({ error: 'Failed to fetch groups' })
    }

    const groups = (data ?? [])
      .filter((row: any) => row.group)
      .map((row: any) => ({ ...row.group, role: row.role, joined_at: row.joined_at }))

    return { groups }
  })

  // -------------------------------------------------------------------
  // GET /api/groups/:id
  // Szczegóły grupy. Dostępne tylko dla członków.
  // -------------------------------------------------------------------
  fastify.get('/groups/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const params = groupIdParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

    const membership = await getMembership(params.data.id, request.user!.id)
    if (!membership) return reply.code(404).send({ error: 'Group not found' })

    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('id, name, description, invite_code, created_by, created_at, updated_at')
      .eq('id', params.data.id)
      .single()

    if (error || !data) return reply.code(404).send({ error: 'Group not found' })

    return { ...data, role: membership.role }
  })

  // -------------------------------------------------------------------
  // PATCH /api/groups/:id
  // Aktualizacja nazwy/opisu (tylko admin).
  // -------------------------------------------------------------------
  fastify.patch('/groups/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const params = groupIdParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

    const body = updateGroupSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Validation error', details: body.error.flatten() })
    }

    const membership = await getMembership(params.data.id, request.user!.id)
    if (!membership) return reply.code(404).send({ error: 'Group not found' })
    if (membership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

    const { data, error } = await supabaseAdmin
      .from('groups')
      .update({ ...body.data, updated_at: new Date().toISOString() })
      .eq('id', params.data.id)
      .select('id, name, description, invite_code, created_by, created_at, updated_at')
      .single()

    if (error || !data) return reply.code(500).send({ error: 'Failed to update group' })
    return data
  })

  // -------------------------------------------------------------------
  // DELETE /api/groups/:id
  // Usuwa grupę (tylko admin). Cascade czyści członkostwa, zaproszenia, alerty.
  // -------------------------------------------------------------------
  fastify.delete('/groups/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const params = groupIdParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

    const membership = await getMembership(params.data.id, request.user!.id)
    if (!membership) return reply.code(404).send({ error: 'Group not found' })
    if (membership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

    const { error } = await supabaseAdmin.from('groups').delete().eq('id', params.data.id)
    if (error) return reply.code(500).send({ error: 'Failed to delete group' })

    return reply.code(204).send()
  })

  // -------------------------------------------------------------------
  // GET /api/groups/:id/members
  // Lista członków z profilami. Widoczne dla każdego członka grupy.
  // -------------------------------------------------------------------
  fastify.get(
    '/groups/:id/members',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupIdParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

      const membership = await getMembership(params.data.id, request.user!.id)
      if (!membership) return reply.code(404).send({ error: 'Group not found' })

      const { data, error } = await supabaseAdmin
        .from('group_members')
        .select(
          'user_id, role, joined_at, profile:user_profiles(display_name, avatar_url)'
        )
        .eq('group_id', params.data.id)
        .order('joined_at', { ascending: true })

      if (error) return reply.code(500).send({ error: 'Failed to fetch members' })

      return { members: data ?? [] }
    }
  )

  // -------------------------------------------------------------------
  // PATCH /api/groups/:id/members/:userId
  // Zmiana roli członka (admin only). Admin nie może zdjąć z siebie roli,
  // jeśli jest jedynym adminem.
  // -------------------------------------------------------------------
  fastify.patch(
    '/groups/:id/members/:userId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupAndUserParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid params' })

      const body = updateMemberRoleSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: 'Validation error', details: body.error.flatten() })
      }

      const callerId = request.user!.id
      const callerMembership = await getMembership(params.data.id, callerId)
      if (!callerMembership) return reply.code(404).send({ error: 'Group not found' })
      if (callerMembership.role !== 'admin')
        return reply.code(403).send({ error: 'Admin only' })

      // Jeśli usuwamy adminowi rolę admina, sprawdzamy że nie jest ostatnim adminem
      if (params.data.userId === callerId && body.data.role !== 'admin') {
        const { count } = await supabaseAdmin
          .from('group_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', params.data.id)
          .eq('role', 'admin')
        if ((count ?? 0) <= 1) {
          return reply.code(400).send({ error: 'Cannot demote the last admin' })
        }
      }

      const { data, error } = await supabaseAdmin
        .from('group_members')
        .update({ role: body.data.role })
        .eq('group_id', params.data.id)
        .eq('user_id', params.data.userId)
        .select('user_id, role, joined_at')
        .single()

      if (error || !data) return reply.code(404).send({ error: 'Member not found' })
      return data
    }
  )

  // -------------------------------------------------------------------
  // DELETE /api/groups/:id/members/:userId
  // Usunięcie członka. Admin może usunąć każdego, użytkownik może usunąć siebie.
  // Ostatni admin nie może opuścić grupy bez powołania innego.
  // -------------------------------------------------------------------
  fastify.delete(
    '/groups/:id/members/:userId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupAndUserParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid params' })

      const callerId = request.user!.id
      const callerMembership = await getMembership(params.data.id, callerId)
      if (!callerMembership) return reply.code(404).send({ error: 'Group not found' })

      const isSelf = params.data.userId === callerId
      if (!isSelf && callerMembership.role !== 'admin') {
        return reply.code(403).send({ error: 'Admin only' })
      }

      const target = await getMembership(params.data.id, params.data.userId)
      if (!target) return reply.code(404).send({ error: 'Member not found' })

      if (target.role === 'admin') {
        const { count } = await supabaseAdmin
          .from('group_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', params.data.id)
          .eq('role', 'admin')
        if ((count ?? 0) <= 1) {
          return reply
            .code(400)
            .send({ error: 'Cannot remove the last admin — promote someone else first' })
        }
      }

      const { error } = await supabaseAdmin
        .from('group_members')
        .delete()
        .eq('group_id', params.data.id)
        .eq('user_id', params.data.userId)

      if (error) return reply.code(500).send({ error: 'Failed to remove member' })
      return reply.code(204).send()
    }
  )

  // -------------------------------------------------------------------
  // POST /api/groups/:id/invite-code
  // Generuje (lub rotuje) wspólny kod zaproszenia grupy. Admin only.
  // -------------------------------------------------------------------
  fastify.post(
    '/groups/:id/invite-code',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupIdParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

      const membership = await getMembership(params.data.id, request.user!.id)
      if (!membership) return reply.code(404).send({ error: 'Group not found' })
      if (membership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      // Retry on rare invite_code collisions (unique index)
      for (let i = 0; i < 5; i++) {
        const code = generateInviteCode()
        const { data, error } = await supabaseAdmin
          .from('groups')
          .update({ invite_code: code, updated_at: new Date().toISOString() })
          .eq('id', params.data.id)
          .select('invite_code')
          .single()
        if (!error && data) return { invite_code: data.invite_code }
      }
      return reply.code(500).send({ error: 'Failed to generate invite code' })
    }
  )

  // -------------------------------------------------------------------
  // DELETE /api/groups/:id/invite-code
  // Wyłącza kod zaproszenia (czyści pole). Admin only.
  // -------------------------------------------------------------------
  fastify.delete(
    '/groups/:id/invite-code',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupIdParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

      const membership = await getMembership(params.data.id, request.user!.id)
      if (!membership) return reply.code(404).send({ error: 'Group not found' })
      if (membership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const { error } = await supabaseAdmin
        .from('groups')
        .update({ invite_code: null, updated_at: new Date().toISOString() })
        .eq('id', params.data.id)

      if (error) return reply.code(500).send({ error: 'Failed to revoke invite code' })
      return reply.code(204).send()
    }
  )

  // -------------------------------------------------------------------
  // POST /api/groups/join
  // Dołączanie do grupy przez wspólny kod (rola: member).
  // -------------------------------------------------------------------
  fastify.post('/groups/join', { preHandler: [authenticate] }, async (request, reply) => {
    const body = joinByCodeSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Validation error', details: body.error.flatten() })
    }

    const { data: group, error } = await supabaseAdmin
      .from('groups')
      .select('id, name')
      .eq('invite_code', body.data.invite_code)
      .maybeSingle()

    if (error || !group) {
      return reply.code(404).send({ error: 'Invalid or expired invite code' })
    }

    const userId = request.user!.id

    const existing = await getMembership(group.id, userId)
    if (existing) {
      return reply.code(200).send({ group_id: group.id, role: existing.role, already_member: true })
    }

    const { error: insertErr } = await supabaseAdmin.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    })

    if (insertErr) return reply.code(500).send({ error: 'Failed to join group' })

    return reply.code(201).send({ group_id: group.id, role: 'member' as GroupRole })
  })

  // -------------------------------------------------------------------
  // POST /api/groups/:id/invitations
  // Tworzy zaproszenie email z indywidualnym tokenem. Admin only.
  // (Wysyłka emaila — do zrobienia po stronie integracji z mailerem;
  // backend zwraca token, frontend buduje link.)
  // -------------------------------------------------------------------
  fastify.post(
    '/groups/:id/invitations',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupIdParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

      const body = createInvitationSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: 'Validation error', details: body.error.flatten() })
      }

      const membership = await getMembership(params.data.id, request.user!.id)
      if (!membership) return reply.code(404).send({ error: 'Group not found' })
      if (membership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const token = generateInvitationToken()

      const { data, error } = await supabaseAdmin
        .from('group_invitations')
        .insert({
          group_id: params.data.id,
          email: body.data.email,
          role: body.data.role,
          token,
          invited_by: request.user!.id,
        })
        .select('id, group_id, email, role, token, status, expires_at, created_at')
        .single()

      if (error || !data) {
        // 23505 = unique_violation (np. już istnieje pending invite na ten email)
        if ((error as any)?.code === '23505') {
          return reply
            .code(409)
            .send({ error: 'A pending invitation already exists for this email' })
        }
        return reply.code(500).send({ error: 'Failed to create invitation' })
      }

      return reply.code(201).send(data)
    }
  )

  // -------------------------------------------------------------------
  // GET /api/groups/:id/invitations
  // Lista pending zaproszeń grupy. Admin only.
  // -------------------------------------------------------------------
  fastify.get(
    '/groups/:id/invitations',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupIdParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

      const membership = await getMembership(params.data.id, request.user!.id)
      if (!membership) return reply.code(404).send({ error: 'Group not found' })
      if (membership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const { data, error } = await supabaseAdmin
        .from('group_invitations')
        .select('id, email, role, status, expires_at, created_at, accepted_at')
        .eq('group_id', params.data.id)
        .order('created_at', { ascending: false })

      if (error) return reply.code(500).send({ error: 'Failed to fetch invitations' })
      return { invitations: data ?? [] }
    }
  )

  // -------------------------------------------------------------------
  // DELETE /api/groups/:id/invitations/:invitationId
  // Cofnięcie zaproszenia (status: revoked). Admin only.
  // -------------------------------------------------------------------
  fastify.delete(
    '/groups/:id/invitations/:invitationId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupAndInvitationParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid params' })

      const membership = await getMembership(params.data.id, request.user!.id)
      if (!membership) return reply.code(404).send({ error: 'Group not found' })
      if (membership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const { data, error } = await supabaseAdmin
        .from('group_invitations')
        .update({ status: 'revoked' })
        .eq('id', params.data.invitationId)
        .eq('group_id', params.data.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

      if (error) return reply.code(500).send({ error: 'Failed to revoke invitation' })
      if (!data) return reply.code(404).send({ error: 'Invitation not found or not pending' })
      return reply.code(204).send()
    }
  )

  // -------------------------------------------------------------------
  // POST /api/invitations/:token/accept
  // Akceptacja zaproszenia po tokenie z linka mailowego.
  // Token zaproszenia musi pasować do emaila zalogowanego użytkownika.
  // -------------------------------------------------------------------
  fastify.post(
    '/invitations/:token/accept',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = tokenParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid token' })

      const { data: invitation, error } = await supabaseAdmin
        .from('group_invitations')
        .select('id, group_id, email, role, status, expires_at')
        .eq('token', params.data.token)
        .maybeSingle()

      if (error || !invitation) {
        return reply.code(404).send({ error: 'Invalid invitation token' })
      }

      if (invitation.status !== 'pending') {
        return reply
          .code(410)
          .send({ error: `Invitation is ${invitation.status}` })
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await supabaseAdmin
          .from('group_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)
        return reply.code(410).send({ error: 'Invitation has expired' })
      }

      const userEmail = request.user!.email?.toLowerCase()
      if (!userEmail || userEmail !== invitation.email.toLowerCase()) {
        return reply
          .code(403)
          .send({ error: 'This invitation is for a different email address' })
      }

      const userId = request.user!.id
      const existing = await getMembership(invitation.group_id, userId)
      if (existing) {
        await supabaseAdmin
          .from('group_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
          .eq('id', invitation.id)
        return {
          group_id: invitation.group_id,
          role: existing.role,
          already_member: true,
        }
      }

      const { error: memberErr } = await supabaseAdmin.from('group_members').insert({
        group_id: invitation.group_id,
        user_id: userId,
        role: invitation.role,
      })
      if (memberErr) return reply.code(500).send({ error: 'Failed to join group' })

      await supabaseAdmin
        .from('group_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
        .eq('id', invitation.id)

      return reply.code(201).send({
        group_id: invitation.group_id,
        role: invitation.role as GroupRole,
      })
    }
  )

  // -------------------------------------------------------------------
  // GET /api/groups/:id/members/:userId/scan-history
  // Historia skanów członka — tylko admin grupy.
  // (Dla rodzica = historia skanów dziecka, dla lidera = pracownika.)
  // -------------------------------------------------------------------
  fastify.get(
    '/groups/:id/members/:userId/scan-history',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupAndUserParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid params' })

      const query = scanHistoryQuerySchema.safeParse(request.query)
      if (!query.success) return reply.code(400).send({ error: 'Invalid query params' })

      const callerMembership = await getMembership(params.data.id, request.user!.id)
      if (!callerMembership) return reply.code(404).send({ error: 'Group not found' })
      if (callerMembership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const target = await getMembership(params.data.id, params.data.userId)
      if (!target) return reply.code(404).send({ error: 'Member not found in this group' })

      const { limit, offset } = query.data
      const { data, error } = await supabaseAdmin
        .from('scan_history')
        .select(
          'id, scanned_at, triggered_refresh, site:scanned_sites(id, url, domain), verdict:site_verdicts(verdict, score, summary)'
        )
        .eq('user_id', params.data.userId)
        .order('scanned_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) return reply.code(500).send({ error: 'Failed to fetch scan history' })
      return { history: data ?? [], limit, offset }
    }
  )

  // -------------------------------------------------------------------
  // GET /api/groups/:id/members/:userId/parental-alerts
  // Alerty kontroli rodzicielskiej dla konkretnego dziecka. Admin only.
  // -------------------------------------------------------------------
  fastify.get(
    '/groups/:id/members/:userId/parental-alerts',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupAndUserParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid params' })

      const callerMembership = await getMembership(params.data.id, request.user!.id)
      if (!callerMembership) return reply.code(404).send({ error: 'Group not found' })
      if (callerMembership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const { data, error } = await supabaseAdmin
        .from('parental_alerts')
        .select('id, site_url, event_type, details, occurred_at, acknowledged_at')
        .eq('group_id', params.data.id)
        .eq('child_user_id', params.data.userId)
        .order('occurred_at', { ascending: false })

      if (error) return reply.code(500).send({ error: 'Failed to fetch alerts' })
      return { alerts: data ?? [] }
    }
  )

  // -------------------------------------------------------------------
  // GET /api/groups/:id/parental-alerts
  // Lista wszystkich alertów w grupie (po wszystkich dzieciach).
  // Admin only. Filtry: acknowledged, event_type, child_user_id.
  // -------------------------------------------------------------------
  fastify.get(
    '/groups/:id/parental-alerts',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupIdParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid group id' })

      const query = parentalAlertsQuerySchema.safeParse(request.query)
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query', details: query.error.flatten() })
      }

      const callerMembership = await getMembership(params.data.id, request.user!.id)
      if (!callerMembership) return reply.code(404).send({ error: 'Group not found' })
      if (callerMembership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      let q = supabaseAdmin
        .from('parental_alerts')
        .select(
          'id, child_user_id, site_id, site_url, event_type, details, occurred_at, acknowledged_at, child:user_profiles!parental_alerts_child_user_id_fkey(display_name, avatar_url)',
          { count: 'exact' }
        )
        .eq('group_id', params.data.id)

      if (query.data.acknowledged === true) q = q.not('acknowledged_at', 'is', null)
      else if (query.data.acknowledged === false) q = q.is('acknowledged_at', null)
      if (query.data.event_type) q = q.eq('event_type', query.data.event_type)
      if (query.data.child_user_id) q = q.eq('child_user_id', query.data.child_user_id)

      const { data, error, count } = await q
        .order('occurred_at', { ascending: false })
        .range(query.data.offset, query.data.offset + query.data.limit - 1)

      if (error) return reply.code(500).send({ error: 'Failed to fetch alerts' })
      return {
        alerts: data ?? [],
        total: count ?? 0,
        limit: query.data.limit,
        offset: query.data.offset,
      }
    }
  )

  // -------------------------------------------------------------------
  // POST /api/groups/:id/parental-alerts/:alertId/acknowledge
  // Oznacza alert jako przejrzany. Admin only.
  // -------------------------------------------------------------------
  fastify.post(
    '/groups/:id/parental-alerts/:alertId/acknowledge',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupAndAlertParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid params' })

      const callerMembership = await getMembership(params.data.id, request.user!.id)
      if (!callerMembership) return reply.code(404).send({ error: 'Group not found' })
      if (callerMembership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const { data, error } = await supabaseAdmin
        .from('parental_alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', params.data.alertId)
        .eq('group_id', params.data.id)
        .is('acknowledged_at', null)
        .select('id, acknowledged_at')
        .maybeSingle()

      if (error) return reply.code(500).send({ error: 'Failed to acknowledge alert' })
      if (!data) return reply.code(404).send({ error: 'Alert not found or already acknowledged' })
      return data
    }
  )

  // -------------------------------------------------------------------
  // GET /api/groups/:id/members/:userId/safety-stats
  // Statystyki bezpieczeństwa członka — total scans, blocked, suspicious,
  // open alerts, top zagrożenia z ostatnich N dni. Admin only.
  // -------------------------------------------------------------------
  fastify.get(
    '/groups/:id/members/:userId/safety-stats',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = groupAndUserParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid params' })

      const query = safetyStatsQuerySchema.safeParse(request.query)
      if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

      const callerMembership = await getMembership(params.data.id, request.user!.id)
      if (!callerMembership) return reply.code(404).send({ error: 'Group not found' })
      if (callerMembership.role !== 'admin') return reply.code(403).send({ error: 'Admin only' })

      const target = await getMembership(params.data.id, params.data.userId)
      if (!target) return reply.code(404).send({ error: 'Member not found in this group' })

      const sinceIso = new Date(
        Date.now() - query.data.days * 24 * 60 * 60 * 1000
      ).toISOString()

      // Wszystko leci równolegle — to są niezależne agregacje.
      const [
        totalScansRes,
        recentScansRes,
        openAlertsRes,
        blockedAlertsRes,
        suspiciousAlertsRes,
        recentScansByVerdict,
      ] = await Promise.all([
        supabaseAdmin
          .from('scan_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', params.data.userId),
        supabaseAdmin
          .from('scan_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', params.data.userId)
          .gte('scanned_at', sinceIso),
        supabaseAdmin
          .from('parental_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', params.data.id)
          .eq('child_user_id', params.data.userId)
          .is('acknowledged_at', null),
        supabaseAdmin
          .from('parental_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', params.data.id)
          .eq('child_user_id', params.data.userId)
          .eq('event_type', 'visit_blocked')
          .gte('occurred_at', sinceIso),
        supabaseAdmin
          .from('parental_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', params.data.id)
          .eq('child_user_id', params.data.userId)
          .eq('event_type', 'suspicious_site_visited')
          .gte('occurred_at', sinceIso),
        supabaseAdmin
          .from('scan_history')
          .select('verdict:site_verdicts(verdict), site:scanned_sites(domain)')
          .eq('user_id', params.data.userId)
          .gte('scanned_at', sinceIso)
          .limit(500),
      ])

      // Oblicz top domains z bad verdicts.
      // Supabase typuje zagnieżdżone joiny jako tablice (nie wie że FK jest 1:1),
      // więc rzutujemy przez unknown na shape z optional array/object.
      type ScanRow = {
        verdict?: { verdict: string } | { verdict: string }[] | null
        site?: { domain: string } | { domain: string }[] | null
      }
      const pickFirst = <T>(v: T | T[] | null | undefined): T | null =>
        Array.isArray(v) ? v[0] ?? null : v ?? null

      const domainCounts = new Map<string, number>()
      for (const row of (recentScansByVerdict.data ?? []) as unknown as ScanRow[]) {
        const v = pickFirst(row.verdict)?.verdict
        const d = pickFirst(row.site)?.domain
        if (!d || !v) continue
        if (v === 'phishing' || v === 'suspicious') {
          domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1)
        }
      }
      const topRiskyDomains = [...domainCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count }))

      return {
        window_days: query.data.days,
        total_scans: totalScansRes.count ?? 0,
        scans_in_window: recentScansRes.count ?? 0,
        open_alerts: openAlertsRes.count ?? 0,
        blocked_in_window: blockedAlertsRes.count ?? 0,
        suspicious_in_window: suspiciousAlertsRes.count ?? 0,
        top_risky_domains: topRiskyDomains,
      }
    }
  )
}
