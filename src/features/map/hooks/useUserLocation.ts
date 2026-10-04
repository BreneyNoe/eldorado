import { useCallback, useEffect, useRef, useState } from 'react'
import {
  describeLocationError,
  describeLocationProblem,
  type LocationProblem,
} from '@/features/map/logic/geolocation'

export interface UserPosition {
  lat: number
  lng: number
}

export type UserLocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'active'; position: UserPosition }
  | { status: 'error'; problem: LocationProblem }

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  // Une position vieille de 10 s au plus est acceptée : réponse plus rapide.
  maximumAge: 10_000,
  timeout: 20_000,
}

/**
 * Suit la position de l'utilisateur à partir du moment où il la demande.
 * Rien n'est demandé au navigateur avant le premier appel à start() :
 * la fenêtre d'autorisation n'apparaît donc que sur un geste volontaire.
 */
export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>({ status: 'idle' })
  const watchId = useRef<number | null>(null)
  const hasPosition = useRef(false)

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const startWatching = useCallback(() => {
    if (watchId.current !== null) return
    watchId.current = navigator.geolocation.watchPosition(
      (result) => {
        hasPosition.current = true
        setState({
          status: 'active',
          position: { lat: result.coords.latitude, lng: result.coords.longitude },
        })
      },
      (error) => {
        // Position déjà connue : une perte de signal passagère ne doit pas
        // faire disparaître le point. Seul un refus arrête tout.
        if (hasPosition.current && error.code !== error.PERMISSION_DENIED) return
        stopWatching()
        hasPosition.current = false
        setState({ status: 'error', problem: describeLocationError(error.code, window.isSecureContext) })
      },
      WATCH_OPTIONS,
    )
  }, [stopWatching])

  /** À appeler sur un geste de l'utilisateur (bouton "Ma position"). */
  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', problem: describeLocationProblem('unsupported') })
      return
    }
    if (!window.isSecureContext) {
      setState({ status: 'error', problem: describeLocationProblem('insecure') })
      return
    }
    if (watchId.current !== null) return
    if (!hasPosition.current) setState({ status: 'locating' })
    startWatching()
  }, [startWatching])

  const dismissError = useCallback(() => {
    setState((current) => (current.status === 'error' ? { status: 'idle' } : current))
  }, [])

  // Application en arrière-plan : on arrête le GPS pour épargner la batterie,
  // et on le reprend au retour si la localisation était en cours.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) stopWatching()
      else if (hasPosition.current) startWatching()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopWatching()
    }
  }, [startWatching, stopWatching])

  return { state, start, dismissError }
}
