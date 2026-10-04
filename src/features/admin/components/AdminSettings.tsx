import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Notice } from '@/components/Notice'
import { TextField } from '@/components/TextField'
import {
  useOrphanFiles,
  useRemoveOrphanFiles,
  useSaveSetting,
  useSetting,
  useStorageReport,
} from '@/features/admin/hooks/useAdmin'
import {
  formatBytes,
  quotaPercent,
  STORAGE_QUOTA_BYTES,
  validatePhotoLimit,
  validateRadius,
} from '@/features/admin/logic/adminRules'
import { MAX_PHOTOS_SETTING_KEY } from '@/features/photos/hooks/useMaxPhotosPerSpot'
import { GEO_SETTINGS, IMAGE_SETTINGS } from '@/config/constants'

/** Réglages globaux et état du stockage. */
export function AdminSettings() {
  return (
    <div className="space-y-10">
      <NumberSetting
        settingKey="duplicate_radius_m"
        id="admin-radius"
        title="Détection des doublons"
        description="À la création d'un spot, l'application signale les spots existants dans ce rayon."
        label="Rayon, en mètres"
        name="duplicate_radius"
        fallback={GEO_SETTINGS.fallbackDuplicateRadiusM}
        validate={validateRadius}
        saveLabel="Enregistrer le rayon"
        savedMessage={(value) => `Rayon enregistré : ${value} m.`}
      />
      <NumberSetting
        settingKey={MAX_PHOTOS_SETTING_KEY}
        id="admin-photo-limit"
        title="Photos par spot"
        description="Nombre maximal de photos qu'un spot peut recevoir. Baisser la limite ne supprime aucune photo existante."
        label="Nombre maximal de photos"
        name="max_photos"
        fallback={IMAGE_SETTINGS.fallbackMaxPhotosPerSpot}
        validate={validatePhotoLimit}
        saveLabel="Enregistrer la limite"
        savedMessage={(value) => `Limite enregistrée : ${value} photo${value > 1 ? 's' : ''} par spot.`}
      />
      <StorageStatus />
      <section aria-labelledby="admin-diagnostic">
        <h2 id="admin-diagnostic" className="text-xl font-semibold">
          Diagnostic
        </h2>
        <p className="mt-1 text-base text-ink-soft">Vérifie que l'application joint bien Supabase.</p>
        <Link
          to="/diagnostic"
          className="mt-3 flex h-12 items-center justify-center rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
        >
          Ouvrir le diagnostic
        </Link>
      </section>
    </div>
  )
}

interface NumberSettingProps {
  /** Clé du réglage dans la table app_settings. */
  settingKey: string
  /** Identifiant de la section dans la page. */
  id: string
  title: string
  description: string
  label: string
  /** Nom du champ de saisie. */
  name: string
  /** Valeur affichée tant que le réglage n'existe pas en base. */
  fallback: number
  validate: (value: string) => string | null
  saveLabel: string
  /** Message de confirmation, à partir de la valeur enregistrée. */
  savedMessage: (value: number) => string
}

/** Un réglage global fait d'un nombre entier : lecture, saisie, validation, enregistrement. */
function NumberSetting(props: NumberSettingProps) {
  const setting = useSetting(props.settingKey)
  const save = useSaveSetting(props.settingKey)
  // null : l'utilisateur n'a rien saisi, on affiche la valeur enregistrée.
  const [input, setInput] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const saved = typeof setting.data === 'number' ? setting.data : props.fallback
  const value = input ?? String(saved)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const invalid = props.validate(value)
    setProblem(invalid)
    if (invalid) return
    save.mutate(Number(value.trim()), { onSuccess: () => setInput(null) })
  }

  return (
    <section aria-labelledby={props.id}>
      <h2 id={props.id} className="text-xl font-semibold">
        {props.title}
      </h2>
      <p className="mt-1 text-base text-ink-soft">{props.description}</p>
      {setting.error ? (
        <div className="mt-3">
          <Notice tone="error">{setting.error.message}</Notice>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-3">
          <TextField
            label={props.label}
            name={props.name}
            type="text"
            inputMode="numeric"
            value={value}
            disabled={setting.isPending}
            onChange={(event) => {
              setInput(event.target.value)
              setProblem(null)
              if (save.isSuccess || save.isError) save.reset()
            }}
            error={problem ?? save.error?.message}
          />
          {save.isSuccess && input === null && <Notice tone="success">{props.savedMessage(saved)}</Notice>}
          <Button type="submit" variant="secondary" loading={save.isPending} disabled={input === null || value.trim() === String(saved)}>
            {props.saveLabel}
          </Button>
        </form>
      )}
    </section>
  )
}

