import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layers, List, LoaderCircle, LocateFixed, Plus, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { BottomSheet } from '@/components/BottomSheet'
import { RoundButton, RoundLink } from '@/components/RoundButton'
import { SHEET_PEEK_HEIGHT, type SheetSnap } from '@/components/sheetSnap'
import { MapNotice } from '@/features/map/components/MapNotice'
import { SpotMap, type SpotMapHandle } from '@/features/map/components/SpotMap'
import { SpotPreviewCard } from '@/features/map/components/SpotPreviewCard'
import { useBasemapMode } from '@/features/map/hooks/useBasemapMode'
import { useUserLocation } from '@/features/map/hooks/useUserLocation'
import { boundsOfPoints, DEFAULT_VIEW, type MapBounds, type MapView } from '@/features/map/logic/mapView'
import { readSavedView, saveView } from '@/features/map/logic/viewStorage'
import { spotsToGeoJson } from '@/features/map/logic/spotsToGeoJson'
import { SpotFilterBar } from '@/features/spots/components/SpotFilterBar'
import { SpotList } from '@/features/spots/components/SpotList'
import { useSpotFilters } from '@/features/spots/hooks/SpotFiltersContext'
import { useFilteredSpots } from '@/features/spots/hooks/useFilteredSpots'
import { normalizeText } from '@/features/spots/logic/filters'
import { buildPinStyles } from '@/features/spots/logic/pinStyles'
import { distanceMeters, formatDistance, sortSpots, spotsInBounds } from '@/features/spots/logic/geo'
import type { SpotLight } from '@/types/models'

/** Hauteur de la barre du haut (recherche + filtres), hors marge de sécurité de l'iPhone. */
const TOP_BAR_HEIGHT = 116
/** Hauteur approximative de l'aperçu d'un spot, pour centrer la carte au-dessus. */
const PREVIEW_HEIGHT = 210
/** Marge sous l'aperçu (son espacement du bord de l'écran). */
const PREVIEW_MARGIN = 12

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

