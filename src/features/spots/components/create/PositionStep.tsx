import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Images, Layers, LoaderCircle, LocateFixed, MapPin, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/Button'
import { RoundButton } from '@/components/RoundButton'
import { useReverseGeocode } from '@/features/geocoding/hooks/useReverseGeocode'
import { MapNotice } from '@/features/map/components/MapNotice'
import { SpotMap, type SpotMapHandle } from '@/features/map/components/SpotMap'
import { useBasemapMode } from '@/features/map/hooks/useBasemapMode'
import { useUserLocation } from '@/features/map/hooks/useUserLocation'
import type { MapView } from '@/features/map/logic/mapView'
import { spotsToGeoJson } from '@/features/map/logic/spotsToGeoJson'
import { useNearbySpots, useSpotsLight, useSpotSubtypes, useSpotTypes } from '@/features/spots/hooks/useSpotQueries'
import { formatDistance } from '@/features/spots/logic/geo'
import { buildPinStyles } from '@/features/spots/logic/pinStyles'
import { roundCoordinate } from '@/features/spots/logic/spotDraft'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

/** En dessous de ce zoom, un écart d'un millimètre à l'écran représente des centaines de mètres. */
const MIN_ZOOM_TO_CONFIRM = 13
/** Zoom appliqué quand on part de la position de l'utilisateur. */
const LOCATE_ZOOM = 16
/** Temps d'immobilité de la carte avant de chercher l'adresse et les spots proches. */
const SETTLE_DELAY_MS = 900
/** Nombre de spots proches listés dans l'avertissement. */
const MAX_NEARBY_SHOWN = 3

const NO_SPOTS: never[] = []

interface PositionStepProps {
  /** Où ouvrir la carte. */
  initialView: MapView
  /** Explication affichée quand la position de départ vient des photos. */
  notice?: string | null
  /** En modification : le spot qu'on déplace, pour qu'il ne se signale pas lui-même comme "proche". */
  excludeSpotId?: string
  /** Nom du bouton de retour, lu par les lecteurs d'écran. */
  backLabel?: string
  /** Libellé du bouton de validation. */
  confirmLabel?: string
  onConfirm: (position: { lat: number; lng: number }) => void
  /** Retour à l'étape précédente. */
  onBack: () => void
}

/**
 * Deuxième étape de la création : placer le spot.
 * Le repère reste fixe au centre, c'est la carte qu'on déplace dessous :
 * plus précis au doigt que de faire glisser un repère.
 */
