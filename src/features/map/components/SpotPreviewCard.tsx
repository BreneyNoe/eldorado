import { X } from 'lucide-react'
import { Link } from 'react-router'
import { SpotTypeBadge } from '@/features/spots/components/SpotTypeBadge'
import { publicPhotoUrl } from '@/lib/storageUrls'
import type { SpotLight, SpotSubtype, SpotType } from '@/types/models'

interface SpotPreviewCardProps {
  spot: SpotLight
  type: SpotType | undefined
  subtype?: SpotSubtype | null
  onClose: () => void
}

/** Aperçu du spot sélectionné sur la carte, avec l'accès à sa fiche complète. */
export function SpotPreviewCard({ spot, type, subtype, onClose }: SpotPreviewCardProps) {
  const thumbUrl = publicPhotoUrl(spot.cover_thumb_path)

  return (
    <section
      aria-label={`Spot sélectionné : ${spot.name}`}
      className="w-full rounded-2xl bg-paper p-4 shadow-[0_4px_16px_rgb(22_35_59/0.28)]"
    >
      <div className="flex items-start justify-between gap-3">
        <SpotTypeBadge type={type} subtype={subtype} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-mist"
        >
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-16 shrink-0 rounded-xl bg-mist object-cover"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-2xl leading-tight font-semibold">{spot.name}</h2>
          <p className="mt-1 line-clamp-2 text-base text-ink-soft">
            {spot.address ?? `${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}`}
          </p>
        </div>
      </div>
      <Link
        to={`/spot/${spot.id}`}
        className="mt-3 flex h-12 items-center justify-center rounded-xl bg-blaze text-base font-semibold text-ink active:bg-blaze-deep"
      >
        Voir la fiche
      </Link>
    </section>
  )
}
