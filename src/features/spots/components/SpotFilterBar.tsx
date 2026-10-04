import { Search, X } from 'lucide-react'
import { useSpotFilters } from '@/features/spots/hooks/SpotFiltersContext'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import type { SpotType } from '@/types/models'

interface SpotFilterBarProps {
  types: SpotType[]
  /** Appelé quand le champ de recherche prend ou perd le curseur. */
  onSearchFocusChange?: (focused: boolean) => void
  /** Élément placé à droite du champ de recherche (bouton "Mon compte"...). */
  trailing?: React.ReactNode
  /** Ombre portée, pour une barre posée par-dessus la carte. */
  floating?: boolean
}

const SHADOW = 'shadow-[0_2px_8px_rgb(22_35_59/0.28)]'

/**
 * Recherche par nom et filtres par type. La même barre sert sur la carte et
 * dans la liste : elle lit et modifie les filtres partagés.
 */
export function SpotFilterBar({ types, onSearchFocusChange, trailing, floating = false }: SpotFilterBarProps) {
  const { filters, setSearch, toggleType, clearTypes } = useSpotFilters()

  // Seuls les types actifs sont proposés comme filtres.
  const activeTypes = types.filter((type) => type.is_active)
  const availableIds = activeTypes.map((type) => type.id)
  const allSelected = filters.typeIds.length === 0

  const chipBase = `flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-base font-medium ${
    floating ? SHADOW : ''
  }`

  return (
    <div>
      <div className="flex items-center gap-3 px-3">
        <div
          className={`flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-paper pr-1 pl-4 ${
            floating ? SHADOW : 'border border-line'
          }`}
        >
          <Search className="size-5 shrink-0 text-ink-soft" aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => onSearchFocusChange?.(true)}
            onBlur={() => onSearchFocusChange?.(false)}
            placeholder="Rechercher un spot"
            aria-label="Rechercher un spot par son nom"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 appearance-none bg-transparent text-ink outline-none placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.search !== '' && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-mist"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {trailing}
      </div>

      {/* Les filtres défilent horizontalement s'ils ne tiennent pas dans la largeur. */}
      <div
        role="group"
        aria-label="Filtrer par type"
        className="mt-2 flex gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={clearTypes}
          aria-pressed={allSelected}
          className={`${chipBase} ${allSelected ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}
        >
          Tous
        </button>
        {activeTypes.map((type) => {
          const selected = filters.typeIds.includes(type.id)
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => toggleType(type.id, availableIds)}
              aria-pressed={selected}
              className={`${chipBase} ${selected ? 'text-paper' : 'border-line bg-paper text-ink'}`}
              style={selected ? { backgroundColor: type.color, borderColor: type.color } : undefined}
            >
              <SpotIcon name={type.icon} className="size-4.5" style={selected ? undefined : { color: type.color }} />
              {type.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
