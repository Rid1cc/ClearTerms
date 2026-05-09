import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin, supabaseAnon } from '../config/supabase'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../schemas/auth'

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  // Tworzy konto przez Supabase Auth. Jeśli w projekcie włączona weryfikacja emaila,
  // session będzie null dopóki użytkownik nie kliknie linku.
  fastify.post('/auth/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    const { email, password, display_name } = result.data

    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: display_name ?? email.split('@')[0] },
      },
    })

    if (error) {
      return reply.code(400).send({ error: error.message })
    }

    return reply.code(201).send({
      user: { id: data.user!.id, email: data.user!.email },
      // session jest null gdy wymagana jest weryfikacja emaila
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
          }
        : null,
      email_confirmation_required: data.session === null,
    })
  })

  // POST /api/auth/login
  // Logowanie email + hasło. Zwraca tokeny JWT.
  fastify.post('/auth/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    })

    if (error) {
      return reply.code(401).send({ error: error.message })
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: { id: data.user.id, email: data.user.email },
    }
  })

  // POST /api/auth/refresh
  // Wymienia refresh_token na nową parę tokenów.
  fastify.post('/auth/refresh', async (request, reply) => {
    const result = refreshSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: result.data.refresh_token,
    })

    if (error || !data.session) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' })
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    }
  })

  // POST /api/auth/logout
  // Unieważnia sesję po stronie Supabase. Klient powinien wyrzucić tokeny lokalnie.
  fastify.post('/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const token = request.headers.authorization!.slice(7)
    await supabaseAdmin.auth.admin.signOut(token)
    return reply.code(204).send()
  })

  // POST /api/auth/reset-password
  // Wysyła email z linkiem do resetu hasła. Zawsze zwraca 204 (nie ujawnia czy email istnieje).
  fastify.post('/auth/reset-password', async (request, reply) => {
    const result = resetPasswordSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    await supabaseAnon.auth.resetPasswordForEmail(result.data.email)
    return reply.code(204).send()
  })

  // GET /api/auth/me
  // Zwraca tożsamość zalogowanego użytkownika + profil.
  fastify.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, display_name, avatar_url, preferences, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error) {
      return reply.code(500).send({ error: 'Failed to fetch profile' })
    }

    return {
      user: { id: request.user!.id, email: request.user!.email },
      profile,
    }
  })

  // PATCH /api/auth/me
  // Aktualizuje display_name i/lub preferences.
  fastify.patch('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const result = updateProfileSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation error', details: result.error.flatten() })
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({ ...result.data, updated_at: new Date().toISOString() })
      .eq('id', request.user!.id)
      .select('id, display_name, avatar_url, preferences, created_at, updated_at')
      .single()

    if (error) {
      return reply.code(500).send({ error: 'Failed to update profile' })
    }

    return data
  })
}