export function PositionStep({
  initialView,
  notice,
  excludeSpotId,
  backLabel = 'Revenir aux photos',
  confirmLabel = 'Continuer',
  onConfirm,
  onBack,
}: PositionStepProps) {
  const mapRef = useRef<SpotMapHandle>(null)
  const typesQuery = useSpotTypes()
  const spotsQuery = useSpotsLight()
  const location = useUserLocation()
  const basemap = useBasemapMode()

  const [view, setView] = useState<MapView>(initialView)
  const [basemapFailed, setBasemapFailed] = useState(false)

  const zoomedEnough = view.zoom >= MIN_ZOOM_TO_CONFIRM
  const position = useMemo(
    () => ({ lat: roundCoordinate(view.lat), lng: roundCoordinate(view.lng) }),
    [view.lat, view.lng],
  )

  // On n'interroge les services qu'une fois la carte immobile et assez zoomée.
  const settledPosition = useDebouncedValue(zoomedEnough ? position : null, SETTLE_DELAY_MS)
  const geocode = useReverseGeocode(settledPosition)
  const nearby = useNearbySpots(settledPosition, excludeSpotId)
  const isSettling = zoomedEnough && settledPosition !== position

  // Les spots existants sont affichés : on voit tout de suite si l'endroit est déjà connu.
  const types = typesQuery.data
  const spots = spotsQuery.data
  const subtypes = useSpotSubtypes().data
  const pinStyles = useMemo(() => buildPinStyles(types ?? [], subtypes ?? []), [types, subtypes])
  const collection = useMemo(
    () => spotsToGeoJson(types && spots ? spots : NO_SPOTS, new Set(Object.keys(pinStyles))),
    [types, spots, pinStyles],
  )

  // Bouton "Ma position" : on centre dès que la position est connue.
  const centerWhenLocated = useRef(false)
  const userPosition = location.state.status === 'active' ? location.state.position : null
  useEffect(() => {
    if (userPosition && centerWhenLocated.current) {
      centerWhenLocated.current = false
      mapRef.current?.focusOn(userPosition, { minZoom: LOCATE_ZOOM })
    }
  }, [userPosition])

  const handleLocate = () => {
    if (userPosition) {
      mapRef.current?.focusOn(userPosition, { minZoom: LOCATE_ZOOM })
      return
    }
    centerWhenLocated.current = true
    location.start()
  }

  const handleViewChange = useCallback((next: MapView) => setView(next), [])
  const handleBasemapStatus = useCallback((ready: boolean) => setBasemapFailed(!ready), [])
  const ignoreSelection = useCallback(() => {}, [])

  let addressLine: string
  if (!zoomedEnough) addressLine = 'Zoome sur l\u2019endroit exact pour continuer.'
  else if (isSettling || geocode.isPending) addressLine = 'Recherche de l\u2019adresse…'
  else if (geocode.error) addressLine = 'Adresse indisponible pour le moment. Tu pourras la saisir à l\u2019étape suivante.'
  else addressLine = geocode.data ?? 'Aucune adresse connue ici. Tu pourras en saisir une à l\u2019étape suivante.'

  const nearbySpots = !isSettling && nearby.data ? nearby.data : []

  return (
    <div className="flex h-full flex-col bg-mist">
      {/* La carte n'occupe que la partie haute : le repère, au centre de la carte,
          est ainsi au centre de ce que l'on voit. */}
      <div className="relative min-h-0 flex-1">
        <SpotMap
          ref={mapRef}
          initialView={initialView}
          spots={collection}
          pinStyles={pinStyles}
          selectedSpotId={null}
          userPosition={userPosition}
          onSelect={ignoreSelection}
          onViewChange={handleViewChange}
          onBasemapStatus={handleBasemapStatus}
          basemap={basemap.mode}
        />

        {/* Repère fixe : sa pointe est exactement au centre de la carte. */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"
          aria-hidden="true"
        >
          <svg width="44" height="56" viewBox="0 0 44 56">
            <path
              d="M22 55C22 55 41 34.5 41 21A19 19 0 1 0 3 21C3 34.5 22 55 22 55Z"
              fill="#16233b"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <circle cx="22" cy="21" r="7.5" fill="#ffc531" />
          </svg>
        </div>

        <div className="safe-top safe-x pointer-events-none absolute inset-x-0 top-0">
          <div className="flex items-start gap-3 p-3">
            <RoundButton label={backLabel} onClick={onBack} className="pointer-events-auto shrink-0">
              <ArrowLeft className="size-6" aria-hidden="true" />
            </RoundButton>
            <div className="pointer-events-auto flex min-w-0 flex-col items-start gap-2">
              <h1 className="rounded-2xl bg-paper px-4 py-3 text-lg leading-tight font-semibold shadow-[0_2px_8px_rgb(22_35_59/0.28)]">
                Place le repère sur le spot
              </h1>
              {basemapFailed && (
                <MapNotice tone="error" action={{ label: 'Réessayer', onClick: () => mapRef.current?.reloadBasemap() }}>
                  Fond de carte indisponible.
                </MapNotice>
              )}
              {location.state.status === 'error' && (
                <MapNotice tone="error" action={{ label: 'Fermer', onClick: location.dismissError }}>
                  {location.state.problem.message}
                </MapNotice>
              )}
            </div>
          </div>
        </div>

        <div className="safe-x pointer-events-none absolute inset-x-0 bottom-0">
          <div className="flex flex-col items-end gap-3 p-3">
            {/* La vue satellite aide à viser juste : une vasque, un bâtiment, un sentier. */}
            <RoundButton
              label={basemap.mode === 'plan' ? 'Afficher la vue satellite' : 'Afficher le plan'}
              onClick={basemap.toggle}
              aria-pressed={basemap.mode === 'satellite'}
              className="pointer-events-auto"
            >
              <Layers className="size-6" aria-hidden="true" />
            </RoundButton>
            <RoundButton
              label="Centrer sur ma position"
              onClick={handleLocate}
              className={`pointer-events-auto ${userPosition ? 'text-[#2f6fed]' : ''}`}
            >
              {location.state.status === 'locating' ? (
                <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <LocateFixed className="size-6" aria-hidden="true" />
              )}
            </RoundButton>
          </div>
        </div>
      </div>

      <div className="safe-bottom safe-x shrink-0 rounded-t-3xl bg-paper shadow-[0_-4px_16px_rgb(22_35_59/0.18)]">
        <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-5 pb-4">
          {notice && (
            <p className="flex items-start gap-3 rounded-xl bg-mist px-4 py-3 text-base">
              <Images className="mt-0.5 size-5 shrink-0 text-ink-soft" aria-hidden="true" />
              <span>{notice} Déplace la carte pour corriger.</span>
            </p>
          )}
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-6 shrink-0 text-ink-soft" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-lg leading-snug" aria-live="polite">
                {addressLine}
              </p>
              <p className="mt-0.5 text-base text-ink-soft">
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </p>
            </div>
          </div>

          {nearbySpots.length > 0 && (
            <div role="alert" className="rounded-xl bg-blaze/20 px-4 py-3">
              <p className="flex items-center gap-2 text-base font-semibold">
                <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
                Un ou plusieurs spots existent à proximité.
              </p>
              <ul className="mt-1.5 space-y-0.5 text-base">
                {nearbySpots.slice(0, MAX_NEARBY_SHOWN).map((spot) => (
                  <li key={spot.id} className="flex justify-between gap-3">
                    <span className="truncate">{spot.name}</span>
                    <span className="shrink-0 text-ink-soft">{formatDistance(spot.distance_m)}</span>
                  </li>
                ))}
              </ul>
              {nearbySpots.length > MAX_NEARBY_SHOWN && (
                <p className="mt-0.5 text-base text-ink-soft">et {nearbySpots.length - MAX_NEARBY_SHOWN} de plus</p>
              )}
              <p className="mt-1.5 text-base text-ink-soft">Vérifie qu'il ne s'agit pas du même. Tu peux continuer.</p>
            </div>
          )}

          <Button onClick={() => onConfirm(position)} disabled={!zoomedEnough}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
