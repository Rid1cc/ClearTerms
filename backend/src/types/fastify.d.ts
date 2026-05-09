import { User } from '@supabase/supabase-js'
import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null
  }
}
