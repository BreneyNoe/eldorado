// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetailsStep } from '@/features/spots/components/create/DetailsStep'
import {
  effectiveAddress,
  emptyDraft,
  validateSpotDraft,
  type SpotDraft,
  type SpotDraftErrors,
} from '@/features/spots/logic/spotDraft'
import { makeSpotType } from '@/test/renderWithProviders'
import type { RatingCategory } from '@/types/models'

afterEach(cleanup)

const types = [
  makeSpotType('nature'),
  makeSpotType('baignade', { color: '#1C7ED6', icon: 'waves' }),
  makeSpotType('ancien', { is_active: false }),
]

function category(typeKey: string, key: string, label: string, sortOrder: number, isActive = true): RatingCategory {
  return {
    id: `cat-${typeKey}-${key}`,
    spot_type_id: `type-${typeKey}`,
    key,
    label,
    sort_order: sortOrder,
    is_active: isActive,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  }
}

const categories = [
  category('nature', 'tranquillite', 'Tranquillité', 30),
  category('nature', 'beaute', 'Beauté', 10),
  category('nature', 'accessibilite', 'Accessibilité', 20),
  category('nature', 'retiree', 'Catégorie retirée', 40, false),
  category('baignade', 'cliffjump', 'Cliffjump', 40),
  category('baignade', 'beaute', 'Beauté', 10),
]

/** Monte l'étape avec un brouillon vivant, comme le fait l'écran de création. */
function Harness({ suggested = 'D 215, Péreyres, Ardèche', onSubmit }: { suggested?: string | null; onSubmit: (draft: SpotDraft, address: string) => void }) {
  const [draft, setDraft] = useState<SpotDraft>(() => ({ ...emptyDraft(), lat: 44.8009, lng: 4.253 }))
  const [errors, setErrors] = useState<SpotDraftErrors>({})
  const addressValue = effectiveAddress(draft, suggested)

  return (
    <DetailsStep
      draft={draft}
      addressValue={addressValue}
      addressPending={false}
      types={types}
      categories={categories}
      errors={errors}
      submitError={null}
      isSubmitting={false}
      onChange={(changes) => setDraft((current) => ({ ...current, ...changes }))}
      onSubmit={() => {
        const validation = validateSpotDraft({ ...draft, address: addressValue })
        setErrors(validation)
        if (Object.keys(validation).length === 0) onSubmit(draft, addressValue)
      }}
      onBack={() => {}}
    />
  )
}

function ratingGroups() {
  const fieldset = screen.getByRole('group', { name: 'Tes notes (facultatif)' })
  return within(fieldset)
    .getAllByRole('group')
    .map((group) => group.getAttribute('aria-label'))
}

describe('DetailsStep', () => {
  it('propose les types actifs seulement, et aucune note avant le choix du type', () => {
    render(<Harness onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: 'Nature' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Baignade' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ancien' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Tes notes (facultatif)' })).toBeNull()
  })

  it('affiche les catégories du type choisi, actives, dans leur ordre', async () => {
    const user = userEvent.setup()
    render(<Harness onSubmit={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Nature' }))
    expect(ratingGroups()).toEqual(['Beauté', 'Accessibilité', 'Tranquillité'])

    await user.click(screen.getByRole('button', { name: 'Baignade' }))
    expect(ratingGroups()).toEqual(['Beauté', 'Cliffjump'])
  })

  it('efface les notes quand le type change', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Nature' }))
    await user.click(within(screen.getByRole('group', { name: 'Beauté' })).getByRole('button', { name: '5 étoiles' }))
    await user.click(screen.getByRole('button', { name: 'Baignade' }))
    expect(within(screen.getByRole('group', { name: 'Beauté' })).getByText('Non noté')).toBeTruthy()
  })

  it('signale un type et un nom manquants sans envoyer', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Créer le spot' }))
    expect(screen.getByText('Choisis un type de spot.')).toBeTruthy()
    expect(screen.getByText('Le nom doit contenir au moins 2 caractères.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envoie le brouillon complet, avec l\'adresse proposée', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Nature' }))
    await user.type(screen.getByLabelText('Nom'), 'Cascade du Ray-Pic')
    await user.click(within(screen.getByRole('group', { name: 'Beauté' })).getByRole('button', { name: '5 étoiles' }))
    await user.click(within(screen.getByRole('group', { name: 'Tranquillité' })).getByRole('button', { name: '3 étoiles' }))
    await user.type(screen.getByLabelText('Description (facultatif)'), 'Dix minutes de marche.')
    await user.click(screen.getByRole('button', { name: 'Créer le spot' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    const [draft, address] = onSubmit.mock.calls[0] as [SpotDraft, string]
    expect(draft).toMatchObject({
      spotTypeId: 'type-nature',
      name: 'Cascade du Ray-Pic',
      description: 'Dix minutes de marche.',
      ratings: { 'cat-nature-beaute': 5, 'cat-nature-tranquillite': 3 },
      addressEdited: false,
    })
    expect(address).toBe('D 215, Péreyres, Ardèche')
  })

  it('retient une adresse corrigée à la main', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Nature' }))
    await user.type(screen.getByLabelText('Nom'), 'Cascade')
    const address = screen.getByLabelText('Adresse (facultatif)')
    expect((address as HTMLInputElement).value).toBe('D 215, Péreyres, Ardèche')
    expect(screen.getByText(/Proposée d.après la position/)).toBeTruthy()

    await user.clear(address)
    await user.type(address, 'Parking du haut')
    expect(screen.getByText('Saisie par toi.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Créer le spot' }))

    const [draft, sentAddress] = onSubmit.mock.calls[0] as [SpotDraft, string]
    expect(draft.addressEdited).toBe(true)
    expect(sentAddress).toBe('Parking du haut')
  })

  it('explique l\'absence d\'adresse proposée', () => {
    render(<Harness suggested={null} onSubmit={() => {}} />)
    expect(screen.getByText('Aucune adresse trouvée pour cette position. Tu peux en saisir une.')).toBeTruthy()
  })

  it('rappelle la position retenue', () => {
    render(<Harness onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: /44\.80090, 4\.25300 · Modifier la position/ })).toBeTruthy()
  })
})
