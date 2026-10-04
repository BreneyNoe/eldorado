// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '@/components/ConfirmDialog'

afterEach(cleanup)

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog title="Supprimer cette photo ?" confirmLabel="Supprimer la photo" onConfirm={onConfirm} onCancel={onCancel} {...props}>
      Cette action est définitive.
    </ConfirmDialog>,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('annonce le titre et le message', () => {
    renderDialog()
    expect(screen.getByRole('alertdialog', { name: 'Supprimer cette photo ?' })).toBeTruthy()
    expect(screen.getByText('Cette action est définitive.')).toBeTruthy()
  })

  it('place le curseur sur "Annuler", pas sur l\'action irréversible', () => {
    renderDialog()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Annuler' }))
  })

  it('confirme et annule', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Supprimer la photo' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('la touche Échap annule', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('pendant l\'action : boutons bloqués, Échap sans effet', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog({ busy: true })

    expect((screen.getByRole('button', { name: 'Supprimer la photo' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Annuler' }) as HTMLButtonElement).disabled).toBe(true)
    await user.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('affiche l\'erreur si l\'action a échoué', () => {
    renderDialog({ error: 'Connexion impossible.' })
    expect(screen.getByRole('alert').textContent).toBe('Connexion impossible.')
  })
})
