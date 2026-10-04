import { LoaderCircle } from 'lucide-react'

/** Écran d'attente affiché le temps de savoir si quelqu'un est connecté. */
export function FullScreenLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-ink text-paper" role="status">
      <LoaderCircle className="size-9 animate-spin text-blaze motion-reduce:animate-none" aria-hidden="true" />
      <p className="text-lg text-paper/80">{label}</p>
    </div>
  )
}
