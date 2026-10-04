import { useMemo, useState, type ReactNode } from 'react'
import { SpotFiltersContext, type SpotFiltersContextValue } from '@/features/spots/hooks/SpotFiltersContext'
import { EMPTY_FILTERS, toggleType, type SpotFilters } from '@/features/spots/logic/filters'

/**
 * Garde les filtres en mémoire tant que l'application est ouverte : passer
 * de la carte à la liste (ou l'inverse) conserve la recherche et les types.
 */
export function SpotFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<SpotFilters>(EMPTY_FILTERS)

  const value = useMemo<SpotFiltersContextValue>(
    () => ({
      filters,
      setSearch: (search) => setFilters((current) => ({ ...current, search })),
      toggleType: (typeId, availableTypeIds) =>
        setFilters((current) => ({
          ...current,
          typeIds: toggleType(current.typeIds, typeId, availableTypeIds),
        })),
      clearTypes: () => setFilters((current) => ({ ...current, typeIds: [] })),
    }),
    [filters],
  )

  return <SpotFiltersContext.Provider value={value}>{children}</SpotFiltersContext.Provider>
}
