/**
 * Copie des données sur l'appareil, pour la consultation hors ligne.
 *
 * Le cache de données (TanStack Query) est enregistré dans IndexedDB, la
 * base de données du navigateur. À l'ouverture suivante, même sans réseau,
 * les spots et les fiches déjà consultés sont de nouveau disponibles.
 */
import type { Query, QueryKey } from '@tanstack/react-query'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'

const STORAGE_KEY = 'spots.query-cache'

/**
 * À changer quand la forme des données mémorisées change de façon
 * incompatible : les copies enregistrées par une version précédente de
 * l'application sont alors ignorées.
 */
export const CACHE_VERSION = '1'

export const queryPersister: Persister = {
  // IndexedDB peut être indisponible (navigation privée) : l'application
  // fonctionne alors normalement, simplement sans mémoire hors ligne.
  persistClient: async (client: PersistedClient) => {
    try {
      await set(STORAGE_KEY, client)
    } catch {
      // Volontairement ignoré.
    }
  },
  restoreClient: async () => {
    try {
      return await get<PersistedClient>(STORAGE_KEY)
    } catch {
      return undefined
    }
  },
  removeClient: async () => {
    try {
      await del(STORAGE_KEY)
    } catch {
      // Volontairement ignoré.
    }
  },
}

/**
 * Ce qui mérite d'être gardé hors ligne : le profil, les types, les spots,
 * les fiches consultées (photos, notes, journal). Fonction pure.
 *
 * Sont exclus : l'administration (toujours à jour ou rien), les recherches
 * d'adresse et de spots proches (propres à une création en cours).
 */
export function shouldPersistKey(queryKey: QueryKey): boolean {
  const [scope, detail] = queryKey
  if (scope === 'admin' || scope === 'geocode' || scope === 'backend-diagnosis') return false
  if (scope === 'spots' && detail === 'nearby') return false
  return true
}

/** Seules les lectures réussies sont enregistrées : jamais une erreur ni un chargement en cours. */
export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && shouldPersistKey(query.queryKey)
}
