import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Vrai tant que l'appareil se dit connecté. C'est une indication, pas une
 * garantie : un réseau peut être présent sans que rien ne passe. Dans ce cas
 * les écrans affichent leurs propres messages d'erreur.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}
