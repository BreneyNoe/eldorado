import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, LoaderCircle } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Notice } from '@/components/Notice'
import { AVATAR_SETTINGS } from '@/config/constants'
import { useSaveAvatar } from '@/features/auth/hooks/useAuthActions'
import { compressImage } from '@/features/photos/processing/compressImage'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { AVATAR_COLOR_CHOICES } from '@/lib/avatar'
import { toAppError } from '@/lib/errors'
import type { Profile } from '@/types/models'

/** Icônes proposées comme avatar : celles des types de spots, et quelques autres. */
const ICON_CHOICES = [
  'trees',
  'mountain',
  'tent',
  'flower',
  'bird',
  'footprints',
  'game-icons:fishing',
  'boxicons:swimming',
  'game-icons:castle-ruins',
  'spots:ride',
  'camera',
  'fluent-emoji-high-contrast:zany-face',
]

interface AvatarEditorProps {
  profile: Profile
}

/**
 * Choix de l'avatar : une photo, recadrée en carré et allégée sur
 * l'appareil avant l'envoi, ou une icône sur un fond de la couleur voulue. Sans l'une ni l'autre, c'est
 * l'initiale du nom qui s'affiche.
 */
export function AvatarEditor({ profile }: AvatarEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const save = useSaveAvatar(profile.id, profile.avatar_path)
  const [preparing, setPreparing] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const busy = preparing || save.isPending
  const hasAvatar = Boolean(profile.avatar_path || profile.avatar_icon)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Vide le champ : choisir à nouveau le même fichier doit redéclencher l'événement.
    event.target.value = ''
    if (!file) return

    setProblem(null)
    save.reset()
    setPreparing(true)
    try {
      const { blob } = await compressImage(file, AVATAR_SETTINGS.size, AVATAR_SETTINGS.quality, { square: true })
      save.mutate({ photo: blob })
    } catch (caught) {
      setProblem(toAppError(caught).message)
    } finally {
      setPreparing(false)
    }
  }

  function chooseIcon(icon: string | null) {
    setProblem(null)
    save.mutate({ icon })
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Photo de profil</h2>

      <div className="flex flex-col items-center gap-4">
        <Avatar person={profile} size="lg" />
        <div className="w-full space-y-2">
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFile} data-testid="avatar-input" />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mist text-base font-semibold text-ink active:bg-line disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Camera className="size-5" aria-hidden="true" />
            )}
            {profile.avatar_path ? 'Changer la photo' : 'Choisir une photo'}
          </button>
          {hasAvatar && (
            <button
              type="button"
              disabled={busy}
              onClick={() => chooseIcon(null)}
              className="h-11 w-full rounded-xl text-base text-ink-soft underline underline-offset-4 disabled:opacity-60"
            >
              {profile.avatar_path ? 'Retirer la photo' : "Retirer l'icône"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-5 text-base font-medium">Ou choisis une icône</p>
      <div role="group" aria-label="Icônes de profil" className="mt-2 grid grid-cols-6 gap-2">
        {ICON_CHOICES.map((icon) => {
          const selected = !profile.avatar_path && profile.avatar_icon === icon
          return (
            <button
              key={icon}
              type="button"
              disabled={busy}
              onClick={() => chooseIcon(icon)}
              aria-label={`Icône ${icon.split(':').pop()}`}
              aria-pressed={selected}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 disabled:opacity-60 ${
                selected ? 'border-ink bg-mist' : 'border-line bg-paper active:bg-mist'
              }`}
            >
              <SpotIcon name={icon} className="size-6" />
            </button>
          )
        })}
      </div>

      <p className="mt-5 text-base font-medium">Couleur du fond</p>
      <div role="group" aria-label="Couleur du fond" className="mt-2 grid grid-cols-7 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => save.mutate({ color: null })}
          aria-label="Couleur automatique"
          aria-pressed={!profile.avatar_color}
          className={`flex aspect-square items-center justify-center rounded-full border-2 text-sm font-semibold disabled:opacity-60 ${
            profile.avatar_color ? 'border-line bg-paper text-ink-soft' : 'border-ink bg-mist text-ink'
          }`}
        >
          Auto
        </button>
        {AVATAR_COLOR_CHOICES.map((color) => {
          const selected = profile.avatar_color?.toLowerCase() === color.toLowerCase()
          return (
            <button
              key={color}
              type="button"
              disabled={busy}
              onClick={() => save.mutate({ color })}
              aria-label={`Couleur ${color}`}
              aria-pressed={selected}
              className={`aspect-square rounded-full border-2 disabled:opacity-60 ${selected ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-line'}`}
              style={{ backgroundColor: color }}
            />
          )
        })}
      </div>
      {profile.avatar_path && (
        <p className="mt-2 text-base text-ink-soft">La couleur s'affiche derrière l'icône ou l'initiale, pas derrière une photo.</p>
      )}

      {(problem || save.error) && (
        <div className="mt-3">
          <Notice tone="error">{problem ?? save.error?.message}</Notice>
        </div>
      )}
      <p className="mt-3 text-base text-ink-soft">Les autres membres voient ton avatar à côté de ton nom.</p>
    </div>
  )
}
