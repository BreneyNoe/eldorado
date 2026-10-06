import { useState } from 'react'
import { Notice } from '@/components/Notice'
import { RefForm, type RefValues } from '@/features/admin/components/RefForm'
import { useSaveRatingCategory, useSaveSpotType, useSaveSubtype } from '@/features/admin/hooks/useAdmin'
import { nextSortOrder, slugifyKey, uniqueKey } from '@/features/admin/logic/adminRules'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { useRatingCategories, useSpotSubtypes, useSpotTypes } from '@/features/spots/hooks/useSpotQueries'
import type { RatingCategory, SpotSubtype, SpotType } from '@/types/models'

/** Ce qui est en cours de création ou de modification. `id` absent : création. */
type Editing =
  | { kind: 'type'; id?: string }
  | { kind: 'category'; typeId: string; id?: string }
  | { kind: 'subtype'; typeId: string; id?: string }

const SMALL = 'h-11 shrink-0 rounded-xl bg-mist px-4 text-base font-semibold text-ink active:bg-line'
const KEY_PROBLEM = 'Le libellé doit contenir au moins deux lettres.'

function byOrder<T extends { sort_order: number; label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, 'fr'))
}

/**
 * Types de spots, avec leurs catégories de notes et leurs sous-catégories.
 *
 * Rien ne se supprime ici : on désactive. Un élément désactivé n'est plus
 * proposé, mais les spots et les notes qui l'utilisent restent intacts.
 */
