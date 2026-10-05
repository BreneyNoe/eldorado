// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RatingsEditor } from '@/features/ratings/components/RatingsEditor'
import type { RatingRow } from '@/features/ratings/logic/ratingRows'

afterEach(cleanup)

const rows: RatingRow[] = [
  { categoryId: 'beaute', label: 'Beauté', group: null, average: 4.5, votes: 2, mine: 4 },
  { categoryId: 'accessibilite', label: 'Accessibilité', group: null, average: 3, votes: 1, mine: null },
  { categoryId: 'tranquillite', label: 'Tranquillité', group: null, average: null, votes: 0, mine: null },
]

function renderEditor(props: Partial<Parameters<typeof RatingsEditor>[0]> = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(<RatingsEditor rows={rows} busy={false} onSave={onSave} onClose={onClose} {...props} />)
  return { onSave, onClose }
}

function star(category: string, name: string) {
  return within(screen.getByRole('group', { name: category })).getByRole('button', { name })
}

function saveButton() {
  return screen.getByRole('button', { name: 'Enregistrer mes notes' }) as HTMLButtonElement
}

describe('RatingsEditor', () => {
  it('part des notes déjà données', () => {
    renderEditor()
    expect(within(screen.getByRole('group', { name: 'Beauté' })).getByText('4 sur 5')).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Tranquillité' })).getByText('Non noté')).toBeTruthy()
  })

  it('ne propose d\'enregistrer que s\'il y a un changement', async () => {
    const user = userEvent.setup()
    renderEditor()
    expect(saveButton().disabled).toBe(true)

    await user.click(star('Tranquillité', '5 étoiles'))
    expect(saveButton().disabled).toBe(false)

    // Revenir à l'état de départ : plus rien à enregistrer.
    await user.click(star('Tranquillité', '5 étoiles'))
    expect(saveButton().disabled).toBe(true)
  })

  it('envoie uniquement les catégories modifiées', async () => {
    const user = userEvent.setup()
    const { onSave } = renderEditor()

    await user.click(star('Beauté', '2 étoiles'))
    await user.click(star('Tranquillité', '5 étoiles'))
    await user.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ beaute: 2, tranquillite: 5 })
  })

  it('envoie null pour une note retirée', async () => {
    const user = userEvent.setup()
    const { onSave } = renderEditor()

    await user.click(star('Beauté', '4 étoiles'))
    await user.click(saveButton())

    expect(onSave).toHaveBeenCalledWith({ beaute: null })
  })

  it('annule sans rien envoyer', async () => {
    const user = userEvent.setup()
    const { onSave, onClose } = renderEditor()

    await user.click(star('Beauté', '1 étoile'))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('affiche l\'erreur d\'enregistrement et garde la saisie', () => {
    renderEditor({ error: 'Connexion impossible.' })
    expect(screen.getByRole('alert').textContent).toBe('Connexion impossible.')
  })

  it('bloque la saisie pendant l\'enregistrement', () => {
    renderEditor({ busy: true })
    expect((star('Beauté', '1 étoile') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Annuler' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
