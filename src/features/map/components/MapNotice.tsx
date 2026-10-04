import type { ReactNode } from 'react'

interface MapNoticeProps {
  tone?: 'info' | 'error'
  children: ReactNode
  /** Bouton d'action à droite du message ("Réessayer", "Fermer"). */
  action?: { label: string; onClick: () => void }
}

/** Message flottant en haut de la carte : chargement, erreur, information. */
export function MapNotice({ tone = 'info', children, action }: MapNoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex max-w-full items-center gap-3 rounded-2xl bg-paper py-2.5 pr-2.5 pl-4 text-base shadow-[0_2px_8px_rgb(22_35_59/0.28)]"
    >
      <span className={tone === 'error' ? 'text-danger' : 'text-ink'}>{children}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-xl bg-mist px-3 py-2 font-semibold text-ink active:bg-line"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