export function AdminTypes() {
  const types = useSpotTypes()
  const categories = useRatingCategories()
  const subtypes = useSpotSubtypes()
  const saveType = useSaveSpotType()
  const saveCategory = useSaveRatingCategory()
  const saveSubtype = useSaveSubtype()

  const [editing, setEditing] = useState<Editing | null>(null)
  const [keyProblem, setKeyProblem] = useState<string | null>(null)

  const open = (next: Editing) => {
    saveType.reset()
    saveCategory.reset()
    saveSubtype.reset()
    setKeyProblem(null)
    setEditing(next)
  }
  const close = () => setEditing(null)
  const isEditing = (candidate: Editing) => JSON.stringify(editing) === JSON.stringify(candidate)

  if (types.isPending || categories.isPending || subtypes.isPending) {
    return <p className="text-base text-ink-soft">Chargement des types…</p>
  }
  const loadError = types.error ?? categories.error ?? subtypes.error
  if (loadError) return <Notice tone="error">{loadError.message}</Notice>

  const allTypes = byOrder(types.data ?? [])
  const allCategories = categories.data ?? []
  const allSubtypes = subtypes.data ?? []

  function submitType(values: RefValues, existing?: SpotType) {
    const { label, color, icon, sort_order, is_active } = values
    if (existing) {
      saveType.mutate({ id: existing.id, values: { label, color, icon, sort_order, is_active } as never }, { onSuccess: close })
      return
    }
    const key = slugifyKey(label)
    if (!key) return setKeyProblem(KEY_PROBLEM)
    saveType.mutate(
      { values: { key: uniqueKey(key, allTypes.map((type) => type.key)), label, color, icon, sort_order, is_active } },
      { onSuccess: close },
    )
  }

  function submitCategory(values: RefValues, typeId: string, existing?: RatingCategory) {
    const { label, sort_order, is_active } = values
    if (existing) {
      saveCategory.mutate({ id: existing.id, values: { label, sort_order, is_active } as never }, { onSuccess: close })
      return
    }
    const key = slugifyKey(label)
    if (!key) return setKeyProblem(KEY_PROBLEM)
    const taken = allCategories.filter((category) => category.spot_type_id === typeId).map((category) => category.key)
    saveCategory.mutate(
      { values: { spot_type_id: typeId, key: uniqueKey(key, taken), label, sort_order, is_active } },
      { onSuccess: close },
    )
  }

  function submitSubtype(values: RefValues, typeId: string, existing?: SpotSubtype) {
    const { label, icon, sort_order, is_active } = values
    if (existing) {
      saveSubtype.mutate({ id: existing.id, values: { label, icon, sort_order, is_active } as never }, { onSuccess: close })
      return
    }
    const key = slugifyKey(label)
    if (!key) return setKeyProblem(KEY_PROBLEM)
    const taken = allSubtypes.filter((subtype) => subtype.spot_type_id === typeId).map((subtype) => subtype.key)
    saveSubtype.mutate(
      { values: { spot_type_id: typeId, key: uniqueKey(key, taken), label, icon, sort_order, is_active } },
      { onSuccess: close },
    )
  }

  return (
    <section aria-labelledby="admin-types" className="space-y-5">
      <div>
        <h2 id="admin-types" className="text-xl font-semibold">
          Types de spots
        </h2>
        <p className="mt-1 text-base text-ink-soft">
          Un élément désactivé n'est plus proposé à la création. Les spots et les notes qui l'utilisent sont conservés.
        </p>
      </div>

      {allTypes.map((type) => {
        const typeCategories = byOrder(allCategories.filter((category) => category.spot_type_id === type.id))
        const typeSubtypes = byOrder(allSubtypes.filter((subtype) => subtype.spot_type_id === type.id))
        const editType: Editing = { kind: 'type', id: type.id }
        const addCategory: Editing = { kind: 'category', typeId: type.id }
        const addSubtype: Editing = { kind: 'subtype', typeId: type.id }

        return (
          <article key={type.id} aria-label={`Type ${type.label}`} className="rounded-2xl border border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex min-w-0 items-center gap-3 text-xl font-semibold">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-paper"
                  style={{ backgroundColor: type.color }}
                  aria-hidden="true"
                >
                  <SpotIcon name={type.icon} className="size-5" />
                </span>
                <span className="truncate">
                  {type.label}
                  {!type.is_active && <span className="font-normal text-ink-soft"> (désactivé)</span>}
                </span>
              </h3>
              <button type="button" className={SMALL} onClick={() => open(editType)}>
                Modifier
              </button>
            </div>

            {isEditing(editType) && (
              <div className="mt-3">
                <RefForm
                  title={`Modifier le type ${type.label}`}
                  initial={{ label: type.label, color: type.color, icon: type.icon, sort_order: type.sort_order, is_active: type.is_active }}
                  fields={{ color: true, iconSelect: true }}
                  busy={saveType.isPending}
                  error={saveType.error?.message}
                  onSubmit={(values) => submitType(values, type)}
                  onCancel={close}
                />
              </div>
            )}

            <h4 className="mt-5 text-base font-semibold text-ink-soft">Catégories de notes</h4>
            <ul className="mt-1 divide-y divide-line">
              {typeCategories.map((category) => {
                const editCategory: Editing = { kind: 'category', typeId: type.id, id: category.id }
                return (
                  <li key={category.id} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-lg">
                        {category.label}
                        {!category.is_active && <span className="text-ink-soft"> (désactivée)</span>}
                      </p>
                      <button type="button" className={SMALL} onClick={() => open(editCategory)} aria-label={`Modifier la catégorie ${category.label}`}>
                        Modifier
                      </button>
                    </div>
                    {isEditing(editCategory) && (
                      <div className="mt-2">
                        <RefForm
                          title={`Modifier la catégorie ${category.label}`}
                          initial={{ label: category.label, color: '', icon: '', sort_order: category.sort_order, is_active: category.is_active }}
                          fields={{}}
                          busy={saveCategory.isPending}
                          error={saveCategory.error?.message}
                          onSubmit={(values) => submitCategory(values, type.id, category)}
                          onCancel={close}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {isEditing(addCategory) ? (
              <div className="mt-2">
                <RefForm
                  title={`Nouvelle catégorie pour ${type.label}`}
                  initial={{ label: '', color: '', icon: '', sort_order: nextSortOrder(typeCategories), is_active: true }}
                  fields={{}}
                  busy={saveCategory.isPending}
                  error={keyProblem ?? saveCategory.error?.message}
                  onSubmit={(values) => submitCategory(values, type.id)}
                  onCancel={close}
                />
              </div>
            ) : (
              <button type="button" className={`${SMALL} mt-2`} onClick={() => open(addCategory)}>
                Ajouter une catégorie
              </button>
            )}

            <h4 className="mt-5 text-base font-semibold text-ink-soft">Sous-catégories</h4>
            {typeSubtypes.length === 0 && <p className="mt-1 text-base text-ink-soft">Aucune.</p>}
            <ul className="mt-1 divide-y divide-line">
              {typeSubtypes.map((subtype) => {
                const editSubtype: Editing = { kind: 'subtype', typeId: type.id, id: subtype.id }
                return (
                  <li key={subtype.id} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex min-w-0 items-center gap-3 text-lg">
                        <SpotIcon name={subtype.icon} className="size-6 shrink-0" style={{ color: type.color }} />
                        <span className="truncate">
                          {subtype.full_label ?? subtype.label}
                          {!subtype.is_active && <span className="text-ink-soft"> (désactivée)</span>}
                        </span>
                      </p>
                      <button type="button" className={SMALL} onClick={() => open(editSubtype)} aria-label={`Modifier la sous-catégorie ${subtype.label}`}>
                        Modifier
                      </button>
                    </div>
                    {isEditing(editSubtype) && (
                      <div className="mt-2">
                        <RefForm
                          title={`Modifier la sous-catégorie ${subtype.label}`}
                          initial={{ label: subtype.label, color: '', icon: subtype.icon, sort_order: subtype.sort_order, is_active: subtype.is_active }}
                          fields={{ iconText: true }}
                          busy={saveSubtype.isPending}
                          error={saveSubtype.error?.message}
                          onSubmit={(values) => submitSubtype(values, type.id, subtype)}
                          onCancel={close}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {isEditing(addSubtype) ? (
              <div className="mt-2">
                <RefForm
                  title={`Nouvelle sous-catégorie pour ${type.label}`}
                  initial={{ label: '', color: '', icon: '', sort_order: nextSortOrder(typeSubtypes), is_active: true }}
                  fields={{ iconText: true }}
                  busy={saveSubtype.isPending}
                  error={keyProblem ?? saveSubtype.error?.message}
                  onSubmit={(values) => submitSubtype(values, type.id)}
                  onCancel={close}
                />
              </div>
            ) : (
              <button type="button" className={`${SMALL} mt-2`} onClick={() => open(addSubtype)}>
                Ajouter une sous-catégorie
              </button>
            )}
          </article>
        )
      })}

      {isEditing({ kind: 'type' }) ? (
        <RefForm
          title="Nouveau type de spot"
          initial={{ label: '', color: '#0C8599', icon: 'pin', sort_order: nextSortOrder(allTypes), is_active: true }}
          fields={{ color: true, iconSelect: true }}
          busy={saveType.isPending}
          error={keyProblem ?? saveType.error?.message}
          onSubmit={(values) => submitType(values)}
          onCancel={close}
        />
      ) : (
        <button
          type="button"
          onClick={() => open({ kind: 'type' })}
          className="h-14 w-full rounded-xl bg-blaze text-lg font-semibold text-ink active:bg-blaze-deep"
        >
          Ajouter un type
        </button>
      )}
    </section>
  )
}
