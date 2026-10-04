import { useCallback, useState } from 'react'
import type { BasemapMode } from '@/features/map/engine/spotMapEngine'

const STORAGE_KEY = 'spots.map.basemap'

function readSaved(): BasemapMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'satellite' ? 'satellite' : 'plan'
  } catch {
    return 'plan'
  }
}

/**
 * Fond de carte choisi (plan ou satellite), mémorisé sur l'appareil : la
 * carte rouvre dans le mode où on l'a laissée.
 */
export function useBasemapMode() {
  const [mode, setMode] = useState<BasemapMode>(readSaved)

  const toggle = useCallback(() => {
    setMode((current) => {
      const next: BasemapMode = current === 'plan' ? 'satellite' : 'plan'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Stockage indisponible : le choix vaudra seulement pour cette ouverture.
      }
      return next
    })
  }, [])

  return { mode, toggle }
}
