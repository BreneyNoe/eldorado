import { describe, expect, it } from 'vitest'
import { tooManyPhotosMessage } from '@/features/photos/hooks/usePhotoSelection'

describe('tooManyPhotosMessage', () => {
  it('rappelle la limite et le nombre de photos écartées', () => {
    expect(tooManyPhotosMessage(3, 10)).toBe("10 photos au maximum par spot : 3 photos n'ont pas été ajoutées.")
  })

  it('accorde au singulier', () => {
    expect(tooManyPhotosMessage(1, 10)).toBe("10 photos au maximum par spot : une photo n'a pas été ajoutée.")
    expect(tooManyPhotosMessage(2, 1)).toBe("1 photo au maximum par spot : 2 photos n'ont pas été ajoutées.")
  })
})
