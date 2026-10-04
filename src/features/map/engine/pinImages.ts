/**
 * Fabrique les images des marqueurs et des regroupements.
 *
 * Tout est dessiné par l'application elle-même, sur un canevas : la carte ne
 * dépend ni des icônes ni des polices du fournisseur de fond de carte.
 * Changer de fournisseur ne casse donc pas l'affichage des spots.
 */
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { loadIcon } from '@iconify/react'
import type { LucideIcon } from 'lucide-react'
import { isIconifyName } from '@/features/spots/logic/iconifyIcons'
import { resolveSpotIcon } from '@/features/spots/logic/spotIcons'

const INK = '#16233b'
const PAPER = '#ffffff'

/** Diamètres en pixels d'écran. */
const PIN_SIZE = 38
const PIN_SELECTED_SIZE = 54

/** Rayon d'un marqueur, utilisé pour savoir si un toucher tombe dessus. */
export const PIN_RADIUS = PIN_SIZE / 2

/** Les icônes sont dessinées dans un repère de 24 x 24 unités. */
const ICON_GRID = 24
const ICON_STROKE = 2.4

export interface GeneratedImage {
  image: ImageData
  /** Densité de l'image : la carte la réduit d'autant pour un rendu net. */
  pixelRatio: number
}

/** Densité de l'écran (2 ou 3 sur un iPhone), bornée entre 1 et 3. */
function screenDensity(): number {
  return Math.min(Math.max(Math.ceil(window.devicePixelRatio || 1), 1), 3)
}

/** Prépare un canevas carré où l'on dessine en pixels d'écran, à la finesse réelle de l'appareil. */
function createDrawing(size: number) {
  const pixelRatio = screenDensity()
  const pixels = Math.round(size * pixelRatio)

  const canvas = document.createElement('canvas')
  canvas.width = pixels
  canvas.height = pixels
  // "willReadFrequently" : le dessin est fait en mémoire ordinaire plutôt que
  // par la carte graphique. On relit aussitôt les pixels (getImageData) pour
  // les confier à la carte : depuis la carte graphique, cette relecture peut
  // figer l'écran plusieurs secondes.
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D indisponible')
  context.scale(pixelRatio, pixelRatio)

  return {
    context,
    finish: (): GeneratedImage => ({ image: context.getImageData(0, 0, pixels, pixels), pixelRatio }),
  }
}

function disc(context: CanvasRenderingContext2D, center: number, radius: number, color: string) {
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
}

/** Formes qui composent chaque icône, lues une seule fois puis gardées en mémoire. */
const iconShapes = new Map<LucideIcon, Element[]>()

/** Rend l'icône une fois hors de la page pour récupérer ses formes (traits, cercles...). */
function shapesOf(icon: LucideIcon): Element[] {
  const known = iconShapes.get(icon)
  if (known) return known

  const container = document.createElement('div')
  const root = createRoot(container)
  flushSync(() => root.render(createElement(icon)))
  const shapes = Array.from(container.querySelector('svg')?.children ?? [])
  root.unmount()

  iconShapes.set(icon, shapes)
  return shapes
}

function numberAttribute(shape: Element, name: string): number {
  return Number(shape.getAttribute(name) ?? 0)
}

/** Trace une forme SVG sur le canevas. Renvoie null si la forme n'est pas prise en charge. */
function pathOf(shape: Element): Path2D | null {
  const path = new Path2D()
  switch (shape.tagName.toLowerCase()) {
    case 'path':
      return new Path2D(shape.getAttribute('d') ?? '')
    case 'circle':
      path.arc(numberAttribute(shape, 'cx'), numberAttribute(shape, 'cy'), numberAttribute(shape, 'r'), 0, Math.PI * 2)
      return path
    case 'ellipse':
      path.ellipse(
        numberAttribute(shape, 'cx'),
        numberAttribute(shape, 'cy'),
        numberAttribute(shape, 'rx'),
        numberAttribute(shape, 'ry'),
        0,
        0,
        Math.PI * 2,
      )
      return path
    case 'line':
      path.moveTo(numberAttribute(shape, 'x1'), numberAttribute(shape, 'y1'))
      path.lineTo(numberAttribute(shape, 'x2'), numberAttribute(shape, 'y2'))
      return path
    case 'rect': {
      const radius = numberAttribute(shape, 'rx') || numberAttribute(shape, 'ry')
      path.roundRect(
        numberAttribute(shape, 'x'),
        numberAttribute(shape, 'y'),
        numberAttribute(shape, 'width'),
        numberAttribute(shape, 'height'),
        radius,
      )
      return path
    }
    case 'polyline':
    case 'polygon': {
      const values = (shape.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number)
      for (let index = 0; index + 1 < values.length; index += 2) {
        if (index === 0) path.moveTo(values[index], values[index + 1])
        else path.lineTo(values[index], values[index + 1])
      }
      if (shape.tagName.toLowerCase() === 'polygon') path.closePath()
      return path
    }
    default:
      return null
  }
}

