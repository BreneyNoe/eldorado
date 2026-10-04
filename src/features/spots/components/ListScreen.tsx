import { useMemo, useState } from 'react'
import { Map as MapIcon, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Notice } from '@/components/Notice'
import { RoundLink } from '@/components/RoundButton'
import { SpotFilterBar } from '@/features/spots/components/SpotFilterBar'
import { SpotList } from '@/features/spots/components/SpotList'
import { useSpotFilters } from '@/features/spots/hooks/SpotFiltersContext'
import { useFilteredSpots } from '@/features/spots/hooks/useFilteredSpots'
import { hasActiveFilters } from '@/features/spots/logic/filters'
import { sortSpots, type SpotSortMode } from '@/features/spots/logic/geo'
import type { SpotLight } from '@/types/models'

const SORT_OPTIONS: { mode: SpotSortMode; label: string }[] = [
  { mode: 'recent', label: 'Récents' },
  { mode: 'name', label: 'A → Z' },
]

/**
 * Liste plein écran de tous les spots. Elle partage ses filtres avec la
 * carte : passer de l'une à l'autre conserve la recherche et les types.
 */
export function ListScreen() {
  const navigate = useNavigate()
  const { filters } = useSpotFilters()
  const { spots, totalCount, types, typesById, subtypesById, isPending, isWaitingForNetwork, error, refetch } =
    useFilteredSpots()
  const [sortMode, setSortMode] = useState<SpotSortMode>('recent')

  const sorted = useMemo(() => sortSpots(spots, sortMode), [spots, sortMode])

  // Un spot choisi s'ouvre sur la carte, centrée dessus ; "Retour" ramène à la liste.
  const handleSelect = (spot: SpotLight) => void navigate(`/?spot=${encodeURIComponent(spot.id)}`)

  let countLabel: string
  if (isWaitingForNetwork) countLabel = 'Hors ligne'
  else if (isPending) countLabel = 'Chargement des spots…'
  else if (hasActiveFilters(filters)) countLabel = `${spots.length} sur ${totalCount}`
  else countLabel = `${totalCount} ${totalCount > 1 ? 'spots' : 'spot'}`

  let emptyMessage: string
  if (totalCount === 0) emptyMessage = "Aucun spot n'a encore été ajouté."
  else emptyMessage = 'Aucun spot ne correspond à la recherche et aux filtres.'

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* Deux niveaux : la marge de sécurité de l'iPhone sur l'élément extérieur,
          l'espacement habituel à l'intérieur (les deux règlent la même propriété CSS). */}
      <header className="safe-top safe-x shrink-0 border-b border-line">
        <div className="pt-3">
          <SpotFilterBar
            types={types}
            trailing={
              <RoundLink to="/account" label="Mon compte">
                <UserRound className="size-6" aria-hidden="true" />
              </RoundLink>
            }
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <h1 className="text-lg font-semibold" aria-live="polite">
              {countLabel}
            </h1>
            <div role="group" aria-label="Trier la liste" className="flex rounded-full bg-mist p-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setSortMode(option.mode)}
                  aria-pressed={sortMode === option.mode}
                  className={`h-9 rounded-full px-4 text-base font-medium ${
                    sortMode === option.mode ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="safe-x min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error ? (
          <div className="space-y-3 p-4">
            <Notice tone="error">{error.message}</Notice>
            <button
              type="button"
              onClick={refetch}
              className="h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
            >
              Réessayer
            </button>
          </div>
        ) : (
          !isPending && (
            <SpotList
              // Nouveau tri ou nouveaux filtres : la pagination repart du début.
              key={`${sortMode}|${filters.search}|${filters.typeIds.join(',')}`}
              spots={sorted}
              typesById={typesById}
              subtypesById={subtypesById}
              onSelect={handleSelect}
              emptyMessage={emptyMessage}
            />
          )
        )}
        {/* Espace pour que le bouton flottant ne masque pas la dernière ligne. */}
        <div className="safe-bottom" aria-hidden="true">
          <div className="h-24" />
        </div>
      </main>

      <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0">
        <div className="flex justify-center pb-5">
          <Link
            to="/"
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-blaze px-6 text-lg font-semibold text-ink shadow-[0_2px_8px_rgb(22_35_59/0.28)] active:bg-blaze-deep"
          >
            <MapIcon className="size-5" aria-hidden="true" />
            Carte
          </Link>
        </div>
      </div>
    </div>
  )
}
