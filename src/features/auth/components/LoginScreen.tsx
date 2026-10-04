import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, Link } from 'react-router'
import { Button } from '@/components/Button'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { Notice } from '@/components/Notice'
import { SheetLayout } from '@/components/SheetLayout'
import { PasswordField, TextField } from '@/components/TextField'
import { APP_NAME } from '@/config/constants'
import { useAuth } from '@/features/auth/hooks/AuthContext'
import { useSignIn } from '@/features/auth/hooks/useAuthActions'
import { hasErrors, validateCredentials, type CredentialErrors } from '@/features/auth/logic/validation'

export function LoginScreen() {
  const { state } = useAuth()
  const location = useLocation()
  const signIn = useSignIn()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({})

  // Démarrage, ou connexion réussie dont on lit encore le profil.
  if (state.status === 'loading') return <FullScreenLoader />

  // Déjà connecté : on retourne là où la personne voulait aller.
  // (Les comptes bloqués sont pris en charge par <RequireAuth>.)
  if (state.status !== 'signed_out') {
    const from = (location.state as { from?: string } | null)?.from
    return (
      <>
        <Navigate to={from ?? '/'} replace />
        {/* Visible le temps que l'écran suivant (la carte) soit téléchargé. */}
        <FullScreenLoader />
      </>
    )
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = validateCredentials(email, password)
    setFieldErrors(errors)
    if (hasErrors(errors)) return
    signIn.mutate({ email, password })
  }

  return (
    <SheetLayout title={APP_NAME} subtitle="Connexion">
      {/* noValidate : on affiche nos propres messages plutôt que les bulles du navigateur. */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (signIn.isError) signIn.reset()
          }}
          error={fieldErrors.email}
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
        />
        <PasswordField
          label="Mot de passe"
          name="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (signIn.isError) signIn.reset()
          }}
          error={fieldErrors.password}
          autoComplete="current-password"
          enterKeyHint="go"
        />

        {signIn.error && <Notice tone="error">{signIn.error.message}</Notice>}

        <Button type="submit" loading={signIn.isPending}>
          Se connecter
        </Button>
      </form>

      <div className="mt-8 space-y-3">
        <Link
          to="/signup"
          className="flex h-14 items-center justify-center rounded-xl bg-mist text-lg font-semibold text-ink active:bg-line"
        >
          Créer un compte
        </Link>
        <p className="text-base text-ink-soft">Mot de passe oublié ? Demande à un administrateur du groupe.</p>
      </div>
    </SheetLayout>
  )
}
