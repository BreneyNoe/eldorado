// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSpotsLight, fetchSpotTypes } from '@/features/spots/api/spotsApi'
import { ListScreen } from '@/features/spots/components/ListScreen'
import { AppError } from '@/lib/errors'
import { makeSpotLight, makeSpotType, readyState, renderWithProviders } from '@/test/renderWithProviders'

// Le vrai module parlerait à Supabase : on le remplace entièrement.
vi.mock('@/features/spots/api/spotsApi', () => ({
  fetchSpotsLight: vi.fn(),
  fetchSpotTypes: vi.fn(),
  fetchSpotSubtypes: vi.fn().mockResolvedValue([]),
}))

const types = [makeSpotType('nature'), makeSpotType('baignade', { color: '#1C7ED6', icon: 'waves' })]
const spots = [
  makeSpotLight('1', { name: 'Étang bleu', created_at: '2026-09-01T10:00:00Z' }),
  makeSpotLight('2', { name: 'Cascade du Ray-Pic', created_at: '2026-10-02T10:00:00Z' }),
  makeSpotLight('3', { name: 'Pont du Diable', spot_type_id: 'type-baignade', created_at: '2026-10-04T10:00:00Z' }),
  makeSpotLight('4', { name: 'Cascade de la Beaume', spot_type_id: 'type-baignade', created_at: '2026-10-03T10:00:00Z' }),
]

beforeEach(() => {
  vi.mocked(fetchSpotTypes).mockResolvedValue(types)
  vi.mocked(fetchSpotsLight).mockResolvedValue(spots)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function MapProbe() {
  const location = useLocation()
  return <p>ÉCRAN CARTE {location.search}</p>
}

function renderList() {
  return renderWithProviders(<ListScreen />, {
    authState: readyState(),
    path: '/list',
    routes: <Route path="/" element={<MapProbe />} />,
  })
}

function listedNames() {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('span span')?.textContent)
}

describe('ListScreen', () => {
  it('affiche tous les spots, du plus récent au plus ancien', async () => {
    renderList()
    expect(await screen.findByRole('heading', { name: '4 spots' })).toBeTruthy()
    expect(listedNames()).toEqual(['Pont du Diable', 'Cascade de la Beaume', 'Cascade du Ray-Pic', 'Étang bleu'])
  })

  it('trie par nom à la demande', async () => {
    const user = userEvent.setup()
    renderList()
    await screen.findByRole('heading', { name: '4 spots' })

    await user.click(screen.getByRole('button', { name: 'A → Z' }))
    expect(listedNames()).toEqual(['Cascade de la Beaume', 'Cascade du Ray-Pic', 'Étang bleu', 'Pont du Diable'])
  })

  it('filtre par type et indique le décompte', async () => {
    const user = userEvent.setup()
    renderList()
    await screen.findByRole('heading', { name: '4 spots' })

    await user.click(screen.getByRole('button', { name: 'Baignade' }))
    expect(screen.getByRole('heading', { name: '2 sur 4' })).toBeTruthy()
    expect(listedNames()).toEqual(['Pont du Diable', 'Cascade de la Beaume'])
  })

  it('cherche par nom sans tenir compte des accents', async () => {
    const user = userEvent.setup()
    renderList()
    await screen.findByRole('heading', { name: '4 spots' })

    await user.type(screen.getByRole('searchbox'), 'etang')
    expect(listedNames()).toEqual(['Étang bleu'])
  })

  it('combine recherche et type, et explique une liste vide', async () => {
    const user = userEvent.setup()
    renderList()
    await screen.findByRole('heading', { name: '4 spots' })

    await user.type(screen.getByRole('searchbox'), 'cascade')
    await user.click(screen.getByRole('button', { name: 'Baignade' }))
    expect(listedNames()).toEqual(['Cascade de la Beaume'])

    await user.type(screen.getByRole('searchbox'), ' introuvable')
    expect(screen.getByText('Aucun spot ne correspond à la recherche et aux filtres.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '0 sur 4' })).toBeTruthy()
  })

  it('ouvre le spot choisi sur la carte', async () => {
    const user = userEvent.setup()
    renderList()
    await screen.findByRole('heading', { name: '4 spots' })

    await user.click(screen.getByText('Pont du Diable'))
    expect(screen.getByText('ÉCRAN CARTE ?spot=3')).toBeTruthy()
  })

  it('le bouton "Carte" ramène à la carte', async () => {
    const user = userEvent.setup()
    renderList()
    await screen.findByRole('heading', { name: '4 spots' })

    await user.click(screen.getByRole('link', { name: 'Carte' }))
    expect(screen.getByText(/ÉCRAN CARTE/)).toBeTruthy()
  })

  it('affiche l\'erreur et permet de réessayer', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSpotsLight).mockRejectedValueOnce(new AppError('network', 'Connexion impossible.'))
    renderList()

    expect((await screen.findByRole('alert')).textContent).toBe('Connexion impossible.')
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('heading', { name: '4 spots' })).toBeTruthy()
  })

  it('signale une application encore vide', async () => {
    vi.mocked(fetchSpotsLight).mockResolvedValue([])
    renderList()
    expect(await screen.findByText("Aucun spot n'a encore été ajouté.")).toBeTruthy()
  })
})
