// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StarRating } from '@/components/StarRating'

afterEach(cleanup)

/** Largeur de la rangée d'étoiles jaunes, en pourcentage de la rangée complète. */
function filledWidth(): string {
  const image = screen.getByRole('img')
  return (image.children[1] as HTMLElement).style.width
}

describe('StarRating', () => {
  it('annonce la note avec une virgule française', () => {
    render(<StarRating value={4.3} />)
    expect(screen.getByRole('img', { name: '4,3 sur 5' })).toBeTruthy()
  })

  it('remplit les étoiles en proportion de la note', () => {
    render(<StarRating value={2.5} />)
    expect(filledWidth()).toBe('50%')
  })

  it('remplit tout pour 5 et rien pour 0', () => {
    render(<StarRating value={5} />)
    expect(filledWidth()).toBe('100%')
    cleanup()
    render(<StarRating value={0} />)
    expect(filledWidth()).toBe('0%')
  })

  it('borne une valeur hors de l\'échelle', () => {
    render(<StarRating value={9} />)
    expect(filledWidth()).toBe('100%')
    expect(screen.getByRole('img', { name: '5,0 sur 5' })).toBeTruthy()
  })
})
