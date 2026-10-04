// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { changePassword, signOut, updateDisplayName } from '@/features/auth/api/authApi'
import { AccountScreen } from '@/features/auth/components/AccountScreen'
import { AppError } from '@/lib/errors'
import { makeProfile, readyState, renderWithProviders, TEST_SESSION } from '@/test/renderWithProviders'

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

function renderAccount(role: 'user' | 'admin' = 'user') {
  return renderWithProviders(<AccountScreen />, { authState: readyState({ role }), path: '/account' })
}

async function fillPasswords(user: ReturnType<typeof userEvent.setup>, current: string, next: string, again: string) {
  await user.type(screen.getByLabelText('Mot de passe actuel'), current)
  await user.type(screen.getByLabelText('Nouveau mot de passe'), next)
  await user.type(screen.getByLabelText('Nouveau mot de passe, à nouveau'), again)
}

describe('AccountScreen', () => {
  it("affiche l'email et le rôle", () => {
    renderAccount()
    expect(screen.getByText(TEST_SESSION.email)).toBeTruthy()
    expect(screen.getByText('Membre')).toBeTruthy()
    expect(screen.queryByText("État de l'installation")).toBeNull()
  })

  it("montre le lien de diagnostic aux administrateurs seulement", () => {
    renderAccount('admin')
    expect(screen.getByText('Administrateur')).toBeTruthy()
    expect(screen.getByRole('link', { name: "État de l'installation" })).toBeTruthy()
  })

  it('enregistre un nouveau nom et le confirme', async () => {
    const user = userEvent.setup()
    vi.mocked(updateDisplayName).mockResolvedValue(makeProfile({ display_name: 'Robert' }))
    renderAccount()

    const field = screen.getByLabelText('Nom affiché')
    await user.clear(field)
    await user.type(field, 'Robert')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le nom' }))

    expect(updateDisplayName).toHaveBeenCalledWith(TEST_SESSION.userId, 'Robert')
    expect((await screen.findByRole('status')).textContent).toBe('Nom enregistré.')
  })

  it('refuse un nom trop court sans appeler la base', async () => {
    const user = userEvent.setup()
    renderAccount()

    const field = screen.getByLabelText('Nom affiché')
    await user.clear(field)
    await user.type(field, 'R')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le nom' }))

    expect(screen.getByText('Le nom doit contenir au moins 2 caractères.')).toBeTruthy()
    expect(updateDisplayName).not.toHaveBeenCalled()
  })

  it('désactive le bouton tant que le nom est inchangé', () => {
    renderAccount()
    expect((screen.getByRole('button', { name: 'Enregistrer le nom' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('change le mot de passe, confirme et vide les champs', async () => {
    const user = userEvent.setup()
    vi.mocked(changePassword).mockResolvedValue()
    renderAccount()

    await fillPasswords(user, 'ancien-mdp', 'nouveau-mdp', 'nouveau-mdp')
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))

    expect(changePassword).toHaveBeenCalledWith(TEST_SESSION.email, 'ancien-mdp', 'nouveau-mdp')
    expect((await screen.findByRole('status')).textContent).toBe('Mot de passe changé.')
    expect((screen.getByLabelText('Mot de passe actuel') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Nouveau mot de passe') as HTMLInputElement).value).toBe('')
  })

  it('refuse deux saisies différentes sans appeler Supabase', async () => {
    const user = userEvent.setup()
    renderAccount()

    await fillPasswords(user, 'ancien-mdp', 'nouveau-mdp', 'nouveau-mdq')
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))

    expect(screen.getByText('Les deux saisies ne sont pas identiques.')).toBeTruthy()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('signale un mot de passe actuel incorrect et conserve la saisie', async () => {
    const user = userEvent.setup()
    vi.mocked(changePassword).mockRejectedValue(
      new AppError('validation', 'Le mot de passe actuel est incorrect.'),
    )
    renderAccount()

    await fillPasswords(user, 'mauvais-mdp', 'nouveau-mdp', 'nouveau-mdp')
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Le mot de passe actuel est incorrect.')
    expect((screen.getByLabelText('Nouveau mot de passe') as HTMLInputElement).value).toBe('nouveau-mdp')
  })

  it('déconnecte', async () => {
    const user = userEvent.setup()
    vi.mocked(signOut).mockResolvedValue()
    renderAccount()

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(signOut).toHaveBeenCalledOnce()
  })
})
