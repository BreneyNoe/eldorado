import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Notice } from '@/components/Notice'
import { useRemoveUserAvatar, useUpdateUser, useUserAvatars, useUsers } from '@/features/admin/hooks/useAdmin'
import { useCurrentUser } from '@/features/auth/hooks/AuthContext'
import { formatInstantDay } from '@/lib/formatDate'
import type { UserRole } from '@/types/database'
import type { AdminUser } from '@/types/models'

interface PendingChange {
  user: AdminUser
  changes: { role?: UserRole; is_active?: boolean }
  title: string
  confirmLabel: string
  message: string
}

const ACTION = 'h-11 rounded-xl bg-mist px-4 text-base font-semibold text-ink active:bg-line'

/** Comptes de l'application : qui est inscrit, rôle, bannissement. L'inscription est libre ; la suppression se fait dans Supabase. */
export function AdminUsers() {
  const { session } = useCurrentUser()
  const users = useUsers()
  const updateUser = useUpdateUser()
  const avatars = useUserAvatars()
  const removeAvatar = useRemoveUserAvatar()
  const avatarsById = new Map((avatars.data ?? []).map((entry) => [entry.id, entry]))
  const [pending, setPending] = useState<PendingChange | null>(null)

  const ask = (change: PendingChange) => {
    updateUser.reset()
    setPending(change)
  }

  if (users.isPending) return <p className="text-base text-ink-soft">Chargement des comptes…</p>
  if (users.error) return <Notice tone="error">{users.error.message}</Notice>

  // Les inscriptions les plus récentes d'abord : ce sont elles qu'on vient contrôler.
  const sortedUsers = [...users.data].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  return (
    <section aria-labelledby="admin-users">
      <h2 id="admin-users" className="text-xl font-semibold">
        {users.data.length} {users.data.length > 1 ? 'comptes' : 'compte'}
      </h2>

      {removeAvatar.error && (
        <div className="mt-3">
          <Notice tone="error">{removeAvatar.error.message}</Notice>
        </div>
      )}

      <ul className="mt-3 divide-y divide-line border-y border-line">
        {sortedUsers.map((user) => {
          const isMe = user.id === session.userId
          const isAdmin = user.role === 'admin'
          const lastSeen = formatInstantDay(user.last_sign_in_at)
          const joined = formatInstantDay(user.created_at)
          const avatar = avatarsById.get(user.id)
          const hasAvatar = Boolean(avatar?.avatar_path || avatar?.avatar_icon)
          return (
            <li key={user.id} className="py-4">
              <div className="flex items-center gap-3">
                <Avatar person={{ display_name: user.display_name, ...avatar }} />
                <p className="min-w-0 text-lg font-semibold">
                  {user.display_name}
                  {isMe && <span className="font-normal text-ink-soft"> (toi)</span>}
                </p>
              </div>
              <p className="text-base break-all text-ink-soft">{user.email}</p>
              <p className="mt-1 text-base">
                {isAdmin ? 'Administrateur' : 'Membre'}
                {' · '}
                <span className={user.is_active ? '' : 'font-semibold text-danger'}>
                  {user.is_active ? 'Actif' : 'Banni'}
                </span>
                <span className="text-ink-soft">
                  {joined && ` · inscrit le ${joined}`}
                  {' · '}
                  {lastSeen ? `dernière connexion le ${lastSeen}` : 'jamais connecté'}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={ACTION}
                  onClick={() =>
                    ask({
                      user,
                      changes: { role: isAdmin ? 'user' : 'admin' },
                      title: isAdmin ? 'Retirer le rôle d\u2019administrateur ?' : 'Nommer administrateur ?',
                      confirmLabel: isAdmin ? 'Retirer le rôle' : 'Nommer administrateur',
                      message: isAdmin
                        ? `${user.display_name} ne pourra plus modérer ni accéder à l'administration.`
                        : `${user.display_name} pourra tout modifier et tout supprimer, y compris les autres comptes.`,
                    })
                  }
                >
                  {isAdmin ? 'Retirer le rôle admin' : 'Nommer admin'}
                </button>
                <button
                  type="button"
                  className={ACTION}
                  onClick={() =>
                    ask({
                      user,
                      changes: { is_active: !user.is_active },
                      title: user.is_active ? 'Bannir ce compte ?' : 'Rétablir ce compte ?',
                      confirmLabel: user.is_active ? 'Bannir le compte' : 'Rétablir le compte',
                      message: user.is_active
                        ? `${user.display_name} (${user.email}) ne verra plus rien et ne pourra plus rien ajouter. Ses spots, photos et updates restent en place : tu peux les supprimer séparément.`
                        : `${user.display_name} (${user.email}) pourra de nouveau consulter et ajouter des spots.`,
                    })
                  }
                >
                  {user.is_active ? 'Bannir' : 'Rétablir'}
                </button>
                {hasAvatar && !isMe && (
                  <button
                    type="button"
                    className={ACTION}
                    disabled={removeAvatar.isPending}
                    onClick={() => removeAvatar.mutate({ userId: user.id, avatarPath: avatar?.avatar_path ?? null })}
                  >
                    Retirer l'avatar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 text-base text-ink-soft">
        Chacun crée son compte depuis l'écran de connexion et accède aussitôt aux spots. Tu peux bannir un compte ici.
        La suppression d'un compte et la remise d'un mot de passe se font dans le tableau de bord Supabase : voir
        docs/comptes.md.
      </p>

      {pending && (
        <ConfirmDialog
          title={pending.title}
          confirmLabel={pending.confirmLabel}
          busy={updateUser.isPending}
          error={updateUser.error?.message}
          onConfirm={() =>
            updateUser.mutate({ userId: pending.user.id, changes: pending.changes }, { onSuccess: () => setPending(null) })
          }
          onCancel={() => setPending(null)}
        >
          {pending.message}
        </ConfirmDialog>
      )}
    </section>
  )
}
