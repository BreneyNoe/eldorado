/**
 * Outils communs aux tests de composants : rend un écran avec le cache de
 * données, un état d'authentification choisi et un routeur en mémoire.
 */
import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthContext } from '@/features/auth/hooks/AuthContext'
import type { AuthState } from '@/features/auth/logic/authState'
import { SpotFiltersProvider } from '@/features/spots/hooks/SpotFiltersProvider'
import type { Profile, SpotLight, SpotType } from '@/types/models'

export const TEST_SESSION = { userId: 'user-1', email: 'bob@example.com' }

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: TEST_SESSION.userId,
    display_name: 'Bob',
    role: 'user',
    is_active: true,
    avatar_path: null,
    avatar_icon: null,
    avatar_color: null,
    spot_count: 0,
    rank_seen: 0,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    ...overrides,
  }
}

export function readyState(overrides: Partial<Profile> = {}): AuthState {
  const profile = makeProfile(overrides)
  return { status: 'ready', session: TEST_SESSION, profile, isAdmin: profile.role === 'admin' }
}

interface RenderOptions {
  authState: AuthState
  /** Adresse de départ, avec un éventuel "state" de navigation. */
  initialEntry?: string | { pathname: string; state?: unknown }
  /** Routes supplémentaires, pour vérifier les redirections. */
  routes?: ReactElement
  /** Chemin sous lequel l'élément testé est monté. */
  path?: string
  reloadProfile?: () => void
  markSigningOut?: (signingOut: boolean) => void
}

export function renderWithProviders(element: ReactElement, options: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const path = options.path ?? '/'

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          state: options.authState,
          reloadProfile: options.reloadProfile ?? (() => {}),
          markSigningOut: options.markSigningOut ?? (() => {}),
        }}
      >
        <SpotFiltersProvider>
          <MemoryRouter initialEntries={[options.initialEntry ?? path]}>
            <Routes>
              <Route path={path} element={element} />
              {options.routes}
            </Routes>
          </MemoryRouter>
        </SpotFiltersProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

export function makeSpotType(key: string, overrides: Partial<SpotType> = {}): SpotType {
  return {
    id: `type-${key}`,
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    color: '#2F9E44',
    icon: 'trees',
    sort_order: 0,
    is_active: true,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    ...overrides,
  }
}

export function makeSpotLight(id: string, overrides: Partial<SpotLight> = {}): SpotLight {
  return {
    id,
    spot_type_id: 'type-nature',
    name: `Spot ${id}`,
    lat: 44.8,
    lng: 4.25,
    address: null,
    created_by: null,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    cover_thumb_path: null,
    subtype_id: null,
    extra_type_ids: [],
    ...overrides,
  }
}
