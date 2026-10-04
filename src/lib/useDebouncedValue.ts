import { useEffect, useState } from 'react'

/**
 * Renvoie la valeur seulement une fois qu'elle a cessé de changer pendant
 * `delayMs`. Sert à attendre que l'utilisateur ait fini un geste (déplacer
 * la carte, taper du texte) avant de lancer une requête.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
