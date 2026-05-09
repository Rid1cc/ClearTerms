import { FastifyInstance } from 'fastify'
import { authenticate } from '../plugins/authenticate'
import { supabaseAdmin } from '../config/supabase'
import { companyIdParamsSchema } from '../schemas/dashboard'

export default async function companyRoutes(fastify: FastifyInstance) {
  // -------------------------------------------------------------------
  // GET /api/companies/:id/audit
  // -------------------------------------------------------------------
  // Audyt firmy — oś czasu incydentów, licznik wycieków, źródła +
  // lista podpiętych domen. Dane są publiczne dla zalogowanych
  // użytkowników (RLS w bazie też tak ustawione).
  // -------------------------------------------------------------------
  fastify.get(
    '/companies/:id/audit',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = companyIdParamsSchema.safeParse(request.params)
      if (!params.success) return reply.code(400).send({ error: 'Invalid company id' })

      const [companyRes, auditRes, sitesRes] = await Promise.all([
        supabaseAdmin
          .from('companies')
          .select('id, name, headquarters_country, website, description')
          .eq('id', params.data.id)
          .maybeSingle(),
        supabaseAdmin
          .from('company_audits')
          .select(
            'known_breaches_count, regulatory_fines_count, incidents_timeline, sources, reliability_score, last_researched_at'
          )
          .eq('company_id', params.data.id)
          .maybeSingle(),
        supabaseAdmin
          .from('scanned_sites')
          .select('id, url, domain')
          .eq('company_id', params.data.id)
          .order('domain', { ascending: true })
          .limit(100),
      ])

      if (!companyRes.data) return reply.code(404).send({ error: 'Company not found' })

      return {
        company: companyRes.data,
        audit: auditRes.data,
        sites: sitesRes.data ?? [],
      }
    }
  )
}
