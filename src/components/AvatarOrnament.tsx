import type { AvatarRankId } from '@/lib/avatar'
import { ORNAMENTS, ornamentSize } from '@/lib/ornaments'

interface AvatarOrnamentProps {
  rank: AvatarRankId
  /** Diamètre de l'avatar entouré, en pixels. */
  faceSize: number
}

/** Ornement d'un rang, centré sur l'avatar qu'il entoure. */
export function AvatarOrnament({ rank, faceSize }: AvatarOrnamentProps) {
  const size = ornamentSize(rank, faceSize)
  return (
    <img
      src={ORNAMENTS[rank].src}
      alt=""
      data-rank={rank}
      draggable={false}
      className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
      style={{ width: size, height: size }}
    />
  )
}
