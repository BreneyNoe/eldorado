import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router/dom'
import { router } from '@/app/router'
import { UpdatePrompt } from '@/app/UpdatePrompt'
import { OfflineBanner } from '@/components/OfflineBanner'
import { RankCelebration } from '@/features/auth/components/RankCelebration'
import { AuthProvider } from '@/features/auth/hooks/AuthProvider'
import { SpotFiltersProvider } from '@/features/spots/hooks/SpotFiltersProvider'
import { OFFLINE_MAX_AGE_MS, queryClient } from '@/lib/queryClient'
import { CACHE_VERSION, queryPersister, shouldPersistQuery } from '@/lib/queryPersister'

/**
 * Racine de l'application : cache de données (avec sa copie sur l'appareil
 * pour l'usage hors ligne), authentification, filtres partagés, puis les routes.
 */
export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: OFFLINE_MAX_AGE_MS,
        buster: CACHE_VERSION,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      <AuthProvider>
        <SpotFiltersProvider>
          {/* Le bandeau "hors ligne" prend sa place en haut ; l'écran occupe le reste. */}
          <div className="flex h-full flex-col">
            <OfflineBanner />
            <div className="relative min-h-0 flex-1">
              <RouterProvider router={router} />
            </div>
          </div>
          <RankCelebration />
          <UpdatePrompt />
        </SpotFiltersProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}
