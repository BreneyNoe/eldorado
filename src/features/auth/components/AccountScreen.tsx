import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { SheetLayout } from '@/components/SheetLayout'
import { PasswordField, TextField } from '@/components/TextField'
import { PASSWORD_MIN_LENGTH, TEXT_LIMITS } from '@/config/constants'
import { AvatarEditor } from '@/features/auth/components/AvatarEditor'
import { RankProgress } from '@/features/auth/components/RankProgress'
import { useCurrentUser } from '@/features/auth/hooks/AuthContext'
import { useChangePassword, useSignOut, useUpdateDisplayName } from '@/features/auth/hooks/useAuthActions'
import {
  hasErrors,
  validateDisplayName,
  validatePasswordChange,
  type PasswordChangeErrors,
} from '@/features/auth/logic/validation'

function DisplayNameForm({ userId, currentName }: { userId: string; currentName: string }) {
  const update = useUpdateDisplayName(userId)
  const [name, setName] = useState(currentName)
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const error = validateDisplayName(name)
    setFieldError(error)
    if (error) return
    update.mutate(name)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <TextField
        label="Nom affiché"
        name="display_name"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          if (!update.isIdle) update.reset()
        }}
        error={fieldError}
        hint="Visible par les autres à côté de tes spots, photos et updates."
        maxLength={TEXT_LIMITS.displayName.max}
        autoComplete="nickname"
        enterKeyHint="done"
      />
      {update.error && <Notice tone="error">{update.error.message}</Notice>}
      {update.isSuccess && <Notice tone="success">Nom enregistré.</Notice>}
      <Button
        type="submit"
        variant="secondary"
        loading={update.isPending}
        disabled={name.trim() === currentName}
      >
        Enregistrer le nom
      </Button>
    </form>
  )
}

function PasswordForm({ email }: { email: string }) {
  const change = useChangePassword(email)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState<PasswordChangeErrors>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = validatePasswordChange(current, next, confirmation)
    setFieldErrors(errors)
    if (hasErrors(errors)) return
    change.mutate(
      { current, next },
      {
        onSuccess: () => {
          setCurrent('')
          setNext('')
          setConfirmation('')
        },
      },
    )
  }

  const resetResult = () => {
    if (!change.isIdle) change.reset()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Champ masqué : aide les gestionnaires de mots de passe à savoir de quel compte il s'agit. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <PasswordField
        label="Mot de passe actuel"
        name="current_password"
        value={current}
        onChange={(event) => {
          setCurrent(event.target.value)
          resetResult()
        }}
        error={fieldErrors.current}
        autoComplete="current-password"
      />
      <PasswordField
        label="Nouveau mot de passe"
        name="new_password"
        value={next}
        onChange={(event) => {
          setNext(event.target.value)
          resetResult()
        }}
        error={fieldErrors.next}
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
        autoComplete="new-password"
      />
      <PasswordField
        label="Nouveau mot de passe, à nouveau"
        name="new_password_confirmation"
        value={confirmation}
        onChange={(event) => {
          setConfirmation(event.target.value)
          resetResult()
        }}
        error={fieldErrors.confirmation}
        autoComplete="new-password"
      />
      {change.error && <Notice tone="error">{change.error.message}</Notice>}
      {change.isSuccess && <Notice tone="success">Mot de passe changé.</Notice>}
      <Button type="submit" variant="secondary" loading={change.isPending}>
        Changer le mot de passe
      </Button>
    </form>
  )
}

export function AccountScreen() {
  const { session, profile, isAdmin } = useCurrentUser()
  const signOut = useSignOut()

  return (
    <SheetLayout title="Mon compte" back={{ to: '/', label: 'Retour' }}>
      <p className="text-lg font-medium break-all">{session.email}</p>
      <p className="mt-1 text-base text-ink-soft">{isAdmin ? 'Administrateur' : 'Membre'}</p>

      <section className="mt-8 border-t border-line pt-8">
        <AvatarEditor profile={profile} />
      </section>

      <section className="mt-8 border-t border-line pt-8">
        <RankProgress profile={profile} />
      </section>

      <section className="mt-8 border-t border-line pt-8">
        <DisplayNameForm userId={session.userId} currentName={profile.display_name} />
      </section>

      <section className="mt-8 border-t border-line pt-8">
        <h2 className="mb-4 text-xl font-semibold">Mot de passe</h2>
        <PasswordForm email={session.email} />
      </section>

      <section className="mt-8 space-y-3 border-t border-line pt-8">
        {isAdmin && (
          <Link
            to="/admin"
            className="flex h-14 items-center justify-center rounded-xl bg-mist text-lg font-semibold text-ink active:bg-line"
          >
            Administration
          </Link>
        )}
        {signOut.error && <Notice tone="error">{signOut.error.message}</Notice>}
        <Button variant="danger" loading={signOut.isPending} onClick={() => signOut.mutate()}>
          Se déconnecter
        </Button>
        {isAdmin && (
          <Link
            to="/diagnostic"
            className="flex h-12 items-center justify-center rounded-xl text-base text-ink-soft underline underline-offset-4"
          >
            État de l'installation
          </Link>
        )}
      </section>
    </SheetLayout>
  )
}
