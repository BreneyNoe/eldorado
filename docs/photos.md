# Photos

## Ce qui est envoyé

Pour chaque photo, l'application fabrique deux fichiers JPEG sur le téléphone, avant tout envoi :

| Fichier | Taille | Usage |
|---|---|---|
| Image standard | 1 600 px sur le plus grand côté | Fiche du spot, galerie |
| Miniature | 400 px sur le plus grand côté | Carte, listes, aperçus |

La photo d'origine n'est jamais envoyée. C'est ce qui permet de tenir dans le gigaoctet de stockage gratuit de Supabase.

Les deux fichiers sont rangés dans le bucket `spot-photos`, sous `spots/<id du spot>/<id de la photo>_std.jpg` et `_thumb.jpg`. La base refuse tout autre chemin.

Redessiner l'image efface ses métadonnées : les fichiers envoyés ne contiennent ni position GPS, ni modèle d'appareil. Seule la date de prise de vue est conservée, en base.

## Position lue dans les photos

À la création d'un spot, l'application lit la position inscrite dans chaque photo, avant de la compresser, et propose de placer le spot à cet endroit.

- Les photos prises à moins de 150 m les unes des autres forment un même lieu.
- Si les photos viennent de plusieurs lieux, le lieu qui regroupe le plus de photos est retenu, et l'écran l'explique.
- La position proposée est le point moyen des photos du lieu retenu.
- Le repère reste déplaçable : la proposition n'est jamais imposée.

Le rayon de 150 m se règle dans `src/config/constants.ts` (`photoGroupingRadiusM`).

## Limites sur iPhone

Ces limites viennent de Safari, pas de l'application.

- **Photothèque** : Safari retire souvent la position des photos choisies. Dans le sélecteur de photos, le bouton **Options** permet de l'inclure. Sans cela, l'application ne voit aucune position et demande de placer le repère à la main.
- **Photo prise sur le moment** : elle ne contient jamais de position. L'application demande alors celle du téléphone, puisqu'on est encore sur place.
- **Format HEIC** : Safari le convertit généralement en JPEG au moment du choix. Sur un autre navigateur, un fichier HEIC peut être illisible ; il est alors écarté avec un message.

Dans tous les cas, le placement manuel sur la carte reste disponible.

## Limite par spot

Un spot reçoit au plus **10 photos**. À la création comme sur la fiche, les photos en trop sont écartées avec un message, et les boutons d'ajout se désactivent quand la limite est atteinte. Supprimer une photo libère une place.

La limite est appliquée par la base elle-même : même en contournant l'application, la onzième photo est refusée. Elle se règle dans l'administration, onglet **Réglages** (entre 1 et 50). La baisser ne supprime aucune photo existante.

## Sur la fiche d'un spot

- **Ajouter** : tout membre peut ajouter des photos à n'importe quel spot. Elles sont préparées puis envoyées dès qu'elles sont choisies.
- **Regarder** : la visionneuse affiche d'abord la miniature, déjà en mémoire, puis l'image standard dès qu'elle est arrivée.
- **Supprimer** : chacun supprime ses propres photos ; un administrateur peut supprimer n'importe laquelle. La ligne en base est supprimée d'abord, les fichiers ensuite : en cas d'échec à mi-chemin, il reste des fichiers invisibles (que l'outil d'administration retrouvera), jamais une photo cassée à l'écran.
- **Couverture** : la première photo ajoutée. La personne qui a créé le spot et les administrateurs peuvent en choisir une autre depuis la visionneuse. Si la couverture est supprimée, la plus ancienne photo restante la remplace.

## En cas d'échec d'envoi

Le spot est créé avant l'envoi des photos. Si une photo échoue, le spot existe quand même : l'écran propose de réessayer ou de terminer sans elle. Une photo dont l'envoi est interrompu ne laisse pas de fichier isolé dans le stockage.

## Espace occupé

Le poids d'une photo dépend de son contenu. L'écran d'administration (étape 14) affichera l'espace réellement utilisé. Pour libérer de la place plus tard, les réglages de taille et de qualité sont dans `src/config/constants.ts` (`IMAGE_SETTINGS`) ; ils ne s'appliquent qu'aux nouvelles photos.
