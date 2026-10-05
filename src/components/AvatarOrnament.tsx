import { useId } from 'react'
import type { AvatarRankId } from '@/lib/avatar'

interface AvatarOrnamentProps {
  rank: AvatarRankId
}

// Le dessin tient dans un carré de 132 unités : l'avatar occupe le disque
// central de rayon 50, l'ornement l'anneau qui l'entoure (rayons 51 à 64).
const SIZE = 132
const CENTER = SIZE / 2
const RING_RADIUS = 57.5
const RING_WIDTH = 13

/** Point de l'anneau à un angle donné (0 = en haut, sens des aiguilles d'une montre). */
function onRing(angleDegrees: number, radius = RING_RADIUS): { x: number; y: number } {
  const angle = ((angleDegrees - 90) * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) }
}

/** Ligne ondulée qui fait le tour de l'anneau : filigrane d'or, tresse d'argent. */
function wavePath(waves: number, amplitude: number, phaseDegrees = 0): string {
  const steps = 240
  let path = ''
  for (let step = 0; step <= steps; step += 1) {
    const angle = (step / steps) * 360
    const radius = RING_RADIUS + amplitude * Math.sin(((angle * waves + phaseDegrees) * Math.PI) / 180)
    const { x, y } = onRing(angle, radius)
    path += `${step === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return `${path}Z`
}

const GOLD_FILIGREE = [wavePath(8, 3.4), wavePath(8, 3.4, 180)]
const SILVER_BRAID = [wavePath(6, 4.2), wavePath(6, 4.2, 180)]
const EIGHT_AROUND = [0, 45, 90, 135, 180, 225, 270, 315]

/**
 * Ornement qui entoure un avatar, selon le rang de la personne :
 *   - bronze : un anneau de corde ;
 *   - argent : un jonc poli, serti de perles ;
 *   - or : du bois, un filigrane d'or et des cabochons d'ambre ;
 *   - platine : un anneau sombre, une tresse d'argent et des rubis.
 *
 * Dessin vectoriel, net à toutes les tailles. Il se pose par-dessus
 * l'avatar, en débordant un peu autour, sans rien décaler dans la page.
 */
export function AvatarOrnament({ rank }: AvatarOrnamentProps) {
  // Chaque dessin a ses propres dégradés : leurs noms doivent être uniques dans la page.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ring = { cx: CENTER, cy: CENTER, r: RING_RADIUS, fill: 'none' }

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      data-rank={rank}
      className="pointer-events-none absolute -inset-[16%] size-[132%] max-w-none"
    >
      <defs>
        <linearGradient id={`${id}-silver`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#aeb6bf" />
          <stop offset="0.6" stopColor="#f3f5f7" />
          <stop offset="1" stopColor="#8b949e" />
        </linearGradient>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6040" />
          <stop offset="0.5" stopColor="#5f3f27" />
          <stop offset="1" stopColor="#7a5334" />
        </linearGradient>
        <radialGradient id={`${id}-pearl`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d0d6" />
        </radialGradient>
        <radialGradient id={`${id}-amber`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#f0a020" />
          <stop offset="1" stopColor="#a85d08" />
        </radialGradient>
        <radialGradient id={`${id}-ruby`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff8a96" />
          <stop offset="0.5" stopColor="#d81e3a" />
          <stop offset="1" stopColor="#7d0b1e" />
        </radialGradient>
      </defs>

      {rank === 'bronze' && (
        <>
          <circle {...ring} stroke="#4b3c2a" strokeWidth={RING_WIDTH} />
          <circle {...ring} stroke="#7d6a50" strokeWidth={RING_WIDTH - 2.5} />
          {/* Les torons de la corde : des tirets obliques, en deux brins décalés. */}
          <circle {...ring} r={RING_RADIUS + 2.4} stroke="#a08a6a" strokeWidth="3.6" strokeDasharray="4.2 3" />
          <circle {...ring} r={RING_RADIUS - 2.4} stroke="#5c4b36" strokeWidth="3.6" strokeDasharray="4.2 3" strokeDashoffset="3.6" />
          {/* Les ligatures, sur les côtés et en bas. */}
          {[90, 270, 150, 210].map((angle) => {
            const { x, y } = onRing(angle)
            return (
              <rect
                key={angle}
                x={x - 4}
                y={y - 8}
                width="8"
                height="16"
                rx="3"
                fill="#6a583f"
                stroke="#43361f"
                strokeWidth="1"
                transform={`rotate(${angle} ${x} ${y})`}
              />
            )
          })}
        </>
      )}

      {rank === 'silver' && (
        <>
          <circle {...ring} stroke="#6f7882" strokeWidth={RING_WIDTH - 4} />
          <circle {...ring} stroke={`url(#${id}-silver)`} strokeWidth={RING_WIDTH - 5.5} />
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const { x, y } = onRing(angle)
            return <circle key={angle} cx={x} cy={y} r="6.2" fill={`url(#${id}-pearl)`} stroke="#7d8791" strokeWidth="1.1" />
          })}
        </>
      )}

      {rank === 'gold' && (
        <>
          <circle {...ring} stroke="#3d2816" strokeWidth={RING_WIDTH} />
          <circle {...ring} stroke={`url(#${id}-wood)`} strokeWidth={RING_WIDTH - 1.6} />
          {GOLD_FILIGREE.map((path) => (
            <path key={path.slice(0, 24)} d={path} fill="none" stroke="#e8b930" strokeWidth="1.1" />
          ))}
          {EIGHT_AROUND.map((angle) => {
            const { x, y } = onRing(angle)
            // Des perles sur les côtés, de l'ambre ailleurs.
            const gem = angle === 90 || angle === 270 ? 'pearl' : 'amber'
            return (
              <ellipse
                key={angle}
                cx={x}
                cy={y}
                rx="6.6"
                ry="4.8"
                fill={`url(#${id}-${gem})`}
                stroke="#e8b930"
                strokeWidth="1.2"
                transform={`rotate(${angle} ${x} ${y})`}
              />
            )
          })}
        </>
      )}

      {rank === 'platinum' && (
        <>
          <circle {...ring} stroke="#0e0e10" strokeWidth={RING_WIDTH} />
          <circle {...ring} stroke="#2c2c31" strokeWidth={RING_WIDTH - 1.6} />
          {SILVER_BRAID.map((path) => (
            <path key={path.slice(0, 24)} d={path} fill="none" stroke={`url(#${id}-silver)`} strokeWidth="2.2" />
          ))}
          {EIGHT_AROUND.map((angle) => {
            const { x, y } = onRing(angle)
            // De plus gros rubis aux quatre points cardinaux.
            const radius = angle % 90 === 0 ? 6.4 : 4.6
            return <circle key={angle} cx={x} cy={y} r={radius} fill={`url(#${id}-ruby)`} stroke="#d9dee3" strokeWidth="1.3" />
          })}
        </>
      )}
    </svg>
  )
}
