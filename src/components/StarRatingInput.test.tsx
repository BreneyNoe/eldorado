// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StarRatingInput } from '@/components/StarRatingInput'

afterEach(cleanup)

describe('StarRatingInput', () => {
  it('propose cinq étoiles, chacune en deux moitiés, et indique qu\'aucune note n\'est donnée', () => {
    render(<StarRatingInput label="Beauté" value={null} onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'Beauté' })).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(10)
    expect(screen.getByText('Non noté')).toBeTruthy()
  })

  it('transmet la note choisie', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRatingInput label="Beauté" value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '4 étoiles' }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('affiche la note en clair et marque l\'étoile choisie', () => {
    render(<StarRatingInput label="Beauté" value={3} onChange={() => {}} />)
    expect(screen.getByText('3 sur 5')).toBeTruthy()
    expect(screen.getByRole('button', { name: '3 étoiles' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '4 étoiles' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('retire la note quand on touche l\'étoile déjà choisie', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRatingInput label="Beauté" value={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '3 étoiles' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('la moitié gauche d\'une étoile donne une demi-étoile', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRatingInput label="Beauté" value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '3,5 étoiles' }))
    expect(onChange).toHaveBeenCalledWith(3.5)
    await user.click(screen.getByRole('button', { name: '0,5 étoile' }))
    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('affiche une demi-note avec une virgule et la retire au second toucher', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRatingInput label="Beauté" value={2.5} onChange={onChange} />)

    expect(screen.getByText('2,5 sur 5')).toBeTruthy()
    expect(screen.getByRole('button', { name: '2,5 étoiles' }).getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByRole('button', { name: '2,5 étoiles' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('accorde "1 étoile" au singulier', () => {
    render(<StarRatingInput label="Beauté" value={null} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '1 étoile' })).toBeTruthy()
  })
})
