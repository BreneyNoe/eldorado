# Sécurité et performances

## Qui protège quoi

| Risque | Protection | Où |
|---|---|---|
| Lire ou modifier les données sans y être autorisé | Règles RLS : la base vérifie chaque requête, quel que soit le client | `supabase/migrations/…_rls_grants.sql` |
| Un inconnu se crée un compte | L'inscription est libre : c'est un choix assumé. Un administrateur peut bannir un compte, et fermer les inscriptions dans Supabase | migration 14, `docs/comptes.md` |
| Vol de la clé secrète | Elle n'est jamais dans l'application : seule la clé publique y figure | `.env.local`, `src/config/env.ts` |
| Un membre s'accorde le rôle admin | La base refuse de modifier `role` et `is_active` à qui n'est pas admin | migration 2 |
| Code malveillant glissé dans un texte (nom, description, update) | Les textes sont toujours affichés comme du texte, jamais comme du HTML | tous les écrans |
| Même risque, seconde ligne de défense | Politique de sécurité du contenu : le navigateur n'exécute que les scripts de l'application | `vite.config.ts` |
| Envoi d'un fichier dangereux | Le bucket n'accepte que des JPEG de 2 Mo au plus, à un chemin imposé | migration 5 |
| Photo de profil déplacée, ou profil pointant vers la photo d'un autre | Chacun n'écrit que dans son dossier du bucket `avatars` ; le chemin enregistré doit commencer par son propre identifiant ; un admin peut retirer un avatar | migration 16 |
| Spot noyé sous les photos | 10 photos par spot, limite appliquée par la base | migration 11 |
| Données d'un utilisateur lues par le suivant sur le même téléphone | La déconnexion efface ce que l'application gardait sur l'appareil | `src/lib/queryPersister.ts` |
| Fuite de la position des photos | Les fichiers envoyés sont redessinés : ils ne contiennent plus de position | `docs/photos.md` |

Le principe à retenir : **rien de ce que fait l'application dans le navigateur n'est une protection.** Masquer un bouton est un confort. Ce sont les règles de la base qui décident.

## Politique de sécurité du contenu

La page construite (`npm run build`) contient une politique qui :

- n'autorise que les scripts de l'application, plus le petit script d'erreur de démarrage, reconnu par son empreinte ;
- interdit le code fabriqué à partir de texte (`eval`) ;
- interdit les objets intégrés et le changement d'adresse de base de la page.

Les images et les appels réseau sont autorisés vers tout site en `https` : le fond de carte, les photos aériennes et les icônes viennent de plusieurs serveurs, et les restreindre un par un casserait la carte au premier changement chez un fournisseur.

Elle n'est pas posée en développement (`npm run dev`), où Vite a besoin de scripts qu'elle interdirait.

Limite connue : GitHub Pages ne permet pas d'envoyer d'en-têtes de sécurité. La politique passe donc par une balise de la page, ce qui ne permet pas d'interdire l'affichage du site dans le cadre d'un autre site.

## Réglages à vérifier dans Supabase

- **Authentication → Sign In / Providers** : « Allow new users to sign up » activé et « Confirm email » désactivé (voir `docs/comptes.md`).
- **Administration → Utilisateurs**, dans l'application : à consulter régulièrement, pour bannir les comptes que tu ne reconnais pas.
- **Storage → spot-photos** : bucket public, limite 2 Mo, type `image/jpeg`.
- **Project Settings → API Keys** : la clé `sb_secret_…` n'a été copiée nulle part dans le projet.

Le script `supabase/admin/verify_install.sql` contrôle le reste : chaque ligne doit afficher `ok = true`.

## Performances

- **Chargement en deux temps.** L'écran de connexion est léger. La carte (MapLibre, environ 1 Mo) n'est chargée qu'après la connexion ; l'administration et la création, seulement quand on les ouvre.
- **Après la première visite**, tout le code est gardé sur l'appareil : les ouvertures suivantes ne retéléchargent rien.
- **Carte.** Tous les spots sont chargés en une fois sous une forme légère, puis regroupés par le navigateur. Les marqueurs sont dessinés par la carte elle-même, pas comme des éléments de page.
- **Photos.** Une miniature de 400 px dans les listes et les aperçus, l'image de 1 600 px seulement dans la fiche et la visionneuse. Les images hors écran ne sont chargées qu'à l'approche.
- **Listes.** 30 lignes à la fois, 20 updates à la fois.
- **Réseau.** Une donnée chargée est réutilisée pendant une minute avant d'être redemandée.

Si la carte ralentit un jour avec plusieurs milliers de spots, la base propose déjà une fonction qui ne renvoie que les spots de la zone affichée (`spots_in_bbox`). L'application ne l'utilise pas encore : ce n'est pas utile à cette échelle.
