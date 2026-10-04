import { describe, expect, it } from 'vitest'
import { describeLocationError } from '@/features/map/logic/geolocation'

describe('describeLocationError', () => {
  it('refus de l\'utilisateur : il faut changer un réglage', () => {
    const problem = describeLocationError(1, true)
    expect(problem.reason).toBe('denied')
    expect(problem.retryable).toBe(false)
  })

  it('position indisponible : on peut réessayer', () => {
    const problem = describeLocationError(2, true)
    expect(problem.reason).toBe('unavailable')
    expect(problem.retryable).toBe(true)
  })

  it('délai dépassé : on peut réessayer', () => {
    expect(describeLocationError(3, true).reason).toBe('timeout')
  })

  it('code inconnu : traité comme indisponible', () => {
    expect(describeLocationError(99, true).reason).toBe('unavailable')
  })

  it('hors https, explique la vraie cause plutôt que "refusé"', () => {
    const problem = describeLocationError(1, false)
    expect(problem.reason).toBe('insecure')
    expect(problem.message).toContain('https')
  })
})
