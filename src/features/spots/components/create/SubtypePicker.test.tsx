// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubtypePicker } from '@/features/spots/components/create/SubtypePicker'
import type { SpotSubtype } from '@/types/models'

afterEach(cleanup)

const dates = { created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' }
function subtype(id: string, label: string, parent_id: string | null = null, spot_type_id = 'type-nature'): SpotSubtype {
  return { id, spot_type_id, key: id, label, icon: 'trees', sort_order: 10, is_active: true, parent_id, ...dates }
}
const nature = [subtype('bivouac', 'Bivouac'), subtype('tente', 'Tente', 'bivouac'), subtype('hamac', 'Hamac', 'bivouac')]
const ride = [subtype('gaps', 'Gaps', null, 'type-ride'), subtype('rails', 'Rails', null, 'type-ride')]

function Harness({ subtypes, optional, onValue }: { subtypes: SpotSubtype[]; optional?: boolean; onValue?: (value: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <SubtypePicker
      subtypes={subtypes}
      color="#2F9E44"
      value={value}
      optional={optional}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed')

describe('SubtypePicker', () => {
  it('sous-catégorie facultative : présentée comme une option, sans ses précisions au départ', () => {
    render(<Harness subtypes={nature} optional />)
    expect(screen.getByRole('group', { name: 'Options (facultatif)' })).toBeTruthy()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Bivouac'])
  })

  it('cocher Bivouac fait apparaître Tente et Hamac', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<Harness subtypes={nature} optional onValue={onValue} />)

    await user.click(screen.getByRole('button', { name: 'Bivouac' }))
    expect(onValue).toHaveBeenLastCalledWith('bivouac')
    expect(pressed('Bivouac')).toBe('true')
    const details = within(screen.getByRole('group', { name: 'Précision : Bivouac' })).getAllByRole('button')
    expect(details.map((button) => button.textContent)).toEqual(['Tente', 'Hamac'])
    expect(details.every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('choisir une précision la retient ; Bivouac reste coché', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<Harness subtypes={nature} optional onValue={onValue} />)

    await user.click(screen.getByRole('button', { name: 'Bivouac' }))
    await user.click(screen.getByRole('button', { name: 'Hamac' }))
    expect(onValue).toHaveBeenLastCalledWith('hamac')
    expect(pressed('Bivouac')).toBe('true')
    expect(pressed('Hamac')).toBe('true')
    expect(pressed('Tente')).toBe('false')

    await user.click(screen.getByRole('button', { name: 'Tente' }))
    expect(onValue).toHaveBeenLastCalledWith('tente')
    expect(pressed('Hamac')).toBe('false')
  })

  it('retoucher la précision revient à Bivouac seul ; retoucher Bivouac retire tout', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<Harness subtypes={nature} optional onValue={onValue} />)

    await user.click(screen.getByRole('button', { name: 'Bivouac' }))
    await user.click(screen.getByRole('button', { name: 'Tente' }))
    await user.click(screen.getByRole('button', { name: 'Tente' }))
    expect(onValue).toHaveBeenLastCalledWith('bivouac')

    await user.click(screen.getByRole('button', { name: 'Tente' }))
    await user.click(screen.getByRole('button', { name: 'Bivouac' }))
    expect(onValue).toHaveBeenLastCalledWith(null)
    expect(screen.queryByRole('group', { name: 'Précision : Bivouac' })).toBeNull()
  })

  it('sous-catégorie obligatoire (Ride) : intitulé d\'origine, un seul choix, qu\'on ne retire pas en le retouchant', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<Harness subtypes={ride} onValue={onValue} />)

    expect(screen.getByRole('group', { name: 'Sous-catégorie' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Rails' }))
    await user.click(screen.getByRole('button', { name: 'Rails' }))
    expect(onValue).toHaveBeenLastCalledWith('rails')
    await user.click(screen.getByRole('button', { name: 'Gaps' }))
    expect(pressed('Gaps')).toBe('true')
    expect(pressed('Rails')).toBe('false')
  })
})
