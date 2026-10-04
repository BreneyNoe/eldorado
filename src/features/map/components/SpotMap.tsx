import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getEnv } from '@/config/env'
import {
  createSpotMapEngine,
  type BasemapMode,
  type FocusOptions,
  type PinStyle,
  type SpotMapEngine,
} from '@/features/map/engine/spotMapEngine'
import type { MapBounds, MapView } from '@/features/map/logic/mapView'
import type { SpotFeatureCollection } from '@/features/map/logic/spotsToGeoJson'

/** Actions que l'écran peut demander à la carte. */
export interface SpotMapHandle {
  focusOn: (position: { lat: number; lng: number }, options?: FocusOptions) => void
  fitBounds: (bounds: MapBounds) => void
  reloadBasemap: () => void
}

interface SpotMapProps {
  ref?: Ref<SpotMapHandle>
  /** Position de départ. Lue une seule fois, à la création de la carte. */
  initialView: MapView
  spots: SpotFeatureCollection
  pinStyles: Record<string, PinStyle>
  selectedSpotId: string | null
  userPosition: { lat: number; lng: number } | null
  onSelect: (spotId: string | null) => void
  onViewChange: (view: MapView, bounds: MapBounds) => void
  onBasemapStatus: (ready: boolean) => void
  /** Fond de carte : plan ou vue satellite. */
  basemap?: BasemapMode
  /** Hauteur (en pixels) masquée en bas par un panneau : la mention légale de la carte se place au-dessus. */
  bottomInset?: number
}

/**
 * La carte. Elle est créée une seule fois et n'est jamais redessinée par
 * React : les changements de données lui sont transmis par les effets
 * ci-dessous. C'est ce qui la garde fluide.
 */
export function SpotMap({
  ref,
  initialView,
  spots,
  pinStyles,
  selectedSpotId,
  userPosition,
  onSelect,
  onViewChange,
  onBasemapStatus,
  bottomInset = 0,
  basemap = 'plan',
}: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SpotMapEngine | null>(null)

  // Les fonctions de rappel sont rangées dans une référence : la carte
  // appelle toujours leur dernière version, sans devoir être recréée.
  const callbacks = useRef({ onSelect, onViewChange, onBasemapStatus })
  useEffect(() => {
    callbacks.current = { onSelect, onViewChange, onBasemapStatus }
  })

  const initialViewRef = useRef(initialView)
  const initialBasemapRef = useRef(basemap)

  useEffect(() => {
    if (!containerRef.current) return
    const engine = createSpotMapEngine({
      container: containerRef.current,
      styleUrl: getEnv().mapStyleUrl,
      satelliteTilesUrl: getEnv().satelliteTilesUrl,
      initialBasemap: initialBasemapRef.current,
      initialView: initialViewRef.current,
      onSelect: (spotId) => callbacks.current.onSelect(spotId),
      onViewChange: (view, bounds) => callbacks.current.onViewChange(view, bounds),
      onBasemapStatus: (ready) => callbacks.current.onBasemapStatus(ready),
    })
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  // L'ordre compte : les styles des types d'abord, puis les spots qui s'en servent.
  useEffect(() => {
    engineRef.current?.setPinStyles(pinStyles)
  }, [pinStyles])

  useEffect(() => {
    engineRef.current?.setSpots(spots)
  }, [spots])

  useEffect(() => {
    engineRef.current?.setSelected(selectedSpotId)
  }, [selectedSpotId])

  useEffect(() => {
    engineRef.current?.setUserLocation(userPosition)
  }, [userPosition])

  useEffect(() => {
    engineRef.current?.setBasemap(basemap)
  }, [basemap])

  useImperativeHandle(
    ref,
    () => ({
      focusOn: (position, options) => engineRef.current?.focusOn(position, options),
      fitBounds: (bounds) => engineRef.current?.fitBounds(bounds),
      reloadBasemap: () => engineRef.current?.reloadBasemap(),
    }),
    [],
  )

  // Deux éléments : MapLibre impose son propre positionnement à celui qu'on
  // lui confie. L'élément extérieur garantit que la carte remplit l'écran.
  return (
    // "isolate" : les éléments de la carte (mention légale...) restent sous
    // les panneaux de l'application, quel que soit leur propre ordre d'empilement.
    <div className="absolute inset-0 isolate" style={{ '--map-bottom-inset': `${bottomInset}px` } as CSSProperties}>
      <div ref={containerRef} className="size-full" role="application" aria-label="Carte des spots" />
    </div>
  )
}
