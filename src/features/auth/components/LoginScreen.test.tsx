// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { signIn } from '@/features/auth/api/authApi'
import { LoginScreen } from '@/features/auth/components/LoginScreen'
import { AppError } from '@/lib/errors'
import { readyState, renderWithProviders } from '@/test/renderWithProviders'

// Le vrai module parlerait à Supabase : on le remplace entièrement.
vi.mock('@/features/auth/api/authApi', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateDisplayName: vi.fn(),
  changePassword: vi.fn(),
}))

const signInMock = vi.mocked(signIn)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderLogin(authState: Parameters<typeof renderWithProviders>[1]['authState'], state?: unknown) {
  return renderWithProviders(<LoginScreen />, {
    authState,
    path: '/login',
    initialEntry: { pathname: '/login', state },
    routes: (
      <>
        <Route path="/" element={<p>ÉCRAN ACCUEIL</p>} />
        <Route path="/account" element={<p>ÉCRAN COMPTE</p>} />
      </>
    ),
  })
}

describe('LoginScreen', () => {
  it('signale les champs vides sans appeler Supabase', async () => {
    const user = userEvent.setup()
    renderLogin({ status: 'signed_out', byUser: false })

    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(screen.getByText('Saisis ton email.')).toBeTruthy()
    expect(screen.getByText('Saisis ton mot de passe.')).toBeTruthy()
    expect(signInMock).not.toHaveBeenCalled()
  })

  it("envoie l'email nettoyé et le mot de passe tel quel", async () => {
    const user = userEvent.setup()
    signInMock.mockResolvedValue()
    renderLogin({ status: 'signed_out', byUser: false })

    await user.type(screen.getByLabelText('Email'), '  Bob@Example.com ')
    await user.type(screen.getByLabelText('Mot de passe'), ' Mon Secret ')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(signInMock).toHaveBeenCalledWith('bob@example.com', ' Mon Secret ')
  })

  it('affiche le message en français quand les identifiants sont refusés', async () => {
    const user = userEvent.setup()
    signInMock.mockRejectedValue(new AppError('auth', 'Email ou mot de passe incorrect.'))
    renderLogin({ status: 'signed_out', byUser: false })

    await user.type(screen.getByLabelText('Email'), 'bob@example.com')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Email ou mot de passe incorrect.')
  })

  it("efface l'erreur dès qu'on corrige la saisie", async () => {
    const user = userEvent.setup()
    signInMock.mockRejectedValue(new AppError('auth', 'Email ou mot de passe incorrect.'))
    renderLogin({ status: 'signed_out', byUser: false })

    await user.type(screen.getByLabelText('Email'), 'bob@example.com')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    await screen.findByRole('alert')

    await user.type(screen.getByLabelText('Mot de passe'), 'x')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('le bouton œil affiche puis masque le mot de passe', async () => {
    const user = userEvent.setup()
    renderLogin({ status: 'signed_out', byUser: false })
    const field = screen.getByLabelText('Mot de passe') as HTMLInputElement

    expect(field.type).toBe('password')
    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
    expect(field.type).toBe('text')
    await user.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }))
    expect(field.type).toBe('password')
  })

  it("montre un écran d'attente tant que l'état de connexion est inconnu", () => {
    renderLogin({ status: 'loading' })
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByLabelText('Email')).toBeNull()
  })

  it("redirige vers l'accueil si on est déjà connecté", () => {
    renderLogin(readyState())
    expect(screen.getByText('ÉCRAN ACCUEIL')).toBeTruthy()
  })

  it('redirige vers la page demandée avant la connexion', () => {
    renderLogin(readyState(), { from: '/account' })
    expect(screen.getByText('ÉCRAN COMPTE')).toBeTruthy()
  })
})
