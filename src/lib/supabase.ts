/**
 * Client Supabase unique de l'application.
 *
 * Règle d'architecture : seuls les fichiers des dossiers "api/" importent ce
 * client. Les composants et les hooks ne parlent jamais à Supabase directement.
 */
import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/config/env'
import type { Database } from '@/types/database'

const env = getEnv()

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    // La session est conservée sur l'appareil : on reste connecté entre deux ouvertures.
    persistSession: true,
    autoRefreshToken: true,
    // Aucun lien de connexion par email dans ce projet (voir décisions du MVP),
    // et le routage utilise le "#" de l'URL : on ne laisse pas Supabase le lire.
    detectSessionInUrl: false,
  },
})
