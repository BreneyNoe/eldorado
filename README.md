# Eldorado

> Le dossier du projet et son nom technique restent `spots-app` : seul le nom affiché a changé.

Carte collaborative privée pour partager des spots (nature, pêche, baignade, urbex) entre amis. Application web installable sur iPhone (PWA), sans aucun service payant.

| Brique | Choix |
|---|---|
| Interface | React, TypeScript, Vite, Tailwind CSS |
| Données, comptes, photos | Supabase (plan gratuit) |
| Carte | MapLibre GL JS et OpenFreeMap ; vue satellite : photos aériennes de l'IGN |
| Adresses | Nominatim (OpenStreetMap), une requête par seconde au plus |
| Hébergement | GitHub Pages (étape 18) |

## Démarrer

Première installation sous Windows : suivre [docs/installation-windows.md](docs/installation-windows.md).

Ensuite, dans le dossier du projet :

```powershell
npm install
Copy-Item .env.example .env.local   # puis remplir les deux valeurs
npm run dev
```

L'application s'ouvre sur http://localhost:5173.

La base de données s'installe à part : voir [supabase/README.md](supabase/README.md).

La création et la gestion des comptes sont décrites dans [docs/comptes.md](docs/comptes.md).

Le traitement des photos et ses limites sur iPhone sont décrits dans [docs/photos.md](docs/photos.md).

Autres guides : [sauvegarde](docs/sauvegarde.md), [tests](docs/tests.md), [recette en conditions réelles](docs/recette.md), [mise en ligne](docs/deploiement.md), [sécurité et performances](docs/securite.md), [installation sur iPhone et usage hors ligne](docs/pwa.md), [administration](docs/administration.md), [reprendre un point de Google Maps](docs/google-maps.md), [vue satellite](docs/vue-satellite.md), [types et sous-catégories](docs/types-et-sous-categories.md).

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Lance l'application en local, avec rechargement automatique |
| `npm run dev:lan` | Idem, accessible depuis un téléphone sur le même Wi-Fi |
| `npm run dev:https` | Idem en https, pour tester localisation et caméra sur le téléphone ([détails](docs/tester-sur-iphone.md)) |
| `npm run build` | Vérifie les types puis construit le site dans `dist/` |
| `npm run preview` | Sert le contenu de `dist/` pour le tester |
| `npm run test` | Lance les tests |
| `npm run lint` | Analyse le code |
| `npm run check` | Types, lint et tests d'un coup : à lancer avant chaque commit |

## Organisation du code

```
src/
├─ app/          racine de l'application, routes, écrans globaux
├─ components/   composants d'interface réutilisables
├─ config/       variables d'environnement et réglages métier
├─ lib/          client Supabase, erreurs, cache de données
├─ types/        types de la base de données
├─ test/         outils communs aux tests
└─ features/     une fonctionnalité par dossier
   └─ <nom>/
      ├─ api/         appels Supabase (seul endroit autorisé)
      ├─ logic/       règles métier pures, testées
      ├─ hooks/       lien entre données et interface
      └─ components/  affichage
supabase/        migrations SQL et scripts d'administration
docs/            documentation
```

## Règles du projet

- **Aucun secret dans le dépôt.** Seules l'adresse du projet Supabase et la clé « publishable » sont utilisées, et elles vivent dans `.env.local`, ignoré par Git. La clé secrète et le mot de passe de la base n'ont rien à faire dans ce projet.
- **La sécurité est dans la base.** Chaque permission est appliquée par Supabase (droits et règles RLS). L'interface ne fait que masquer ce qui serait refusé de toute façon.
- **Les composants ne parlent pas à Supabase.** Ils passent par un hook, qui passe par un fichier `api/`.
- **Aucune erreur silencieuse.** Toute erreur est convertie par `toAppError` (`src/lib/errors.ts`) en message lisible.
- **Les types suivent la base.** Toute migration qui change une table met à jour `src/types/database.ts` dans le même commit.

## Crédits

- Fond de carte : © OpenStreetMap, servi par OpenFreeMap. Vue satellite : © IGN.
- Icônes « Pêche » et « Urbex » : [Game-icons.net](https://game-icons.net), licence CC BY 3.0.
- Icône « Bivouac » : [Game-icons.net](https://game-icons.net), licence CC BY 3.0.
- Autres icônes : Lucide (ISC), Lucide Lab (ISC), Pinhead (CC0), Iconmind (CC0), Boxicons (MIT), Material Symbols (Apache 2.0), Fluent Emoji (MIT), Google Cloud Icons (Apache 2.0).
- Police : Barlow (SIL Open Font License).