function StorageStatus() {
  const report = useStorageReport()
  const orphans = useOrphanFiles()
  const removeOrphans = useRemoveOrphanFiles()
  const [confirming, setConfirming] = useState(false)
  const [removedCount, setRemovedCount] = useState<number | null>(null)

  const orphanFiles = orphans.data ?? []
  const orphanBytes = orphanFiles.reduce((total, file) => total + Number(file.size_bytes ?? 0), 0)

  return (
    <section aria-labelledby="admin-storage">
      <h2 id="admin-storage" className="text-xl font-semibold">
        Stockage des photos
      </h2>

      {report.error ? (
        <div className="mt-3">
          <Notice tone="error">{report.error.message}</Notice>
        </div>
      ) : report.isPending ? (
        <p className="mt-2 text-base text-ink-soft">Calcul de l'espace utilisé…</p>
      ) : (
        <div className="mt-3">
          <p className="text-lg">
            <span className="font-semibold">{formatBytes(Number(report.data.file_bytes))}</span> utilisés sur{' '}
            {formatBytes(STORAGE_QUOTA_BYTES)} ({quotaPercent(Number(report.data.file_bytes))} %)
          </p>
          <div
            role="progressbar"
            aria-label="Espace de stockage utilisé"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={quotaPercent(Number(report.data.file_bytes))}
            className="mt-2 h-3 overflow-hidden rounded-full bg-mist"
          >
            <div
              className={`h-full rounded-full ${quotaPercent(Number(report.data.file_bytes)) >= 80 ? 'bg-danger' : 'bg-ok'}`}
              style={{ width: `${quotaPercent(Number(report.data.file_bytes))}%` }}
            />
          </div>
          <p className="mt-2 text-base text-ink-soft">
            {report.data.photo_count} {Number(report.data.photo_count) > 1 ? 'photos' : 'photo'} · {report.data.file_count}{' '}
            {Number(report.data.file_count) > 1 ? 'fichiers' : 'fichier'} (deux par photo)
          </p>
        </div>
      )}

      <h3 className="mt-6 text-lg font-semibold">Fichiers orphelins</h3>
      <p className="mt-1 text-base text-ink-soft">
        Fichiers qu'aucune photo n'utilise, laissés par un envoi ou une suppression interrompus. Ceux de moins d'une
        heure sont ignorés.
      </p>
      {orphans.error ? (
        <div className="mt-3">
          <Notice tone="error">{orphans.error.message}</Notice>
        </div>
      ) : orphans.isPending ? (
        <p className="mt-2 text-base text-ink-soft">Recherche en cours…</p>
      ) : orphanFiles.length === 0 ? (
        <p className="mt-2 text-lg">{removedCount !== null ? `${removedCount} ${removedCount > 1 ? 'fichiers supprimés' : 'fichier supprimé'}. ` : ''}Aucun fichier orphelin.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-lg">
            {orphanFiles.length} {orphanFiles.length > 1 ? 'fichiers' : 'fichier'}, soit {formatBytes(orphanBytes)}.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              removeOrphans.reset()
              setConfirming(true)
            }}
          >
            Supprimer les fichiers orphelins
          </Button>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Supprimer les fichiers orphelins ?"
          confirmLabel="Supprimer ces fichiers"
          busy={removeOrphans.isPending}
          error={removeOrphans.error?.message}
          onConfirm={() =>
            removeOrphans.mutate(
              orphanFiles.map((file) => file.name),
              {
                onSuccess: (count) => {
                  setRemovedCount(typeof count === 'number' ? count : orphanFiles.length)
                  setConfirming(false)
                },
              },
            )
          }
          onCancel={() => setConfirming(false)}
        >
          {orphanFiles.length} {orphanFiles.length > 1 ? 'fichiers seront supprimés' : 'fichier sera supprimé'} du stockage.
          Aucune photo visible dans l'application n'est concernée.
        </ConfirmDialog>
      )}
    </section>
  )
}
