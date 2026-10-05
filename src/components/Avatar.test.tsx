// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Avatar } from '@/components/Avatar'

vi.mock('@/config/env', () => ({ getEnv: () => ({ supabaseUrl: 'https://projet.supabase.co' }) }))

afterEach(cleanup)

describe('Avatar', () => {
  it('affiche la photo quand il y en a une', () => {
    const { container } = render(<Avatar person={{ display_name: 'Camille', avatar_path: 'user-1/abc.jpg', avatar_icon: 'trees' }} />)
    const image = container.querySelector('img')
    expect(image?.getAttribute('src')).toBe('https://projet.supabase.co/storage/v1/object/public/avatars/user-1/abc.jpg')
  })

  it('sans photo, affiche l\'icône choisie', () => {
    const { container } = render(<Avatar person={{ display_name: 'Camille', avatar_path: null, avatar_icon: 'trees' }} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('sans photo ni icône, affiche l\'initiale', () => {
    const { container } = render(<Avatar person={{ display_name: 'camille' }} />)
    expect(container.textContent).toBe('C')
  })

  it('compte supprimé : un point d\'interrogation', () => {
    const { container } = render(<Avatar person={null} />)
    expect(container.textContent).toBe('?')
  })

  it('photo introuvable : retombe sur l\'initiale au lieu d\'une image cassée', () => {
    const { container } = render(<Avatar person={{ display_name: 'Camille', avatar_path: 'user-1/abc.jpg' }} />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('C')
  })

  it('reste décoratif : le nom est écrit à côté par l\'écran qui l\'utilise', () => {
    const { container } = render(<Avatar person={{ display_name: 'Camille' }} />)
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })
})
