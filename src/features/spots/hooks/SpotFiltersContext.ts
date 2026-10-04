import { createContext, useContext } from 'react'
import type { SpotFilters } from '@/features/spots/logic/filters'

export interface SpotFiltersContextValue {
  filters: SpotFilters
  setSearch: (search: string) => void
  /** Coche ou décoche un type. `availableTypeIds` : les types proposés à l'écran. */
  toggleType: (typeId: string, availableTypeIds: string[]) => void
  /** Revient à "tous les types". */
  clearTypes: () => void
}

export const SpotFiltersContext = createContext<SpotFiltersContextValue | null>(null)

/** Filtres en cours, partagés par la carte et la liste. */
export function useSpotFilters(): SpotFiltersContextValue {
  const value = useContext(SpotFiltersContext)
  if (!value) {
    throw new Error("useSpotFilters doit être utilisé à l'intérieur de <SpotFiltersProvider>.")
  }
  return value
}
