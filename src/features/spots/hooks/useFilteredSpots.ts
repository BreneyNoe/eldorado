import { useMemo } from 'react'
import { useSpotFilters } from '@/features/spots/hooks/SpotFiltersContext'
import { useSpotsLight, useSpotSubtypes, useSpotTypes } from '@/features/spots/hooks/useSpotQueries'
import { applyFilters } from '@/features/spots/logic/filters'
import type { SpotLight, SpotSubtype, SpotType } from '@/types/models'

const NO_SPOTS: SpotLight[] = []
const NO_TYPES: SpotType[] = []
const NO_SUBTYPES: SpotSubtype[] = []

/**
 * Les spots après application des filtres, avec ce qu'il faut pour les
 * afficher. Utilisé à l'identique par la carte et par la liste : c'est ce
 * qui garantit que les deux montrent toujours la même chose.
 */
export function useFilteredSpots() {
  const { filters } = useSpotFilters()
  const typesQuery = useSpotTypes()
  const spotsQuery = useSpotsLight()
  // Les sous-catégories affinent l'affichage, sans le bloquer : si elles tardent ou
  // échouent, les spots s'affichent avec le marqueur de leur type.
  const subtypes = useSpotSubtypes().data ?? NO_SUBTYPES

  // On attend les types avant de montrer les spots : sans eux, ni couleur ni icône.
  const ready = typesQuery.data !== undefined && spotsQuery.data !== undefined
  const allSpots = ready ? spotsQuery.data : NO_SPOTS
  const types = typesQuery.data ?? NO_TYPES

  const spots = useMemo(() => applyFilters(allSpots, filters), [allSpots, filters])
  const typesById = useMemo(() => new Map(types.map((type) => [type.id, type])), [types])
  const subtypesById = useMemo(() => new Map(subtypes.map((subtype) => [subtype.id, subtype])), [subtypes])

  return {
    /** Spots correspondant aux filtres. */
    spots,
    /** Nombre total de spots, avant filtrage. */
    totalCount: allSpots.length,
    types,
    typesById,
    subtypes,
    subtypesById,
    isPending: typesQuery.isPending || spotsQuery.isPending,
    /** Hors ligne et rien en mémoire : le chargement attend le retour du réseau. */
    isWaitingForNetwork:
      (typesQuery.isPending && typesQuery.fetchStatus === 'paused') ||
      (spotsQuery.isPending && spotsQuery.fetchStatus === 'paused'),
    error: typesQuery.error ?? spotsQuery.error,
    refetch: () => {
      void typesQuery.refetch()
      void spotsQuery.refetch()
    },
  }
}
