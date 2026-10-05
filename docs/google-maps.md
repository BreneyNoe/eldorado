# Reprendre un point de Google Maps

À la création d'un spot, le bouton **« Partir d'un point Google Maps »** ouvre un champ où coller des coordonnées ou un lien. La position est retenue et affichée sur le même écran : on peut encore ajouter des photos, puis **Continuer**. La carte de placement s'ouvre alors sur ce point, qui l'emporte sur la position des photos.

Sur iPhone, une application web ne peut pas apparaître dans le menu « Partager » des autres applications : c'est une limite de Safari. Le copier-coller est donc le seul chemin.

## Méthode 1 : copier les coordonnées (fonctionne toujours)

1. Dans Google Maps, appuie longuement sur l'endroit voulu : un repère rouge apparaît.
2. Touche les coordonnées affichées (par exemple `44.80090, 4.25300`) : elles sont copiées.
3. Dans l'application : « + », « Partir d'un point Google Maps », puis « Coller ».

Pour un lieu enregistré en favori, appuie longuement juste dessus pour poser le repère au même endroit.

## Méthode 2 : copier le lien d'un lieu

1. Dans Google Maps, ouvre le lieu, puis « Partager » et « Copier ».
2. Dans l'application : « + », « Partir d'un point Google Maps », puis « Coller ».

Le lien copié est un lien court (`https://maps.app.goo.gl/...`). Il ne contient pas la position : il faut le suivre pour savoir où il mène, ce qu'un navigateur n'a pas le droit de faire depuis une page web. C'est le rôle de la fonction serveur ci-dessous. **Sans elle, seule la méthode 1 fonctionne** : l'application l'explique quand on colle un lien court.

## Installer la fonction serveur (une fois, gratuit)

Le plan gratuit de Supabase inclut les Edge Functions.

1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom de la fonction : `resolve-map-link` (exactement).
3. Remplace le contenu proposé par celui du fichier `supabase/functions/resolve-map-link/index.ts`.
4. **Deploy**.

Si, après installation, l'application répond que le lien n'a pas pu être lu : ouvre la fonction dans Supabase, onglet des réglages, et désactive l'option « Verify JWT ». La fonction vérifie elle-même que l'appelant est connecté ; cette option fait double emploi et refuse parfois les sessions des projets récents.

## Si un lien ne passe pas

Le message affiché dit pourquoi, et se termine par un détail technique entre parenthèses.

| Message | Cause | Que faire |
|---|---|---|
| « …n'a pas répondu » | La fonction n'existe pas, ou « Verify JWT » est activé | L'installer, ou désactiver l'option (voir le test ci-dessous) |
| « …n'est pas installée sur le serveur » | La fonction n'a pas été déployée | Suivre « Installer la fonction serveur » ci-dessus |
| « Le serveur a refusé de lire ce lien » | La fonction refuse la session | Désactiver « Verify JWT » sur la fonction |
| « Google ne donne pas de position exploitable » | La fonction a suivi le lien sans y trouver de coordonnées | Utiliser la méthode 1, et me transmettre le détail entre parenthèses |
| « Ce lien n'a pas pu être lu » | Autre échec (Google injoignable depuis le serveur…) | Réessayer, sinon méthode 1 |

### Vérifier que la fonction est installée

Ouvre cette adresse dans un navigateur, en remplaçant `<projet>` par l'identifiant de ton projet Supabase :

```
https://<projet>.supabase.co/functions/v1/resolve-map-link
```

| Ce qui s'affiche | Signification |
|---|---|
| `{"error":"method_not_allowed"}` | La fonction est installée et répond : tout va bien |
| `{"code":"NOT_FOUND", …}` | La fonction n'est pas installée |
| `{"code":401, …}` ou « Missing authorization header » | Elle est installée, mais « Verify JWT » est activé : désactive-le |

Après une mise à jour du fichier `supabase/functions/resolve-map-link/index.ts`, il faut le redéployer : ouvre la fonction dans Supabase, remplace son contenu et clique sur **Deploy**.

## Position exacte ou approximative

Google refuse que la fonction lise la page d'un lieu (erreur 429) : elle ne peut donc pas toujours connaître sa position exacte. Selon le lien :

| Ce que tu partages | Position obtenue |
|---|---|
| Un repère posé à la main (appui long sur la carte) | Exacte : les coordonnées sont dans le lien |
| Un lieu connu de Google (commerce, site, favori sur un lieu) | Approximative : retrouvée par le nom du lieu dans OpenStreetMap, sinon par sa zone, à quelques centaines de mètres près, parfois plus |

Quand la position est approximative, l'application le dit, ouvre la carte plus large, et te demande de placer le repère. **Pour une position exacte, pose un repère par appui long dans Google Maps et partage ce repère**, ou copie ses coordonnées (méthode 1).

## Limites à connaître

- Google ne met pas toujours la position dans le lien d'un lieu. Dans ce cas, la fonction regarde le contenu de la page ; si elle ne trouve rien, l'application le dit et renvoie vers la méthode 1.
- Le format des liens Google n'est pas garanti : il peut changer. La méthode 1 n'en dépend pas.
- La fonction ne suit que des adresses de Google et n'accepte que les utilisateurs connectés.

## Ce que l'application sait lire

- `44.80090, 4.25300`, avec une virgule, un espace ou un point-virgule ;
- les degrés, minutes, secondes : `44°48'03.2"N 4°15'10.8"E` ;
- les liens Google Maps complets (`.../@44.80,4.25,17z`, `?q=44.80,4.25`, `!3d44.80!4d4.25`) ;
- les liens Plans d'Apple (`?ll=44.80,4.25`) et les liens `geo:`.
