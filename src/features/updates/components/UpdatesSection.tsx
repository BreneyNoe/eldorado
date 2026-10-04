import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Notice } from '@/components/Notice'
import { TextAreaField } from '@/components/TextField'
import { TEXT_LIMITS } from '@/config/constants'
import type { SpotUpdateWithAuthor } from '@/features/updates/api/updatesApi'
import {
  useAddSpotUpdate,
  useDeleteSpotUpdate,
  useEditSpotUpdate,
  useSpotUpdates,
} from '@/features/updates/hooks/useSpotUpdates'
import { canDeleteUpdate, canEditUpdate, validateUpdateBody, wasEdited } from '@/features/updates/logic/updateRules'
import { formatInstantDateTime } from '@/lib/formatDate'

interface UpdatesSectionProps {
  spotId: string
  viewer: { userId: string; isAdmin: boolean }
}

/** À partir de ce nombre de caractères, le compteur s'affiche. */
const COUNTER_FROM = TEXT_LIMITS.updateBody.max - 200

const SMALL_ACTION = 'flex h-11 items-center rounded-lg px-3 text-base font-semibold active:bg-mist disabled:opacity-60'

/**
 * Journal d'un spot : ce qui a changé sur place, daté et signé, du plus
 * récent au plus ancien ("L'accès semble fermé", "L'eau était très propre").
 */
export function UpdatesSection({ spotId, viewer }: UpdatesSectionProps) {
  const journal = useSpotUpdates(spotId)
  const addUpdate = useAddSpotUpdate(spotId)
  const editUpdate = useEditSpotUpdate(spotId)
  const deleteUpdate = useDeleteSpotUpdate(spotId)

  const [draft, setDraft] = useState('')
  // Update en cours de modification, et son texte provisoire.
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [toDelete, setToDelete] = useState<SpotUpdateWithAuthor | null>(null)

  const draftProblem = validateUpdateBody(draft)

  function handlePublish(event: FormEvent) {
    event.preventDefault()
    if (draftProblem) return
    addUpdate.mutate(draft, { onSuccess: () => setDraft('') })
  }

  function handleSaveEdit() {
    if (!editing || validateUpdateBody(editing.body)) return
    editUpdate.mutate({ updateId: editing.id, body: editing.body }, { onSuccess: () => setEditing(null) })
  }

  return (
    <section aria-labelledby="spot-updates">
      <h2 id="spot-updates" className="text-xl font-semibold">
        Journal
      </h2>

      <form onSubmit={handlePublish} className="mt-3 space-y-3">
        <TextAreaField
          label="Update"
          name="update_body"
          rows={3}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            if (addUpdate.isError) addUpdate.reset()
          }}
          placeholder="Ex. : le chemin est impraticable depuis l'orage."
          maxLength={TEXT_LIMITS.updateBody.max}
          hint={draft.length >= COUNTER_FROM ? `${draft.length} / ${TEXT_LIMITS.updateBody.max}` : undefined}
        />
        {addUpdate.error && <Notice tone="error">{addUpdate.error.message}</Notice>}
        <Button type="submit" variant="secondary" loading={addUpdate.isPending} disabled={draftProblem !== null}>
          Publier l'update
        </Button>
      </form>

      <div className="mt-5">
        {journal.error ? (
          <div className="space-y-3">
            <p className="text-base text-danger">{journal.error.message}</p>
            <button
              type="button"
              onClick={journal.refetch}
              className="h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
            >
              Réessayer
            </button>
          </div>
        ) : journal.isPending ? (
          <p className="text-base text-ink-soft">Chargement du journal…</p>
        ) : journal.updates.length === 0 ? (
          <p className="text-base text-ink-soft">Aucun update pour l'instant.</p>
        ) : (
          <ol className="divide-y divide-line border-y border-line">
            {journal.updates.map((update) => {
              const isEditing = editing?.id === update.id
              const editable = canEditUpdate(viewer, update)
              const deletable = canDeleteUpdate(viewer, update)

              return (
                <li key={update.id} className="py-4">
                  <p className="text-base">
                    <span className="font-semibold">{formatInstantDateTime(update.created_at)}</span>
                    <span className="text-ink-soft">
                      {' · '}
                      {update.author?.display_name ?? 'utilisateur supprimé'}
                      {wasEdited(update) && ' · modifié'}
                    </span>
                  </p>

                  {isEditing ? (
                    <div className="mt-2 space-y-3">
                      <TextAreaField
                        label="Modifier l'update"
                        rows={3}
                        value={editing.body}
                        onChange={(event) => {
                          setEditing({ id: update.id, body: event.target.value })
                          if (editUpdate.isError) editUpdate.reset()
                        }}
                        maxLength={TEXT_LIMITS.updateBody.max}
                        error={editUpdate.error?.message}
                      />
                      <div className="flex gap-3">
                        <Button
                          loading={editUpdate.isPending}
                          disabled={validateUpdateBody(editing.body) !== null || editing.body.trim() === update.body}
                          onClick={handleSaveEdit}
                        >
                          Enregistrer
                        </Button>
                        <Button variant="secondary" disabled={editUpdate.isPending} onClick={() => setEditing(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Texte affiché tel quel, sauts de ligne compris, jamais interprété comme du HTML. */}
                      <p className="mt-1 text-lg break-words whitespace-pre-line">{update.body}</p>
                      {(editable || deletable) && (
                        <div className="mt-1 -ml-3 flex gap-1">
                          {editable && (
                            <button
                              type="button"
                              onClick={() => {
                                editUpdate.reset()
                                setEditing({ id: update.id, body: update.body })
                              }}
                              className={`${SMALL_ACTION} text-ink-soft`}
                            >
                              Modifier
                            </button>
                          )}
                          {deletable && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteUpdate.reset()
                                setToDelete(update)
                              }}
                              className={`${SMALL_ACTION} text-danger`}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {journal.hasMore && (
          <button
            type="button"
            onClick={journal.loadMore}
            disabled={journal.isLoadingMore}
            className="mt-3 h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line disabled:opacity-60"
          >
            {journal.isLoadingMore ? 'Chargement…' : 'Afficher les updates plus anciens'}
          </button>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Supprimer cet update ?"
          confirmLabel="Supprimer l'update"
          busy={deleteUpdate.isPending}
          error={deleteUpdate.error?.message}
          onConfirm={() => deleteUpdate.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
          onCancel={() => setToDelete(null)}
        >
          Il sera retiré du journal pour tout le monde. Cette action est définitive.
        </ConfirmDialog>
      )}
    </section>
  )
}
