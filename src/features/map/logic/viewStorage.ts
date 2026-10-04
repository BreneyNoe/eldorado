/**
 * Mémorisation de la dernière position de la carte sur l'appareil.
 * Sert à rouvrir la carte au même endroit, et à démarrer la création d'un
 * spot là où l'on regardait.
 */
import { parseSavedView, serializeView, type MapView } from '@/features/map/logic/mapView'

const SAVED_VIEW_KEY = 'spots.map.view'

/** Le stockage local peut être indisponible (navigation privée) : on ne s'y fie jamais. */
export function readSavedView(): MapView | null {
  try {
    return parseSavedView(window.localStorage.getItem(SAVED_VIEW_KEY))
  } catch {
    return null
  }
}

export function saveView(view: MapView): void {
  try {
    window.localStorage.setItem(SAVED_VIEW_KEY, serializeView(view))
  } catch {
    // Tant pis : la carte rouvrira simplement sur la vue par défaut.
  }
}
