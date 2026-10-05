import { useState, type FormEvent } from 'react'
import { ClipboardPaste, MapPin } from 'lucide-react'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { TextField } from '@/components/TextField'
import { resolveMapLink, type ResolvedPosition } from '@/features/spots/api/resolveMapLink'
import { parseLocation } from '@/features/spots/logic/parseLocation'
import { toAppError } from '@/lib/errors'

interface ImportLocationProps {
  /** Position déjà reprise, ou null. */
  value: ResolvedPosition | null
  /** Appelé avec la position trouvée dans le texte collé, ou null quand on la retire. */
  onChange: (position: ResolvedPosition | null) => void
}

/**
 * Reprise d'un point depuis Google Maps : on colle des coordonnées ou un
 * lien de partage, et la création du spot démarre à cet endroit.
 *
 * (Sur iPhone, une application web ne peut pas apparaître dans le menu
 * "Partager" des autres applications : le copier-coller est le seul chemin.)
 */
export function ImportLocation({ value, onChange }: ImportLocationProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /** Position trouvée : on la retient et on referme le formulaire. On reste sur l'écran, pour pouvoir ajouter des photos. */
  function accept(position: ResolvedPosition) {
    onChange(position)
    setOpen(false)
    setText('')
  }

  async function applyText(value: string) {
    setError(null)
    const parsed = parseLocation(value)

    if (parsed.kind === 'coordinates') {
      accept(parsed.position)
      return
    }
    if (parsed.kind === 'unknown') {
      setError('Aucune position reconnue. Colle des coordonnées (par exemple 44.80090, 4.25300) ou un lien Google Maps.')
      return
    }

    // Lien court : la position n'est pas dans le lien, on demande au serveur où il mène.
    setBusy(true)
    try {
      accept(await resolveMapLink(parsed.url))
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  async function pasteFromClipboard() {
    try {
      const pasted = await navigator.clipboard.readText()
      setText(pasted)
      if (pasted.trim()) await applyText(pasted)
    } catch {
      // Lecture refusée ou indisponible : l'utilisateur colle lui-même dans le champ.
      setError('Le presse-papiers n\u2019est pas accessible. Colle le texte dans le champ, puis valide.')
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void applyText(text)
  }

  if (value) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border-2 border-ok/40 bg-ok/10 px-4 py-3">
        <MapPin className="size-6 shrink-0 text-ok" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-base">
          <span className="font-semibold">
            {value.approximate ? 'Position approximative reprise de Google Maps' : 'Position reprise de Google Maps'}
          </span>
          <br />
          {value.approximate
            ? 'Tu placeras le repère au bon endroit à l\u2019étape suivante.'
            : `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
        </p>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="h-11 shrink-0 rounded-xl px-3 text-base font-semibold underline underline-offset-4 active:bg-mist"
        >
          Retirer
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-line text-base font-semibold active:bg-mist"
      >
        <MapPin className="size-5" aria-hidden="true" />
        Partir d'un point Google Maps
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-xl border-2 border-line p-4">
      <p className="text-base text-ink-soft">
        Dans Google Maps, appuie longuement sur un lieu puis touche ses coordonnées pour les copier. Tu peux aussi
        copier le lien d'un lieu avec « Partager ».
      </p>
      <TextField
        label="Coordonnées ou lien"
        name="location_text"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setError(null)
        }}
        placeholder="44.80090, 4.25300"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void pasteFromClipboard()}>
          <ClipboardPaste className="size-5" aria-hidden="true" />
          Coller
        </Button>
        <Button type="submit" loading={busy} disabled={text.trim() === ''}>
          Utiliser
        </Button>
      </div>
    </form>
  )
}