export function MapScreen() {
  const mapRef = useRef<SpotMapHandle>(null)
  const { filters } = useSpotFilters()
  const { spots, totalCount, types, typesById, subtypes, subtypesById, isPending, isWaitingForNetwork, error, refetch } =
    useFilteredSpots()
  const location = useUserLocation()

  // Hauteur réelle de l'aperçu (elle varie : photo ou non, adresse sur une ou
  // deux lignes), marge du bas comprise. Elle sert à placer la mention légale
  // de la carte juste au-dessus, sans qu'elle passe dessous.
  const [previewHeight, setPreviewHeight] = useState(PREVIEW_HEIGHT)
  const previewObserver = useRef<ResizeObserver | null>(null)
  const measurePreview = useCallback((element: HTMLDivElement | null) => {
    previewObserver.current?.disconnect()
    previewObserver.current = null
    if (!element) return
    const update = () => setPreviewHeight(Math.round(element.getBoundingClientRect().height) + PREVIEW_MARGIN)
    update()
    if (typeof ResizeObserver !== 'undefined') {
      previewObserver.current = new ResizeObserver(update)
      previewObserver.current.observe(element)
    }
  }, [])
  const basemap = useBasemapMode()

  const [basemapFailed, setBasemapFailed] = useState(false)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>(() =>
    normalizeText(filters.search) !== '' ? 'full' : 'peek',
  )
  const [camera, setCamera] = useState<{ view: MapView; bounds: MapBounds } | null>(null)

  // Lue une seule fois : où rouvrir la carte.
  const [savedView] = useState(readSavedView)

  // Le spot sélectionné est inscrit dans l'adresse (#/?spot=...) : la liste
  // plein écran peut ainsi renvoyer vers la carte en désignant un spot.
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSpotId = searchParams.get('spot')
  const selectSpot = useCallback(
    (spotId: string | null) => setSearchParams(spotId ? { spot: spotId } : {}, { replace: true }),
    [setSearchParams],
  )
  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedSpotId) ?? null,
    [spots, selectedSpotId],
  )

  const pinStyles = useMemo(() => buildPinStyles(types, subtypes), [types, subtypes])

  const collection = useMemo(() => spotsToGeoJson(spots, new Set(Object.keys(pinStyles))), [spots, pinStyles])

  // --- Liste du panneau ---------------------------------------------------
  // En recherche : tous les résultats, où qu'ils soient. Sinon : les spots
  // de la zone affichée. Dans les deux cas, les plus proches du centre d'abord.
  const isSearching = normalizeText(filters.search) !== ''
  const listed = useMemo(() => {
    if (!camera) return []
    const candidates = isSearching ? spots : spotsInBounds(spots, camera.bounds)
    return sortSpots(candidates, 'distance', camera.view)
  }, [spots, camera, isSearching])

  // Une recherche déploie le panneau sous la barre du haut : les résultats
  // restent visibles au-dessus du clavier. L'effacer le replie.
  // (Ajustement fait pendant le rendu, comme le recommande React, plutôt
  // que dans un effet qui provoquerait un rendu supplémentaire.)
  const [wasSearching, setWasSearching] = useState(isSearching)
  if (wasSearching !== isSearching) {
    setWasSearching(isSearching)
    setSheetSnap(isSearching ? 'full' : 'peek')
  }

  // --- Cadrage --------------------------------------------------------------
  // Spot désigné dans l'adresse à l'ouverture de l'écran (on arrive de la liste).
  const [initialSpotId] = useState(selectedSpotId)

  // Première ouverture (aucune vue mémorisée, aucun spot désigné) : on cadre sur l'ensemble des spots.
  const hasFramedSpots = useRef(false)
  useEffect(() => {
    if (savedView || initialSpotId || hasFramedSpots.current || isPending || totalCount === 0) return
    hasFramedSpots.current = true
    const bounds = boundsOfPoints(spots)
    if (bounds) mapRef.current?.fitBounds(bounds)
  }, [savedView, initialSpotId, isPending, totalCount, spots])

  // Spot désigné à l'ouverture : la carte s'ouvre centrée dessus, sans animation.
  // L'effet dépend des coordonnées (des nombres) et non de l'objet spot : il ne
  // se rejoue donc pas à chaque rafraîchissement des données, ce qui ramènerait
  // la carte sur le spot alors que l'utilisateur l'a déplacée entre-temps.
  const initialSpot = initialSpotId ? spots.find((spot) => spot.id === initialSpotId) : undefined
  const initialLat = initialSpot?.lat
  const initialLng = initialSpot?.lng
  useEffect(() => {
    if (initialLat === undefined || initialLng === undefined) return
    mapRef.current?.focusOn({ lat: initialLat, lng: initialLng }, { bottomInset: PREVIEW_HEIGHT, animate: false })
  }, [initialLat, initialLng])

  // Bouton "Ma position" : on centre dès que la position est connue.
  const centerWhenLocated = useRef(false)
  const userPosition = location.state.status === 'active' ? location.state.position : null
  useEffect(() => {
    if (userPosition && centerWhenLocated.current) {
      centerWhenLocated.current = false
      mapRef.current?.focusOn(userPosition)
    }
  }, [userPosition])

  const handleLocate = () => {
    if (userPosition) {
      mapRef.current?.focusOn(userPosition)
      return
    }
    centerWhenLocated.current = true
    location.start()
  }

  const handleViewChange = useCallback((view: MapView, bounds: MapBounds) => {
    saveView(view)
    setCamera({ view, bounds })
  }, [])

  const handleBasemapStatus = useCallback((ready: boolean) => setBasemapFailed(!ready), [])

  /** Choix d'un spot dans la liste du panneau : on le sélectionne et on centre la carte dessus. */
  const handlePick = useCallback(
    (spot: SpotLight) => {
      // Ferme le clavier si la recherche avait le curseur.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      selectSpot(spot.id)
      mapRef.current?.focusOn(spot, { bottomInset: PREVIEW_HEIGHT })
    },
    [selectSpot],
  )

  const distanceLabelOf = useCallback(
    (spot: SpotLight) => (userPosition ? formatDistance(distanceMeters(userPosition, spot)) : undefined),
    [userPosition],
  )

  let sheetTitle: string
  if (error) sheetTitle = 'Spots indisponibles'
  else if (isWaitingForNetwork) sheetTitle = 'Hors ligne : aucun spot en mémoire'
  else if (isPending || !camera) sheetTitle = 'Chargement des spots…'
  else if (isSearching) sheetTitle = listed.length === 0 ? 'Aucun résultat' : plural(listed.length, 'résultat', 'résultats')
  else if (listed.length === 0) sheetTitle = 'Aucun spot dans cette zone'
  else sheetTitle = `${plural(listed.length, 'spot', 'spots')} dans cette zone`

  let emptyMessage: string
  if (totalCount === 0) emptyMessage = "Aucun spot n'a encore été ajouté."
  else if (isSearching) emptyMessage = 'Aucun spot ne porte ce nom. Vérifie aussi les filtres par type.'
  else emptyMessage = 'Déplace ou dézoome la carte pour voir d\u2019autres spots.'

  const floatingButtons = (
    <>
      <RoundButton
        label={basemap.mode === 'plan' ? 'Afficher la vue satellite' : 'Afficher le plan'}
        onClick={basemap.toggle}
        aria-pressed={basemap.mode === 'satellite'}
      >
        <Layers className="size-6" aria-hidden="true" />
      </RoundButton>
      <RoundLink to="/list" label="Afficher la liste de tous les spots">
        <List className="size-6" aria-hidden="true" />
      </RoundLink>
      <RoundButton
        label="Centrer sur ma position"
        onClick={handleLocate}
        className={userPosition ? 'text-[#2f6fed]' : ''}
      >
        {location.state.status === 'locating' ? (
          <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <LocateFixed className="size-6" aria-hidden="true" />
        )}
      </RoundButton>
      {/* Action principale de l'écran : en bas de la colonne, au plus près du pouce. */}
      <RoundLink to="/new" label="Ajouter un spot" variant="primary">
        <Plus className="size-7" aria-hidden="true" />
      </RoundLink>
    </>
  )

  return (
    <div className="relative h-full overflow-clip bg-mist">
      <SpotMap
        ref={mapRef}
        initialView={savedView ?? DEFAULT_VIEW}
        spots={collection}
        pinStyles={pinStyles}
        selectedSpotId={selectedSpot ? selectedSpot.id : null}
        userPosition={userPosition}
        onSelect={selectSpot}
        onViewChange={handleViewChange}
        onBasemapStatus={handleBasemapStatus}
        bottomInset={selectedSpot ? previewHeight : SHEET_PEEK_HEIGHT}
        basemap={basemap.mode}
      />

      {/* Haut : recherche et filtres, puis les messages. "pointer-events-none"
          laisse passer les gestes vers la carte entre les éléments. */}
      <div className="safe-top safe-x pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="pointer-events-auto pt-3">
          <SpotFilterBar
            types={types}
            floating
            trailing={
              <RoundLink to="/account" label="Mon compte">
                <UserRound className="size-6" aria-hidden="true" />
              </RoundLink>
            }
          />
        </div>
        <div className="pointer-events-auto flex flex-col items-start gap-2 px-3">
          {basemapFailed && (
            <MapNotice tone="error" action={{ label: 'Réessayer', onClick: () => mapRef.current?.reloadBasemap() }}>
              Fond de carte indisponible.
            </MapNotice>
          )}
          {error && (
            <MapNotice tone="error" action={{ label: 'Réessayer', onClick: refetch }}>
              {error.message}
            </MapNotice>
          )}
          {location.state.status === 'error' && (
            <MapNotice tone="error" action={{ label: 'Fermer', onClick: location.dismissError }}>
              {location.state.problem.message}
            </MapNotice>
          )}
        </div>
      </div>

      {/* Bas : aperçu du spot sélectionné, ou panneau de la liste. La zone commence sous la barre du haut. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ top: `calc(env(safe-area-inset-top, 0px) + ${TOP_BAR_HEIGHT}px)` }}
      >
        {selectedSpot ? (
          <div className="safe-bottom safe-x absolute inset-x-0 bottom-0">
            <div className="flex flex-col items-end gap-3 p-3">
              <div className="pointer-events-auto flex flex-col items-end gap-3">{floatingButtons}</div>
              <div ref={measurePreview} className="pointer-events-auto w-full max-w-md self-center">
                <SpotPreviewCard
                  spot={selectedSpot}
                  type={typesById.get(selectedSpot.spot_type_id)}
                  subtype={selectedSpot.subtype_id ? subtypesById.get(selectedSpot.subtype_id) : null}
                  onClose={() => selectSpot(null)}
                />
              </div>
            </div>
          </div>
        ) : (
          <BottomSheet
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            floating={floatingButtons}
            header={<span className="block text-center text-lg font-semibold">{sheetTitle}</span>}
          >
            {!isPending && !error && camera && (
              <SpotList
                // Nouvelle recherche ou nouveaux filtres : la pagination repart du début.
                key={`${filters.search}|${filters.typeIds.join(',')}`}
                spots={listed}
                typesById={typesById}
                subtypesById={subtypesById}
                onSelect={handlePick}
                distanceLabelOf={distanceLabelOf}
                emptyMessage={emptyMessage}
              />
            )}
          </BottomSheet>
        )}
      </div>
    </div>
  )
}
