/**
 * Traduit les échecs de géolocalisation du navigateur en messages utiles.
 * Fonction pure : le navigateur n'est pas interrogé ici.
 */

export type LocationFailure = 'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'timeout'

export interface LocationProblem {
  reason: LocationFailure
  message: string
  /** Vrai si un nouvel essai peut suffire (faux s'il faut changer un réglage). */
  retryable: boolean
}

const PROBLEMS: Record<LocationFailure, Omit<LocationProblem, 'reason'>> = {
  insecure: {
    message: 'La localisation exige une connexion sécurisée (adresse en https).',
    retryable: false,
  },
  unsupported: {
    message: "Cet appareil ne permet pas la localisation depuis l'application.",
    retryable: false,
  },
  denied: {
    message:
      "Localisation refusée. Autorise-la pour ce site dans les réglages de localisation de l'appareil ou du navigateur, puis réessaie.",
    retryable: false,
  },
  unavailable: {
    message: 'Position introuvable pour le moment. Vérifie que la localisation est activée.',
    retryable: true,
  },
  timeout: {
    message: 'La localisation prend trop de temps. Réessaie, si possible à découvert.',
    retryable: true,
  },
}

export function describeLocationProblem(reason: LocationFailure): LocationProblem {
  return { reason, ...PROBLEMS[reason] }
}

/**
 * Codes de GeolocationPositionError : 1 = refusé, 2 = indisponible, 3 = délai dépassé.
 * Hors connexion sécurisée, les navigateurs répondent "refusé" : on le dit clairement.
 */
export function describeLocationError(code: number, isSecureContext: boolean): LocationProblem {
  if (!isSecureContext) return describeLocationProblem('insecure')
  if (code === 1) return describeLocationProblem('denied')
  if (code === 3) return describeLocationProblem('timeout')
  return describeLocationProblem('unavailable')
}
