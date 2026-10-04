import { useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import {
  resolveSnap,
  SHEET_PEEK_HEIGHT,
  snapHeights,
  toggleSnap,
  type SheetSnap,
} from '@/components/sheetSnap'

interface BottomSheetProps {
  /** Position actuelle : replié, mi-hauteur ou plein. Pilotée par l'écran parent. */
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  /** Contenu de la poignée (titre du panneau). */
  header: ReactNode
  /** Éléments flottants accrochés au-dessus du panneau : ils montent et descendent avec lui. */
  floating?: ReactNode
  children: ReactNode
}

/** En dessous de ce déplacement (en pixels), un geste sur la poignée est un simple toucher. */
const TAP_SLOP = 6
/** Durée (ms) pendant laquelle un click suivant un glissement est ignoré. */
const DRAG_CLICK_GUARD_MS = 300

/**
 * Panneau glissant du bas de l'écran, à trois positions.
 *
 * Il occupe toute la zone que lui donne son parent et se décale vers le bas
 * pour ne laisser dépasser que la hauteur voulue. Seule la poignée se
 * glisse ; le contenu, lui, défile normalement.
 */
export function BottomSheet({ snap, onSnapChange, header, floating, children }: BottomSheetProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const safeAreaProbeRef = useRef<HTMLDivElement>(null)

  const [available, setAvailable] = useState(0)
  const [safeBottom, setSafeBottom] = useState(0)

  // Mesure de la zone disponible et de la marge de sécurité de l'iPhone,
  // refaite à chaque changement de taille (rotation, clavier...).
  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area) return
    const measure = () => {
      setAvailable(area.clientHeight)
      const probe = safeAreaProbeRef.current
      setSafeBottom(probe ? Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0 : 0)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    return () => observer.disconnect()
  }, [])

  const heights = snapHeights(available, SHEET_PEEK_HEIGHT + safeBottom)
  const visible = heights[snap]
  const hidden = Math.max(available - visible, 0)

  // Tant que la zone n'est pas mesurée (tout premier rendu), le panneau est
  // rangé sous l'écran. Sans cela, il apparaîtrait un instant en pleine
  // hauteur avant de redescendre, en masquant la carte et en interceptant
  // les touchers. Une fois mesuré, il monte à sa place.
  const restingTransform = available > 0 ? `translateY(${hidden}px)` : 'translateY(100%)'

  // --- Glissement de la poignée -----------------------------------------
  const drag = useRef<{
    startY: number
    startVisible: number
    lastY: number
    lastTime: number
    velocity: number
    moved: boolean
  } | null>(null)
  /** Instant où le dernier glissement s'est terminé (horloge des événements du navigateur). */
  const lastDragEndAt = useRef(-Infinity)

  /**
   * Déplace le panneau directement, sans repasser par React : pendant un
   * glissement, c'est ce qui le fait suivre le doigt sans à-coups.
   * Hors glissement, la position vient du rendu normal (attribut style).
   */
  function applyVisible(height: number, animated: boolean) {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.style.transition = animated ? '' : 'none'
    sheet.style.transform = `translateY(${Math.max(available - height, 0)}px)`
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      startY: event.clientY,
      startVisible: visible,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    if (!state) return
    const delta = state.startY - event.clientY // positif quand le doigt monte
    if (Math.abs(delta) > TAP_SLOP) state.moved = true
    if (!state.moved) return

    const elapsed = event.timeStamp - state.lastTime
    if (elapsed > 0) state.velocity = (state.lastY - event.clientY) / elapsed
    state.lastY = event.clientY
    state.lastTime = event.timeStamp

    const height = Math.min(Math.max(state.startVisible + delta, heights.peek), heights.full)
    applyVisible(height, false)
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    drag.current = null
    if (!state || !state.moved) return

    // Selon le navigateur, un "click" suit ou non la fin d'un glissement. On
    // note l'instant : handleClick ignorera un click qui arrive juste après.
    lastDragEndAt.current = event.timeStamp
    const delta = state.startY - event.clientY
    const height = Math.min(Math.max(state.startVisible + delta, heights.peek), heights.full)
    const target = resolveSnap(height, state.velocity, heights)
    applyVisible(heights[target], true)
    if (target !== snap) onSnapChange(target)
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Click produit par la fin d'un glissement : ce n'était pas un toucher.
    if (event.timeStamp - lastDragEndAt.current < DRAG_CLICK_GUARD_MS) return
    onSnapChange(toggleSnap(snap))
  }

  const expanded = snap !== 'peek'

  return (
    // "overflow-clip" et non "overflow-hidden" : une zone "hidden" peut encore
    // défiler quand le navigateur veut montrer un élément qui reçoit le
    // curseur, ce qui décalait tout le panneau. "clip" interdit tout défilement.
    <div ref={areaRef} className="pointer-events-none absolute inset-0 overflow-clip">
      {/* Sonde invisible : sert uniquement à mesurer la marge de sécurité du bas. */}
      <div ref={safeAreaProbeRef} className="safe-bottom invisible absolute" aria-hidden="true" />

      <div
        ref={sheetRef}
        className="pointer-events-auto absolute inset-x-0 top-0 flex h-full flex-col rounded-t-3xl bg-paper shadow-[0_-4px_16px_rgb(22_35_59/0.18)] transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: restingTransform }}
      >
        {floating && (
          <div
            className={`absolute right-3 bottom-full mb-3 flex flex-col items-end gap-3 transition-opacity duration-200 ${
              snap === 'full' ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            {floating}
          </div>
        )}

        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          // Filet de sécurité : si le système interrompt le geste sans prévenir
          // (appel entrant, changement d'application), le glissement se termine quand même.
          onLostPointerCapture={handlePointerEnd}
          onClick={handleClick}
          aria-expanded={expanded}
          className="w-full shrink-0 cursor-grab touch-none rounded-t-3xl px-4 pt-2.5 pb-3 text-left select-none active:cursor-grabbing"
        >
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
          <span className="mt-3 block">{header}</span>
        </button>

        {/* Replié, le contenu est hors de l'écran : on le retire aussi de la navigation au clavier. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" inert={!expanded}>
          {/* La marge du bas compense la partie du panneau qui dépasse sous l'écran,
              pour que les dernières lignes restent atteignables en défilant. */}
          <div style={{ paddingBottom: hidden + safeBottom }}>{children}</div>
        </div>
      </div>
    </div>
  )
}
