import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Bandeau affiché en haut de tous les écrans tant que l'appareil est hors ligne. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div role="status" className="safe-top safe-x shrink-0 bg-ink text-paper">
      <p className="flex min-h-9 items-center justify-center gap-2 px-4 py-1 text-base font-medium">
        <WifiOff className="size-4 shrink-0" aria-hidden="true" />
        Hors ligne : consultation seule
      </p>
    </div>
  )
}
