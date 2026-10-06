# Tests

## La commande à retenir

```powershell
npm run check
```

Elle enchaîne trois vérifications et s'arrête à la première qui échoue :

1. **Les types** (`tsc`) : le code est cohérent avec lui-même et avec la forme de la base.
2. **Le lint** (`oxlint`) : pas d'erreur courante ni de code mort.
3. **Les tests automatiques** (`vitest`) : environ 400 tests, en quelques secondes.

À lancer avant chaque `git push`. GitHub la relance de toute façon à chaque envoi : si elle échoue, rien n'est publié et le site reste sur la version précédente.

## Ce que couvrent les tests automatiques

Ils portent sur la logique de l'application, celle qui ne dépend ni d'un écran ni d'un serveur :

| Domaine | Exemples de ce qui est vérifié |
|---|---|
| Configuration et erreurs | Variables manquantes ou mal formées ; chaque erreur de Supabase traduite en message clair |
| Authentification | États de session (connecté, banni, profil manquant) ; validation des formulaires de connexion, d'inscription, de mot de passe |
| Carte | Vue de départ, vue enregistrée, conversion des spots en marqueurs, style satellite |
| Spots | Filtres (recherche, types principal et supplémentaires), tris, distances, brouillon de création, droits de modification |
| Photos | Date de prise de vue, tailles, chemins de stockage, proposition de position, message de limite |
| Notes | Demi-étoiles, moyennes, regroupement par type |
| Journal | Règles de publication et de modification, pagination |
| Point Google Maps | Lecture de coordonnées et de liens, messages d'échec |
| Administration | Clés générées, validations, calcul du stockage |
| Profils | Couleur et initiale par défaut, rangs et seuils, tailles des ornements |
| Composants | Saisie des étoiles, formulaire de création, éditeur de notes, avatar, garde d'accès |

Lancer un seul fichier pendant qu'on travaille dessus :

```powershell
npx vitest run src/lib/avatar.test.ts
```

Ou garder les tests ouverts, relancés à chaque enregistrement : `npm run test:watch`.

## Ce que les tests automatiques ne couvrent pas

- **Les règles de la base** (qui a le droit de lire ou d'écrire quoi). Elles ont été vérifiées à chaque étape sur une base PostgreSQL locale, avec des scripts qui se font passer tour à tour pour un visiteur, un membre, un autre membre, un compte banni et un administrateur. Ces scripts ne font pas partie du projet : ils demandent une base de test à part.
- **Les parcours dans un navigateur** (créer un spot, envoyer une photo, passer hors ligne…). Ils ont été rejoués à chaque étape dans un navigateur au format iPhone, contre un faux Supabase. Ils ne font pas partie du projet non plus : ils demandent un outillage (Python, Playwright) hors de proportion pour un usage courant.
- **Le vrai Supabase, un vrai iPhone, les vrais fonds de carte.** Aucun test automatique ne les atteint. C'est le rôle de la recette manuelle : voir [recette.md](recette.md).

En pratique : `npm run check` protège contre les régressions de logique ; la recette manuelle confirme que tout fonctionne en conditions réelles. Après une modification importante, fais les deux.

## Mesurer ce que les tests exécutent

```powershell
npm run test:coverage
```

Cette commande indique quelle part du code est exécutée par les tests automatiques, et produit un rapport détaillé dans le dossier `coverage` (ouvrir `coverage/index.html`). À la fin de l'étape 17 :

| Famille de fichiers | Part des lignes exécutées |
|---|---|
| Logique (`logic/`, `lib/`, `config/`) | 92 % |
| Composants et écrans | 22 % |
| Hooks, moteur de carte | 10 % |
| Accès à la base (`api/`) | 4 % |
| **Ensemble** | **33 %** |

Ces chiffres disent bien ce qu'ils disent : la logique est presque entièrement couverte ; les écrans et les échanges avec Supabase ne le sont presque pas par ces tests-là. Ce sont les parcours dans un navigateur qui les ont vérifiés pendant le développement (18 parcours, 439 étapes, tous réussis sur la version construite à la fin de l'étape 17), et c'est la recette manuelle qui les vérifie en conditions réelles.

## Ajouter un test

Un test se range à côté du fichier qu'il vérifie, avec le suffixe `.test.ts` (ou `.test.tsx` pour un composant). Le plus simple est de copier un test voisin. Les fonctions de `src/**/logic/` et de `src/lib/` sont « pures » : elles se testent sans rien simuler.

Quand un bug est corrigé, ajoute le test qui l'aurait attrapé : c'est ce qui l'empêche de revenir.
