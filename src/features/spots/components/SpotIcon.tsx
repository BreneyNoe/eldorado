import { createElement } from 'react'
import { Icon } from '@iconify/react'
import { isIconifyName } from '@/features/spots/logic/iconifyIcons'
import { resolveSpotIcon } from '@/features/spots/logic/spotIcons'

interface SpotIconProps {
  /** Nom de l'icône : jeu de base ("trees") ou Iconify ("pinhead:lowered-curb"). */
  name: string | null | undefined
  className?: string
  style?: React.CSSProperties
}

/** Icône d'un type ou d'une sous-catégorie, quel que soit son jeu d'origine. */
export function SpotIcon({ name, className, style }: SpotIconProps) {
  if (isIconifyName(name)) {
    return <Icon icon={name} className={className} style={style} aria-hidden="true" />
  }
  return createElement(resolveSpotIcon(name), { className, style, strokeWidth: 2.2, 'aria-hidden': true })
}
