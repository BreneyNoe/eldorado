import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { SheetLayout } from '@/components/SheetLayout'
import { PasswordField, TextField } from '@/components/TextField'
import { APP_NAME, TEXT_LIMITS } from '@/config/constants'
import { useAuth } from '@/features/auth/hooks/AuthContext'
import { useSignUp } from '@/features/auth/hooks/useAuthActions'
import { validateSignUp, type SignUpErrors } from '@/features/auth/logic/validation'

/**
 * Création d'un compte par la personne elle-même. Le compte est utilisable
 * aussitôt ; un administrateur peut le bannir après coup.
 */
export function SignUpScreen() {
  const { state } = useAuth()
  const signUp = useSignUp()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<SignUpErrors>({})

  // Déjà connecté (ou connecté par l'inscription elle-même) : direction l'accueil.
  if (state.status !== 'signed_out' && state.status !== 'loading') return <Navigate to="/" replace />

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validation = validateSignUp({ displayName, email, password, confirmation })
    setErrors(validation)
    if (Object.keys(validation).length > 0) return
    signUp.mutate({ email, password, displayName })
  }

  const edit = (setter: (value: string) => void) => (event: { target: { value: string } }) => {
    setter(event.target.value)
    if (signUp.isError) signUp.reset()
  }

  // Compte créé, mais Supabase attend une confirmation par e-mail avant de connecter.
  if (signUp.isSuccess && signUp.data === false) {
    return (
      <SheetLayout title={APP_NAME} subtitle="Compte créé" back={{ to: '/login', label: 'Connexion' }}>
        <Notice tone="success">
          Ton compte est créé. Si un e-mail de confirmation t'a été envoyé, ouvre-le, puis reviens te connecter.
        </Notice>
      </SheetLayout>
    )
  }

  return (
    <SheetLayout title={APP_NAME} subtitle="Créer un compte" back={{ to: '/login', label: 'Connexion' }}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Nom affiché"
          name="display_name"
          value={displayName}
          onChange={edit(setDisplayName)}
          error={errors.displayName}
          hint="C'est le nom que les autres verront sur tes spots."
          maxLength={TEXT_LIMITS.displayName.max}
          autoComplete="nickname"
          enterKeyHint="next"
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={edit(setEmail)}
          error={errors.email}
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
        />
        <PasswordField
          label="Mot de passe"
          name="new_password"
          value={password}
          onChange={edit(setPassword)}
          error={errors.password}
          autoComplete="new-password"
          enterKeyHint="next"
        />
        <PasswordField
          label="Confirme le mot de passe"
          name="new_password_confirmation"
          value={confirmation}
          onChange={edit(setConfirmation)}
          error={errors.confirmation}
          autoComplete="new-password"
          enterKeyHint="go"
        />

        {signUp.error && <Notice tone="error">{signUp.error.message}</Notice>}

        <Button type="submit" loading={signUp.isPending}>
          Créer mon compte
        </Button>
      </form>

    </SheetLayout>
  )
}
