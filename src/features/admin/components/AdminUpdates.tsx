import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Notice } from '@/components/Notice'
import type { AdminUpdate } from '@/features/admin/api/adminApi'
import { useAllUpdates, useRefreshModeration } from '@/features/admin/hooks/useAdmin'
import { deleteSpotUpdate } from '@/features/updates/api/updatesApi'
import type { AppError } from '@/lib/errors'
import { formatInstantDateTime } from '@/lib/formatDate'

/** Tous les updates, des plus récents aux plus anciens, avec leur suppression. */
export function AdminUpdates() {
  const updates = useAllUpdates()
  const refresh = useRefreshModeration()
  const remove = useMutation<void, AppError, string>({ mutationFn: (id) => deleteSpotUpdate(id), onSuccess: refresh })
  const [toDelete, setToDelete] = useState<AdminUpdate | null>(null)

  if (updates.isPending) return <p className="text-base text-ink-soft">Chargement des updates…</p>
  if (updates.error) return <Notice tone="error">{updates.error.message}</Notice>

  return (
    <section aria-labelledby="admin-updates">
      <h2 id="admin-updates" className="text-xl font-semibold">
        Updates récents
      </h2>

      {updates.items.length === 0 ? (
        <p className="mt-4 text-base text-ink-soft">Aucun update pour l'instant.</p>
      ) : (
        <ol className="mt-3 divide-y divide-line border-y border-line">
          {updates.items.map((update) => (
            <li key={update.id} className="py-4">
              <p className="text-base">
                <span className="font-semibold">{formatInstantDateTime(update.created_at)}</span>
                <span className="text-ink-soft"> · {update.author?.display_name ?? 'utilisateur supprimé'} · </span>
                <Link to={`/spot/${update.spot_id}`} className="font-semibold underline underline-offset-4">
                  {update.spot?.name ?? 'Spot inconnu'}
                </Link>
              </p>
              <p className="mt-1 text-lg break-words whitespace-pre-line">{update.body}</p>
              <button
                type="button"
                onClick={() => {
                  remove.reset()
                  setToDelete(update)
                }}
                className="mt-1 -ml-3 flex h-11 items-center rounded-lg px-3 text-base font-semibold text-danger active:bg-mist"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ol>
      )}

      {updates.hasMore && (
        <button
          type="button"
          onClick={updates.loadMore}
          disabled={updates.isLoadingMore}
          className="mt-4 h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line disabled:opacity-60"
        >
          {updates.isLoadingMore ? 'Chargement…' : 'Afficher les updates plus anciens'}
        </button>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Supprimer cet update ?"
          confirmLabel="Supprimer l'update"
          busy={remove.isPending}
          error={remove.error?.message}
          onConfirm={() => remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
          onCancel={() => setToDelete(null)}
        >
          Update de {toDelete.author?.display_name ?? 'un utilisateur supprimé'} sur « {toDelete.spot?.name ?? 'spot inconnu'} ».
          Cette action est définitive.
        </ConfirmDialog>
      )}
    </section>
  )
}
