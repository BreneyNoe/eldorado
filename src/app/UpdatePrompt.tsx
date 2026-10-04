import { useRegisterSW } from 'virtual:pwa-register/react'

/** Intervalle entre deux recherches de nouvelle version, en millisecondes. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Installe le service worker (ce qui permet l'usage hors ligne) et propose
 * de recharger quand une nouvelle version de l'application a été publiée.
 *
 * La mise à jour n'est jamais appliquée d'office : elle rechargerait la
 * page, ce qui ferait perdre un formulaire en cours.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Une application installée sur l'écran d'accueil reste ouverte longtemps :
      // on vérifie de temps en temps, quand elle est au premier plan et en ligne.
      setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update()
      }, CHECK_INTERVAL_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="alertdialog"
      aria-label="Mise à jour disponible"
      className="safe-bottom safe-x pointer-events-none fixed inset-x-0 bottom-0 z-[70]"
    >
      <div className="pointer-events-auto mx-auto mb-4 flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-paper shadow-[0_4px_16px_rgb(22_35_59/0.4)]">
        <p className="min-w-0 flex-1 text-base">Une nouvelle version est disponible.</p>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="h-11 shrink-0 rounded-xl bg-blaze px-4 text-base font-semibold text-ink active:bg-blaze-deep"
        >
          Mettre à jour
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="h-11 shrink-0 rounded-xl px-2 text-base text-paper/80 underline underline-offset-4"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
