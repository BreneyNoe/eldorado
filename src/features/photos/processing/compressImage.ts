/**
 * Réduction et compression d'une image dans le navigateur, avant l'envoi.
 *
 * Le navigateur décode la photo d'origine, on la redessine plus petite sur
 * un canevas, puis on l'exporte en JPEG. Le fichier d'origine n'est jamais
 * envoyé : c'est ce qui permet de tenir dans l'espace de stockage gratuit.
 */
import { IMAGE_SETTINGS } from '@/config/constants'
import { fitWithin } from '@/features/photos/logic/imageSize'
import { AppError } from '@/lib/errors'

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

/** Baisses de qualité successives si le fichier dépasse la limite du stockage. */
const QUALITY_STEP = 0.85
const MAX_ATTEMPTS = 4

function decode(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('décodage impossible'))
    image.src = url
  })
}

function exportJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * @param file     photo d'origine (JPEG, HEIC sur Safari, PNG...)
 * @param maxEdge  plus grand côté du résultat, en pixels
 * @param quality  qualité JPEG de départ, entre 0 et 1
 */
export async function compressImage(file: Blob, maxEdge: number, quality: number): Promise<CompressedImage> {
  const url = URL.createObjectURL(file)
  try {
    let image: HTMLImageElement
    try {
      image = await decode(url)
    } catch {
      throw new AppError(
        'validation',
        "Cette image n'a pas pu être lue. Son format n'est peut-être pas pris en charge par ce navigateur.",
        { code: 'APP_IMAGE_UNREADABLE' },
      )
    }

    // naturalWidth / naturalHeight tiennent déjà compte de l'orientation
    // enregistrée dans la photo : une photo prise à la verticale reste verticale.
    const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, maxEdge)
    if (width === 0 || height === 0) {
      throw new AppError('validation', 'Cette image est vide.', { code: 'APP_IMAGE_UNREADABLE' })
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new AppError('unknown', "Le navigateur n'a pas pu préparer l'image.")

    // Fond blanc : le JPEG n'a pas de transparence, une image PNG détourée deviendrait noire.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)

    try {
      let currentQuality = quality
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const blob = await exportJpeg(canvas, currentQuality)
        if (!blob) break
        if (blob.size <= IMAGE_SETTINGS.maxUploadBytes) return { blob, width, height }
        currentQuality *= QUALITY_STEP
      }
      throw new AppError('validation', 'Cette photo reste trop lourde après compression.', {
        code: 'APP_IMAGE_TOO_LARGE',
      })
    } finally {
      // Libère tout de suite la mémoire du canevas (utile sur iPhone, où elle est comptée).
      canvas.width = 0
      canvas.height = 0
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
