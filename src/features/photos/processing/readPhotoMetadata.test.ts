import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { toIsoDay } from '@/features/photos/logic/exifDate'
import { readMetadataFromBuffer, readPhotoMetadata } from '@/features/photos/processing/readPhotoMetadata'

/** Charge une vraie petite photo JPEG du dossier de test. */
function fixture(name: string): ArrayBuffer {
  const path = fileURLToPath(new URL(`../../../test/fixtures/${name}`, import.meta.url))
  const bytes = readFileSync(path)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('readMetadataFromBuffer', () => {
  it('lit la position et la date d\'une photo géolocalisée', () => {
    const metadata = readMetadataFromBuffer(fixture('photo-gps.jpg'))
    expect(metadata.gps?.lat).toBeCloseTo(44.8009, 4)
    expect(metadata.gps?.lng).toBeCloseTo(4.253, 4)
    expect(toIsoDay(metadata.takenAt!)).toBe('2026-09-10')
    expect(metadata.takenAt!.getHours()).toBe(14)
  })

  it('donne des coordonnées négatives au sud et à l\'ouest', () => {
    const metadata = readMetadataFromBuffer(fixture('photo-gps-southwest.jpg'))
    expect(metadata.gps?.lat).toBeCloseTo(-33.8568, 4)
    expect(metadata.gps?.lng).toBeCloseTo(-70.6483, 4)
  })

  it('renvoie "rien" pour une photo sans métadonnées', () => {
    expect(readMetadataFromBuffer(fixture('photo-nogps.jpg'))).toEqual({ gps: null, takenAt: null })
  })

  it('ne lève pas sur un fichier qui n\'est pas une image', () => {
    const text = new TextEncoder().encode('ceci n\'est pas une photo')
    expect(readMetadataFromBuffer(text.buffer as ArrayBuffer)).toEqual({ gps: null, takenAt: null })
    expect(readMetadataFromBuffer(new ArrayBuffer(0))).toEqual({ gps: null, takenAt: null })
  })
})

describe('readPhotoMetadata', () => {
  it('lit un fichier (Blob)', async () => {
    const metadata = await readPhotoMetadata(new Blob([fixture('photo-gps.jpg')], { type: 'image/jpeg' }))
    expect(metadata.gps?.lat).toBeCloseTo(44.8009, 4)
  })
})
