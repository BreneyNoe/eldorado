# Installation sur iPhone et usage hors ligne

## Installer l'application sur l'écran d'accueil

1. Ouvre l'adresse de l'application dans **Safari**.
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.

L'application s'ouvre alors en plein écran, sans la barre de Safari, avec sa propre icône et le nom « Eldorado ». Il faut une adresse en `https` : c'est le cas une fois l'application publiée (étape 18).

L'application installée et Safari ne partagent pas leurs données : il faut se connecter une fois dans l'application installée.

## Voir le plein écran avant la publication

Le plein écran peut s'essayer dès maintenant, depuis ton ordinateur :

1. Sur l'ordinateur : `npm run dev:lan`.
2. Sur l'iPhone, relié au même Wi-Fi : ouvre l'adresse du type `http://192.168.1.10:5173` dans **Safari**.
3. **Partager**, **Sur l'écran d'accueil**, **Ajouter**.
4. Lance l'application par sa nouvelle icône : elle s'ouvre sans barre de navigateur, et demande de se connecter une fois.

Ouvrir l'adresse directement dans un navigateur affiche toujours ses barres : le plein écran n'existe qu'en passant par l'icône.

Limites de cet essai : la localisation et l'appareil photo ne fonctionnent pas (ils exigent `https`), le mode hors ligne non plus, et l'icône ne marche que si l'ordinateur est allumé. Supprime-la après l'essai ; il faudra en créer une nouvelle depuis l'adresse publiée.

## Ce qui fonctionne sans réseau

Un bandeau « Hors ligne : consultation seule » s'affiche en haut de l'écran.

| Fonctionne | Ne fonctionne pas |
|---|---|
| Ouvrir l'application | Créer ou modifier un spot |
| La carte et la liste des spots déjà chargés | Ajouter des photos, des notes, un update |
| Les fiches déjà ouvertes : description, notes, journal | Les fiches jamais ouvertes sur cet appareil |
| Les photos déjà affichées | La recherche d'adresse |
| Les zones de carte déjà parcourues | L'administration |

Une action impossible hors ligne échoue tout de suite avec le message « Connexion impossible ». Rien n'est mis en attente pour partir plus tard.

## Combien de temps les données restent disponibles

- **Spots, fiches, notes, journal** : 7 jours après leur dernier chargement.
- **Photos** : les 400 dernières affichées, pendant 60 jours.
- **Fond de carte** : les zones parcourues, pendant 30 jours.

Ces limites se règlent dans `src/lib/queryClient.ts` (`OFFLINE_MAX_AGE_MS`) et `vite.config.ts` (section `runtimeCaching`).

## Session

Une session se renouvelle toutes les heures, ce qui demande le réseau. Sans réseau, l'application retient simplement qui était connecté sur l'appareil, pour s'ouvrir en consultation. Ce n'est pas un droit d'accès : rien ne peut être lu ni écrit sur le serveur tant que le réseau n'est pas revenu.

Se déconnecter efface les données gardées sur l'appareil. La déconnexion elle-même demande le réseau.

## Mises à jour

Quand une nouvelle version a été publiée, un message « Une nouvelle version est disponible » apparaît en bas de l'écran, avec un bouton **Mettre à jour**. La mise à jour n'est jamais appliquée d'office : elle recharge la page, ce qui ferait perdre un formulaire en cours.

L'application vérifie à chaque ouverture, puis toutes les heures tant qu'elle reste au premier plan.

## En cas de comportement étrange après une mise à jour

Supprime l'application de l'écran d'accueil, puis réinstalle-la : cela vide tout ce qu'elle avait gardé sur l'appareil. Dans Safari, l'équivalent est **Réglages → Safari → Avancé → Données de sites**.

## Choix techniques

- **Le code de l'application** est entièrement gardé sur l'appareil par un service worker (fichier `sw.js`, fabriqué à la construction par `vite-plugin-pwa`).
- **Les données** sont mémorisées par l'application elle-même dans la base du navigateur (IndexedDB), et non par le service worker. Les appels à l'API et à l'authentification ne sont jamais servis depuis une copie.
- **En développement** (`npm run dev`), le service worker est absent : il gênerait en gardant d'anciennes versions du code. Pour l'essayer : `npm run build` puis `npm run preview`.
- **Barre d'état de l'iPhone** : style par défaut (texte sombre), lisible au-dessus de la carte. Il se règle dans `index.html` (`apple-mobile-web-app-status-bar-style`).
