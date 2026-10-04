/**
 * Validation des formulaires de connexion et de compte.
 * Ces contrôles servent au confort : la base et Supabase Auth refont les
 * leurs, qui sont les seuls à faire foi.
 */
import { PASSWORD_MIN_LENGTH, TEXT_LIMITS } from '@/config/constants'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function looksLikeEmail(email: string): boolean {
  // Volontairement simple : quelque chose, un @, quelque chose, un point, quelque chose.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export interface CredentialErrors {
  email?: string
  password?: string
}

export function validateCredentials(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {}
  const cleanEmail = normalizeEmail(email)

  if (!cleanEmail) errors.email = 'Saisis ton email.'
  else if (!looksLikeEmail(cleanEmail)) errors.email = "Cet email n'a pas un format valide."

  if (!password) errors.password = 'Saisis ton mot de passe.'

  return errors
}

/** Renvoie un message d'erreur, ou null si le nom est valide. */
export function validateDisplayName(name: string): string | null {
  const length = name.trim().length
  const { min, max } = TEXT_LIMITS.displayName
  if (length < min) return `Le nom doit contenir au moins ${min} caractères.`
  if (length > max) return `Le nom ne peut pas dépasser ${max} caractères.`
  return null
}

export interface PasswordChangeErrors {
  current?: string
  next?: string
  confirmation?: string
}

export function validatePasswordChange(
  current: string,
  next: string,
  confirmation: string,
): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {}

  if (!current) errors.current = 'Saisis ton mot de passe actuel.'

  if (next.length < PASSWORD_MIN_LENGTH) {
    errors.next = `Le nouveau mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  } else if (next === current) {
    errors.next = "Le nouveau mot de passe doit être différent de l'ancien."
  }

  if (confirmation !== next) errors.confirmation = 'Les deux saisies ne sont pas identiques.'

  return errors
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0
}

export interface SignUpErrors {
  displayName?: string
  email?: string
  password?: string
  confirmation?: string
}

export function validateSignUp(input: {
  displayName: string
  email: string
  password: string
  confirmation: string
}): SignUpErrors {
  const errors: SignUpErrors = {}

  const nameProblem = validateDisplayName(input.displayName)
  if (nameProblem) errors.displayName = nameProblem

  const cleanEmail = normalizeEmail(input.email)
  if (!cleanEmail) errors.email = 'Saisis ton email.'
  else if (!looksLikeEmail(cleanEmail)) errors.email = "Cet email n'a pas un format valide."

  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  }
  if (input.confirmation !== input.password) errors.confirmation = 'Les deux mots de passe sont différents.'

  return errors
}
