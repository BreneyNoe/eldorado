import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Notice } from '@/components/Notice'
import type { AdminPhoto } from '@/features/admin/api/adminApi'
import { useAllPhotos, useRefreshModeration } from '@/features/admin/hooks/useAdmin'
import { deleteSpotPhoto } from '@/features/spots/api/spotDetailApi'
import type { AppError } from '@/lib/errors'
import { formatInstantDay } from '@/lib/formatDate'
import { publicPhotoUrl } from '@/lib/storageUrls'

/** Toutes les photos, des plus récentes aux plus anciennes, avec leur suppression. */
export function AdminPhotos() {
  const photos = useAllPhotos()
  const refresh = useRefreshModeration()
  const remove = useMutation<void, AppError, AdminPhoto>({ mutationFn: (photo) => deleteSpotPhoto(photo), onSuccess: refresh })
  const [toDelete, setToDelete] = useState<AdminPhoto | null>(null)

  if (photos.isPending) return <p className="text-base text-ink-soft">Chargement des photos…</p>
  if (photos.error) return <Notice tone="error">{photos.error.message}</Notice>

  return (
    <section aria-labelledby="admin-photos">
      <h2 id="admin-photos" className="text-xl font-semibold">
        Photos récentes
      </h2>
      <p className="mt-1 text-base text-ink-soft">Touche une photo pour la supprimer.</p>

      {photos.items.length === 0 ? (
        <p className="mt-4 text-base text-ink-soft">Aucune photo pour l'instant.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {photos.items.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => {
                  remove.reset()
                  setToDelete(photo)
                }}
                aria-label={`Supprimer une photo de ${photo.spot?.name ?? 'spot inconnu'}`}
                className="block w-full text-left"
              >
                <span className="block aspect-square overflow-hidden rounded-xl bg-mist">
                  <img
                    src={publicPhotoUrl(photo.path_thumb) ?? undefined}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </span>
                <span className="mt-1 block truncate text-sm font-semibold">{photo.spot?.name ?? 'Spot inconnu'}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {photo.uploader?.display_name ?? 'utilisateur supprimé'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {photos.hasMore && (
        <button
          type="button"
          onClick={photos.loadMore}
          disabled={photos.isLoadingMore}
          className="mt-4 h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line disabled:opacity-60"
        >
          {photos.isLoadingMore ? 'Chargement…' : 'Afficher les photos plus anciennes'}
        </button>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Supprimer cette photo ?"
          confirmLabel="Supprimer la photo"
          busy={remove.isPending}
          error={remove.error?.message}
          onConfirm={() => remove.mutate(toDelete, { onSuccess: () => setToDelete(null) })}
          onCancel={() => setToDelete(null)}
        >
          Photo de « {toDelete.spot?.name ?? 'spot inconnu'} », ajoutée par{' '}
          {toDelete.uploader?.display_name ?? 'un utilisateur supprimé'}
          {formatInstantDay(toDelete.created_at) && ` le ${formatInstantDay(toDelete.created_at)}`}. Cette action est
          définitive.
        </ConfirmDialog>
      )}
    </section>
  )
}
