import { describe, expect, it } from 'vitest'
import { buildPublicPhotoUrl } from '@/lib/storageUrls'

describe('buildPublicPhotoUrl', () => {
  it('assemble l\'adresse publique du bucket', () => {
    expect(buildPublicPhotoUrl('https://abc.supabase.co', 'spots/s1/p1_thumb.jpg')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/spot-photos/spots/s1/p1_thumb.jpg',
    )
  })

  it('protège les caractères spéciaux sans toucher aux séparateurs', () => {
    expect(buildPublicPhotoUrl('https://abc.supabase.co', 'spots/a b/c?d.jpg')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/spot-photos/spots/a%20b/c%3Fd.jpg',
    )
  })
})
