import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/Button'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  /** Libellé du bouton qui confirme ("Supprimer la photo"). */
  confirmLabel: string
  /** Vrai pendant que l'action est en cours. */
  busy?: boolean
  /** Message d'erreur si l'action a échoué. */
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Demande de confirmation avant une action irréversible.
 * S'affiche par-dessus tout le reste ; "Échap" ou "Annuler" la ferme.
 */
export function ConfirmDialog({ title, children, confirmLabel, busy = false, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Le curseur part sur "Annuler" : une touche Entrée malheureuse ne supprime rien.
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="safe-bottom w-full max-w-md rounded-t-3xl bg-paper sm:rounded-3xl"
      >
        <div className="space-y-4 px-6 pt-6 pb-6">
          <h2 id="confirm-dialog-title" className="text-2xl leading-tight font-semibold">
            {title}
          </h2>
          <div className="text-lg text-ink-soft">{children}</div>
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-base font-medium text-danger">
              {error}
            </p>
          )}
          <div className="space-y-3 pt-1">
            <Button variant="danger" loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
            <Button ref={cancelRef} variant="secondary" disabled={busy} onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
