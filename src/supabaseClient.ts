import { createClient } from '@supabase/supabase-js'

// Las credenciales viven en el .env (raiz del proyecto), nunca hardcodeadas.
// Vite solo expone al frontend las variables con prefijo VITE_.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
      'Revisa el archivo .env en la raiz del proyecto.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
