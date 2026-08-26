/**
 * Cliente de Supabase.
 * Las credenciales se leen de variables de entorno (app.config.ts / .env).
 * En el MVP se declaran aquí como constantes temporales hasta integrar
 * el fichero .env y expo-constants.
 *
 * ⚠️ NO subas SUPABASE_ANON_KEY a un repositorio público.
 */
import { createClient } from '@supabase/supabase-js';

// TODO: mover a variables de entorno vía expo-constants / app.config.ts
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON no definidas. ' +
    'Crea un fichero .env en la raíz del proyecto con esos valores.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    // Persistencia de sesión gestionada por expo-secure-store (se conecta en la fase de Auth)
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
