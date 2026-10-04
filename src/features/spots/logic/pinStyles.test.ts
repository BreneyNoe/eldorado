import { describe, expect, it } from 'vitest'
import { buildPinStyles } from '@/features/spots/logic/pinStyles'
import type { SpotSubtype, SpotType } from '@/types/models'

const dates = { created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' }
const types: SpotType[] = [
  { id: 'type-nature', key: 'nature', label: 'Nature', color: '#2F9E44', icon: 'trees', sort_order: 10, is_active: true, ...dates },
  { id: 'type-ride', key: 'ride', label: 'Ride', color: '#D6336C', icon: 'scooter', sort_order: 50, is_active: true, ...dates },
]
const subtypes: SpotSubtype[] = [
  { id: 'sub-rails', spot_type_id: 'type-ride', key: 'rails', label: 'Rails', icon: 'material-symbols-light:escalator-outline', sort_order: 40, is_active: true, ...dates },
  { id: 'sub-orphan', spot_type_id: 'type-supprime', key: 'x', label: 'X', icon: 'pinhead:flush-curb', sort_order: 10, is_active: true, ...dates },
]

describe('buildPinStyles', () => {
  it('donne à chaque type sa couleur et son icône', () => {
    expect(buildPinStyles(types, [])).toEqual({
      'type-nature': { color: '#2F9E44', icon: 'trees' },
      'type-ride': { color: '#D6336C', icon: 'scooter' },
    })
  })

  it('une sous-catégorie garde la couleur de son type, avec sa propre icône', () => {
    const styles = buildPinStyles(types, subtypes)
    expect(styles['type-ride~sub-rails']).toEqual({ color: '#D6336C', icon: 'material-symbols-light:escalator-outline' })
  })

  it('ignore une sous-catégorie dont le type est inconnu', () => {
    expect(Object.keys(buildPinStyles(types, subtypes))).toEqual(['type-nature', 'type-ride', 'type-ride~sub-rails'])
  })
})
