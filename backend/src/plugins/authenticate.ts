import { FastifyRequest, FastifyReply } from 'fastify'
import { supabaseAdmin } from '../config/supabase'

// Fastify preHandler — verifies Supabase JWT from Authorization: Bearer <token>
// Used by both the browser extension and the web dashboard
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Missing Bearer token' })
    return
  }

  const token = authHeader.slice(7)
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
    return
  }

  request.user = user
}
