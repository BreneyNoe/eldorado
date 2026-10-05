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

  it('prend la couleur de fond choisie, avec un dessin lisible dessus', () => {
    const { container } = render(<Avatar person={{ display_name: 'Camille', avatar_icon: 'trees', avatar_color: '#FFE000' }} />)
    const disc = container.querySelector('span > span') as HTMLElement
    expect(disc.style.backgroundColor).toBe('rgb(255, 224, 0)')
    // Jaune clair : le dessin passe en sombre.
    expect(disc.style.color).toBe('rgb(22, 35, 59)')
  })

  it('pas d\'ornement avant cinq spots publiés', () => {
    const { container } = render(<Avatar person={{ display_name: 'Camille', spot_count: 4 }} />)
    expect(container.querySelector('svg[data-rank]')).toBeNull()
  })

  it('un ornement par rang : 5, 15, 30 et 50 spots', () => {
    for (const [count, rank] of [[5, 'bronze'], [15, 'silver'], [30, 'gold'], [50, 'platinum']] as const) {
      const { container } = render(<Avatar person={{ display_name: 'Camille', spot_count: count }} />)
      expect(container.querySelector('svg[data-rank]')?.getAttribute('data-rank')).toBe(rank)
      cleanup()
    }
  })

  it('l\'ornement entoure aussi une photo', () => {
    const { container } = render(<Avatar person={{ display_name: 'Camille', avatar_path: 'user-1/abc.jpg', spot_count: 30 }} />)
    expect(container.querySelector('img')).not.toBeNull()
    expect(container.querySelector('svg[data-rank="gold"]')).not.toBeNull()
  })

  it('deux ornements sur la même page ont des dégradés distincts', () => {
    const { container } = render(
      <>
        <Avatar person={{ display_name: 'A', spot_count: 15 }} />
        <Avatar person={{ display_name: 'B', spot_count: 15 }} />
      </>,
    )
    const ids = [...container.querySelectorAll('linearGradient, radialGradient')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
