import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

// All our tables live in their own schema, "cstore", so nothing here touches your "public" tables.
export const SCHEMA = 'cstore'

// The one and only backend: Supabase
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  db: { schema: SCHEMA },
})

// Plain-words message when the one-time Supabase setup is not finished (or null if it is something else)
export function setupProblem(error) {
  const code = error?.code
  const message = error?.message || ''
  if (code === 'PGRST106' || /invalid schema|schema must be one of/i.test(message)) {
    return `Last setup step: in Supabase open Project Settings → API → "Exposed schemas", add  ${SCHEMA}  and save.`
  }
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01' || code === '42883' || code === '3F000' ||
      /could not find the (table|function)|schema cache|does not exist/i.test(message)) {
    return 'The store tables are not set up in Supabase yet. Run supabase/setup.sql first.'
  }
  return null
}
