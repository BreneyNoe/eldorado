// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpotList } from '@/features/spots/components/SpotList'
import { makeSpotLight, makeSpotType } from '@/test/renderWithProviders'

afterEach(cleanup)

const nature = makeSpotType('nature')
const typesById = new Map([[nature.id, nature]])

function manySpots(count: number) {
  return Array.from({ length: count }, (_, index) => makeSpotLight(`s${index}`, { name: `Spot numéro ${index}` }))
}

describe('SpotList', () => {
  it('affiche le message prévu quand la liste est vide', () => {
    render(<SpotList spots={[]} typesById={typesById} onSelect={() => {}} emptyMessage="Rien ici." />)
    expect(screen.getByText('Rien ici.')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('affiche nom, type, adresse et distance', () => {
    const spot = makeSpotLight('a', { name: 'Cascade', address: 'Péreyres, Ardèche' })
    render(
      <SpotList
        spots={[spot]}
        typesById={typesById}
        onSelect={() => {}}
        distanceLabelOf={() => '1,2 km'}
        emptyMessage=""
      />,
    )
    expect(screen.getByText('Cascade')).toBeTruthy()
    expect(screen.getByText('Nature')).toBeTruthy()
    expect(screen.getByText('Péreyres, Ardèche')).toBeTruthy()
    expect(screen.getByText(/1,2 km/)).toBeTruthy()
  })

  it('signale un type introuvable sans planter', () => {
    render(
      <SpotList
        spots={[makeSpotLight('a', { spot_type_id: 'type-supprime' })]}
        typesById={typesById}
        onSelect={() => {}}
        emptyMessage=""
      />,
    )
    expect(screen.getByText('Type inconnu')).toBeTruthy()
  })

  it('transmet le spot choisi', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const spots = manySpots(3)
    render(<SpotList spots={spots} typesById={typesById} onSelect={onSelect} emptyMessage="" />)

    await user.click(screen.getByText('Spot numéro 1'))
    expect(onSelect).toHaveBeenCalledWith(spots[1])
  })

  it('n\'affiche que 30 lignes, puis en ajoute à la demande', async () => {
    const user = userEvent.setup()
    render(<SpotList spots={manySpots(65)} typesById={typesById} onSelect={() => {}} emptyMessage="" />)

    expect(screen.getAllByRole('listitem')).toHaveLength(30)
    await user.click(screen.getByRole('button', { name: 'Afficher 30 de plus (35 restants)' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(60)
    await user.click(screen.getByRole('button', { name: 'Afficher 5 de plus (5 restants)' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(65)
    expect(screen.queryByRole('button', { name: /Afficher/ })).toBeNull()
  })

  it('ne propose pas "Afficher plus" pour une liste courte', () => {
    render(<SpotList spots={manySpots(30)} typesById={typesById} onSelect={() => {}} emptyMessage="" />)
    expect(screen.queryByRole('button', { name: /Afficher/ })).toBeNull()
  })
})
