# Types, catégories de notation et sous-catégories

Trois tables décrivent ce qu'on peut créer et noter. Rien n'est écrit en dur dans l'application : elle affiche ce que contient la base.

| Table | Contenu | Exemple |
|---|---|---|
| `spot_types` | Les types de spots | Nature, Pêche, Baignade, Urbex, Ride |
| `rating_categories` | Les catégories de notes de chaque type | Ride : Originalité, Difficulté, Faisabilité |
| `spot_subtypes` | Les sous-catégories d'un type | Ride : Gaps, Ledges et curbs, Plans inclinés, Rails, Goofy |

## Sous-catégories

- Une sous-catégorie appartient à un seul type. La base refuse d'en donner une à un spot d'un autre type.
- Si un type propose des sous-catégories, il faut en choisir une à la création d'un spot de ce type.
- Un spot créé avant l'existence des sous-catégories n'en a pas. On peut lui en donner une en le modifiant.
- Sur la carte, le marqueur garde la couleur du type et prend l'icône de la sous-catégorie.

## Icônes

La colonne `icon` contient un nom d'icône, de deux formes possibles.

**Jeu de base** : un nom court, par exemple `trees`, `factory`, `mountain`. La liste est dans `src/features/spots/logic/spotIcons.ts` ; pour en proposer une nouvelle, il faut l'y ajouter.

**Iconify** : un nom de la forme `collection:nom`, par exemple `pinhead:lowered-curb` ou `game-icons:fishing`. On les trouve sur https://icon-sets.iconify.design.

Un type accepte les deux formes ; une sous-catégorie, un nom Iconify.

**Icône dessinée soi-même** : elle n'existe pas chez Iconify, il faut donc l'embarquer. Ajoute son dessin dans `src/features/spots/logic/iconifyIcons.ts` sous un nom commençant par `spots:` (c'est le cas de `spots:ride`), puis utilise ce nom comme n'importe quel autre. Pour qu'elle prenne la couleur voulue sur la carte et dans les listes, son dessin doit utiliser `currentColor` et non une couleur fixe.

- Les icônes actuelles sont embarquées dans l'application (`src/features/spots/logic/iconifyIcons.ts`) : elles s'affichent sans connexion.
- Une autre icône Iconify fonctionne aussi, sans rien changer au code : elle est téléchargée chez Iconify au premier affichage, ce qui demande une connexion. Pour qu'elle s'affiche hors ligne, ajoute-la au fichier ci-dessus.

## Ajouter ou modifier

Le plus simple : l'onglet **Types** de l'administration (voir [administration.md](administration.md)).

On peut aussi passer par le **SQL Editor** de Supabase. Exemple : une cinquième sous-catégorie pour le type Ride.

```sql
insert into public.spot_subtypes (spot_type_id, key, label, icon, sort_order)
select id, 'bowls', 'Bowls', 'pinhead:flush-curb', 50
from public.spot_types
where key = 'ride';
```

Remplace `pinhead:flush-curb` par le nom de l'icône choisie sur le site d'Iconify.

Renommer :

```sql
update public.spot_subtypes set label = 'Curbs' where key = 'ledges_curbs';
```

Retirer sans supprimer (les spots existants gardent leur sous-catégorie, elle n'est plus proposée à la création) :

```sql
update public.spot_subtypes set is_active = false where key = 'bowls';
```

La clé (`key`) ne contient que des minuscules sans accent, des chiffres et des tirets bas.
