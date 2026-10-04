// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { signOut } from '@/features/auth/api/authApi'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { AppError } from '@/lib/errors'
import type { AuthState } from '@/features/auth/logic/authState'
import { readyState, renderWithProviders, TEST_SESSION } from '@/test/renderWithProviders'

vi.mock('@/features/auth/api/authApi', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateDisplayName: vi.fn(),
  changePassword: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return <p>ÉCRAN CONNEXION depuis {from}</p>
}

/** Monte une page protégée sur /account et tente d'y accéder. */
function renderProtected(
  authState: AuthState,
  reloadProfile?: () => void,
  markSigningOut?: (signingOut: boolean) => void,
) {
  return renderWithProviders(<p>inutilisé</p>, {
    authState,
    reloadProfile,
    markSigningOut,
    path: '/inutilise',
    initialEntry: '/account',
    routes: (
      <>
        <Route element={<RequireAuth />}>
          <Route path="/account" element={<p>CONTENU PROTÉGÉ</p>} />
        </Route>
        <Route path="/login" element={<LoginProbe />} />
      </>
    ),
  })
}

describe('RequireAuth', () => {
  it('laisse passer un membre connecté et actif', () => {
    renderProtected(readyState())
    expect(screen.getByText('CONTENU PROTÉGÉ')).toBeTruthy()
  })

  it('renvoie vers la connexion en retenant la page demandée', () => {
    renderProtected({ status: 'signed_out', byUser: false })
    expect(screen.getByText('ÉCRAN CONNEXION depuis /account')).toBeTruthy()
    expect(screen.queryByText('CONTENU PROTÉGÉ')).toBeNull()
  })

  it('après une déconnexion volontaire, ne retient pas la page quittée', () => {
    renderProtected({ status: 'signed_out', byUser: true })
    expect(screen.getByText('ÉCRAN CONNEXION depuis')).toBeTruthy()
  })

  it("affiche un écran d'attente pendant le chargement", () => {
    renderProtected({ status: 'loading' })
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByText('CONTENU PROTÉGÉ')).toBeNull()
  })

  it('bloque un compte désactivé et lui permet de se déconnecter', async () => {
    const user = userEvent.setup()
    const markSigningOut = vi.fn()
    vi.mocked(signOut).mockResolvedValue()
    renderProtected({ status: 'blocked', session: TEST_SESSION, reason: 'disabled' }, undefined, markSigningOut)

    expect(screen.getByRole('heading', { name: 'Accès retiré' })).toBeTruthy()
    expect(screen.queryByText('CONTENU PROTÉGÉ')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(markSigningOut).toHaveBeenCalledWith(true)
  })

  it('bloque un compte sans profil', () => {
    renderProtected({ status: 'blocked', session: TEST_SESSION, reason: 'no_profile' })
    expect(screen.getByRole('heading', { name: 'Compte incomplet' })).toBeTruthy()
  })

  it('propose de réessayer quand le profil est illisible', async () => {
    const user = userEvent.setup()
    const reloadProfile = vi.fn()
    renderProtected(
      {
        status: 'profile_error',
        session: TEST_SESSION,
        error: new AppError('network', 'Connexion impossible. Vérifie ton réseau puis réessaie.'),
      },
      reloadProfile,
    )

    expect(screen.getByText('Connexion impossible. Vérifie ton réseau puis réessaie.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reloadProfile).toHaveBeenCalledOnce()
  })
})
