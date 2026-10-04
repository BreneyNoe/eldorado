import type { ReactNode } from 'react'

interface NoticeProps {
  tone: 'error' | 'success'
  children: ReactNode
}

/**
 * Message de résultat d'une action. Annoncé par les lecteurs d'écran :
 * tout de suite pour une erreur, à la prochaine pause pour un succès.
 */
export function Notice({ tone, children }: NoticeProps) {
  const isError = tone === 'error'
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`rounded-xl px-4 py-3 text-base font-medium ${
        isError ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok'
      }`}
    >
      {children}
    </p>
  )
}
