/**
 * Réglages communs du cache de données (TanStack Query).
 */
import { onlineManager, QueryClient } from '@tanstack/react-query'

// Par défaut, le cache de données se croit en ligne tant qu'il n'a pas vu la
// connexion tomber. Une application ouverte sans réseau lancerait donc des
// lectures vouées à l'échec. On lui donne l'état réel dès le départ ; il suit
// ensuite les changements tout seul.
if (typeof navigator !== 'undefined') onlineManager.setOnline(navigator.onLine)

/** Durée pendant laquelle une donnée reste consultable hors ligne après son dernier chargement. */
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Une donnée qui n'est plus affichée est gardée en mémoire aussi longtemps
      // qu'elle peut servir hors ligne ; sinon elle disparaîtrait de la copie
      // enregistrée sur l'appareil au bout de quelques minutes.
      gcTime: OFFLINE_MAX_AGE_MS,
      // Une donnée chargée est considérée fraîche pendant 1 minute.
      staleTime: 60_000,
      // Pas de second niveau de réessai : supabase-js réessaie déjà lui-même les
      // lectures qui échouent pour cause de réseau (3 tentatives, environ 7 s
      // au total). Réessayer en plus ici ferait attendre l'erreur plus de 20 s.
      retry: false,
      // Retour au premier plan de l'app : on rafraîchit ce qui est périmé.
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Une écriture n'est jamais rejouée automatiquement (risque de doublon) :
      // c'est l'utilisateur qui appuie sur "Réessayer".
      retry: false,
      // Hors ligne, une écriture échoue tout de suite avec un message clair. Par
      // défaut elle serait mise en attente et partirait au retour du réseau,
      // parfois bien plus tard, sans que l'utilisateur s'y attende.
      networkMode: 'always',
    },
  },
})
