# Base de données Supabase

Tout le backend de l'application tient dans ce dossier : tables, règles de sécurité, fonctions, stockage des photos.

## Contenu

| Fichier | Rôle |
|---|---|
| `migrations/` | Les fichiers SQL de référence, à appliquer dans l'ordre de leur nom |
| `install_all.sql` | Toutes les migrations réunies en un seul fichier à coller (généré, ne pas modifier) |
| `functions/resolve-map-link/` | Fonction serveur facultative qui lit les liens courts de Google Maps (voir `docs/google-maps.md`) |
| `admin/make_first_admin.sql` | Désigne le premier administrateur |
| `admin/verify_install.sql` | Vérifie l'installation, ne modifie rien |
| `admin/reset_password.sql` | Donne un mot de passe provisoire à un utilisateur |
| `seed/demo_spots.sql` | Crée 30 spots de démonstration, marqués `[demo]` |
| `seed/remove_demo_spots.sql` | Retire les spots de démonstration, sans toucher aux vrais |
| `admin/reset_schema.sql` | **Danger** : supprime toutes les données de l'application (développement uniquement) |

## Installation sur un projet Supabase neuf

1. Créer le projet sur supabase.com (plan Free, région en Europe). Noter le mot de passe de la base dans un gestionnaire de mots de passe : il ne va jamais dans le code.
2. Fermer l'inscription publique : **Authentication → Sign In / Providers**, désactiver « Allow new users to sign up », et dans le fournisseur **Email**, désactiver « Confirm email ».
3. **SQL Editor → New query** : coller le contenu de `install_all.sql`, puis **Run**. Confirmer l'avertissement « destructive operation » (dû aux lignes `drop ... if exists`).
4. Créer son compte : **Authentication → Users → Add user → Create new user**, avec « Auto Confirm User » coché.
5. Ouvrir `admin/make_first_admin.sql`, remplacer l'email aux deux endroits, exécuter dans le SQL Editor.
6. Exécuter `admin/verify_install.sql` : toutes les lignes doivent afficher `ok = true`.

## Mettre à jour une base déjà installée

Quand une nouvelle migration apparaît dans `migrations/`, exécute ce seul fichier dans le **SQL Editor**. `install_all.sql` ne sert qu'aux installations neuves.

## Ajouter un utilisateur

**Authentication → Users → Add user → Create new user**, « Auto Confirm User » coché. Son profil est créé automatiquement, avec le début de son email comme nom affiché.

## Modifier le schéma plus tard

Ne jamais modifier un fichier de migration déjà appliqué. Créer un nouveau fichier dans `migrations/`, nommé avec la date et l'heure (`AAAAMMJJHHMMSS_description.sql`), et l'exécuter dans le SQL Editor.

## Codes d'erreur renvoyés par la base

Le frontend traduit ces codes en messages lisibles.

| Code | Signification |
|---|---|
| `APP_FORBIDDEN_PROFILE_FIELDS` | Un non-admin tente de changer un rôle ou l'état d'un compte |
| `APP_LAST_ADMIN` | Il doit rester au moins un administrateur actif |
| `APP_SPOT_TYPE_INACTIVE` | Création d'un spot sur un type désactivé |
| `APP_COVER_NOT_IN_SPOT` | La photo de couverture n'appartient pas au spot |
| `APP_RATING_CATEGORY_MISMATCH` | La catégorie de note ne correspond pas au type du spot |
| `APP_RATING_CATEGORY_INACTIVE` | Nouvelle note sur une catégorie désactivée |
| `APP_INVALID_RATINGS` | Format de notes invalide |
| `APP_ADMIN_ONLY` | Fonction réservée aux administrateurs |