/** Dessine une icône blanche de `size` pixels, coin supérieur gauche en (x, y). */
function drawIcon(context: CanvasRenderingContext2D, icon: LucideIcon, x: number, y: number, size: number) {
  context.save()
  context.translate(x, y)
  context.scale(size / ICON_GRID, size / ICON_GRID)
  context.strokeStyle = PAPER
  context.fillStyle = PAPER
  context.lineWidth = ICON_STROKE
  context.lineCap = 'round'
  context.lineJoin = 'round'

  for (const shape of shapesOf(icon)) {
    const path = pathOf(shape)
    if (!path) continue
    // Les icônes sont faites de traits ; quelques détails (points) sont pleins.
    if (shape.getAttribute('fill') === 'currentColor') context.fill(path)
    context.stroke(path)
  }
  context.restore()
}

/**
 * Marqueur d'un spot : disque de la couleur du type, liseré blanc, icône
 * blanche. Sélectionné, il grossit et gagne un anneau bleu nuit.
 */
/**
 * Dessine une icône Iconify blanche. Son dessin (du SVG quelconque, traits ou
 * surfaces) est confié au navigateur, qui le rend comme une image.
 * Lève une erreur si l'icône est introuvable (hors connexion, nom inconnu).
 */
async function drawIconifyIcon(context: CanvasRenderingContext2D, name: string, x: number, y: number, size: number) {
  const icon = await loadIcon(name)
  // Rendue à 4 fois la taille d'affichage : nette même sur un écran très dense.
  const pixels = Math.ceil(size * 4)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="${icon.left} ${icon.top} ${icon.width} ${icon.height}">` +
    icon.body.replace(/currentColor/g, PAPER) +
    `</svg>`

  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  context.drawImage(image, x, y, size, size)
}

/**
 * @param iconName  icône du jeu de base ("trees") ou Iconify ("pinhead:lowered-curb")
 */
export async function createPinImage(color: string, iconName: string | undefined, selected: boolean): Promise<GeneratedImage> {
  const size = selected ? PIN_SELECTED_SIZE : PIN_SIZE
  const center = size / 2
  const { context, finish } = createDrawing(size)

  if (selected) {
    disc(context, center, center - 0.5, INK)
    disc(context, center, center - 3.5, PAPER)
    disc(context, center, center - 6.5, color)
  } else {
    disc(context, center, center - 0.5, PAPER)
    disc(context, center, center - 3.5, color)
  }

  const iconSize = size * 0.5
  const iconOffset = center - iconSize / 2
  if (isIconifyName(iconName)) {
    try {
      await drawIconifyIcon(context, iconName, iconOffset, iconOffset, iconSize)
    } catch {
      // Icône indisponible : on se rabat sur l'épingle neutre plutôt que de laisser un disque vide.
      drawIcon(context, resolveSpotIcon(null), iconOffset, iconOffset, iconSize)
    }
  } else {
    drawIcon(context, resolveSpotIcon(iconName), iconOffset, iconOffset, iconSize)
  }

  return finish()
}

/** Diamètre d'un regroupement : il grandit avec la longueur du nombre affiché. */
export function clusterDiameter(label: string): number {
  if (label.length <= 1) return 40
  if (label.length === 2) return 46
  if (label.length === 3) return 52
  return 60
}

let fontReady: Promise<unknown> | null = null

/** Attend que la police de l'application soit disponible pour le dessin. */
function ensureFont(): Promise<unknown> {
  fontReady ??= document.fonts?.load?.('600 16px Barlow').catch(() => undefined) ?? Promise.resolve()
  return fontReady
}

/** Regroupement de spots : disque bleu nuit, liseré blanc, nombre en blanc. */
export async function createClusterImage(label: string): Promise<GeneratedImage> {
  await ensureFont()

  const size = clusterDiameter(label)
  const center = size / 2
  const { context, finish } = createDrawing(size)

  disc(context, center, center - 0.5, PAPER)
  disc(context, center, center - 3.5, INK)

  context.fillStyle = PAPER
  context.font = `600 ${label.length >= 4 ? 15 : 17}px Barlow, system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  // +1 : compense le léger décalage vers le haut des chiffres de la police.
  context.fillText(label, center, center + 1)

  return finish()
}
