// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { SpotFilterBar } from '@/features/spots/components/SpotFilterBar'
import { useSpotFilters } from '@/features/spots/hooks/SpotFiltersContext'
import { makeSpotType, readyState, renderWithProviders } from '@/test/renderWithProviders'

afterEach(cleanup)

const types = [
  makeSpotType('nature'),
  makeSpotType('baignade'),
  makeSpotType('urbex'),
  makeSpotType('ancien', { is_active: false }),
]

/** Affiche les filtres en cours, pour vérifier ce que la barre a réellement modifié. */
function FiltersProbe() {
  const { filters } = useSpotFilters()
  return <output>{JSON.stringify(filters)}</output>
}

function renderBar() {
  renderWithProviders(
    <>
      <SpotFilterBar types={types} />
      <FiltersProbe />
    </>,
    { authState: readyState() },
  )
}

function currentFilters() {
  return JSON.parse(screen.getByRole('status').textContent ?? '{}') as { typeIds: string[]; search: string }
}

function isPressed(name: string) {
  return screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'
}

describe('SpotFilterBar', () => {
  it('propose "Tous" et les types actifs seulement', () => {
    renderBar()
    expect(isPressed('Tous')).toBe(true)
    expect(screen.getByRole('button', { name: 'Nature' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ancien' })).toBeNull()
  })

  it('sélectionne un type, puis plusieurs', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('button', { name: 'Nature' }))
    expect(currentFilters().typeIds).toEqual(['type-nature'])
    expect(isPressed('Nature')).toBe(true)
    expect(isPressed('Tous')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Baignade' }))
    expect(currentFilters().typeIds).toEqual(['type-nature', 'type-baignade'])
  })

  it('désélectionne un type en le touchant à nouveau', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('button', { name: 'Nature' }))
    await user.click(screen.getByRole('button', { name: 'Nature' }))
    expect(currentFilters().typeIds).toEqual([])
    expect(isPressed('Tous')).toBe(true)
  })

  it('"Tous" efface la sélection', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('button', { name: 'Urbex' }))
    await user.click(screen.getByRole('button', { name: 'Tous' }))
    expect(currentFilters().typeIds).toEqual([])
  })

  it('revient à "Tous" quand tous les types actifs sont cochés', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('button', { name: 'Nature' }))
    await user.click(screen.getByRole('button', { name: 'Baignade' }))
    await user.click(screen.getByRole('button', { name: 'Urbex' }))
    expect(currentFilters().typeIds).toEqual([])
    expect(isPressed('Tous')).toBe(true)
  })

  it('transmet la recherche et permet de l\'effacer', async () => {
    const user = userEvent.setup()
    renderBar()

    expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).toBeNull()
    await user.type(screen.getByRole('searchbox'), 'cascade')
    expect(currentFilters().search).toBe('cascade')

    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }))
    expect(currentFilters().search).toBe('')
  })
})
