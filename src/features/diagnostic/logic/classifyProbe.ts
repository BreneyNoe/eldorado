/**
 * Interprète la réponse de Supabase à une lecture de test.
 * Fonction pure : aucune dépendance, facile à tester.
 */

/** Ce que la couche api/ a observé, sans interprétation. */
export interface BackendProbe {
  /** La requête n'a reçu aucune réponse (pas de réseau, adresse fausse...). */
  networkFailed: boolean
  /** Statut HTTP de la réponse (0 si aucune). */
  status: number
  /** Code d'erreur renvoyé par Supabase / PostgreSQL, s'il y en a un. */
  code: string | null
  message: string | null
  /** Nombre de lignes lues, si la lecture a réussi. */
  rowCount: number | null
  /** Un utilisateur est-il connecté sur cet appareil ? */
  hasSession: boolean
}

export type BackendState =
  | 'unreachable' // aucune réponse
  | 'invalid_key' // Supabase répond mais refuse la clé
  | 'invalid_url' // l'adresse contient un chemin en trop
  | 'schema_missing' // les tables n'existent pas : migrations non installées
  | 'locked' // accès refusé sans connexion : c'est l'état attendu
  | 'open_to_anonymous' // lecture possible sans connexion : problème de sécurité
  | 'ready' // connecté, lecture possible
  | 'unexpected'

export interface BackendDiagnosis {
  state: BackendState
  ok: boolean
  title: string
  detail: string
}

export function classifyProbe(probe: BackendProbe): BackendDiagnosis {
  const message = probe.message ?? ''

  if (probe.networkFailed) {
    return {
      state: 'unreachable',
      ok: false,
      title: 'Supabase ne répond pas',
      detail:
        "Vérifie ta connexion Internet, l'adresse VITE_SUPABASE_URL, et que le projet n'est pas en pause dans le tableau de bord Supabase.",
    }
  }

  if (/invalid api key|no api key|unregistered api key/i.test(message)) {
    return {
      state: 'invalid_key',
      ok: false,
      title: 'Clé refusée par Supabase',
      detail:
        'Recopie la clé "publishable" (sb_publishable_...) depuis Supabase dans VITE_SUPABASE_PUBLISHABLE_KEY, puis relance npm run dev.',
    }
  }

  if (probe.code === 'PGRST125') {
    return {
      state: 'invalid_url',
      ok: false,
      title: 'Adresse Supabase incorrecte',
      detail:
        'VITE_SUPABASE_URL doit contenir uniquement https://<projet>.supabase.co, sans rien après ".co" (pas de /rest/v1/).',
    }
  }

  if (probe.code === 'PGRST205' || probe.code === '42P01') {
    return {
      state: 'schema_missing',
      ok: false,
      title: 'Tables introuvables',
      detail:
        "Supabase répond, mais la base n'est pas installée sur ce projet. Exécute supabase/install_all.sql, ou vérifie que l'adresse est bien celle du bon projet.",
    }
  }

  if (probe.code === '42501' || ((probe.status === 401 || probe.status === 403) && !probe.hasSession)) {
    return {
      state: 'locked',
      ok: true,
      title: 'Supabase répond, accès refusé sans connexion',
      detail:
        "C'est le comportement attendu : la base est joignable et ne laisse rien lire tant qu'on n'est pas connecté.",
    }
  }

  if (probe.rowCount !== null && !probe.hasSession) {
    return {
      state: 'open_to_anonymous',
      ok: false,
      title: 'La base se laisse lire sans connexion',
      detail:
        'Les règles de sécurité ne sont pas en place. Exécute supabase/admin/verify_install.sql dans Supabase et corrige avant de continuer.',
    }
  }

  if (probe.rowCount !== null && probe.hasSession) {
    return {
      state: 'ready',
      ok: true,
      title: 'Supabase répond, session active',
      detail: 'La base est joignable et tes droits de lecture fonctionnent.',
    }
  }

  return {
    state: 'unexpected',
    ok: false,
    title: 'Réponse inattendue de Supabase',
    detail: `Statut ${probe.status}${probe.code ? `, code ${probe.code}` : ''}${message ? ` : ${message}` : ''}`,
  }
}
