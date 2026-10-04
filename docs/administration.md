# Administration

Les administrateurs ont un lien **Administration** dans l'écran « Mon compte ». Il mène à six onglets, utilisables sur téléphone comme sur ordinateur.

Un simple membre qui saisirait l'adresse à la main voit un écran « Accès réservé ». Ce garde n'est qu'un confort : c'est la base qui refuse, à chaque requête, de donner ou de modifier quoi que ce soit à qui n'est pas administrateur.

## Utilisateurs

- Liste des comptes, les plus récents en tête : nom, e-mail, rôle, état, date d'inscription, dernière connexion.
- **Nommer admin / Retirer le rôle admin.**
- **Bannir / Rétablir.** Un compte banni ne voit plus rien et ne peut plus rien ajouter ; ses spots, photos et updates restent en place.
- La base refuse de retirer ou de bannir le dernier administrateur actif.

L'inscription est libre : chacun crée son compte depuis l'écran de connexion. La suppression d'un compte et la remise d'un mot de passe se font dans Supabase : voir [comptes.md](comptes.md).

## Spots

Tous les spots, avec une recherche par nom et l'accès à la fiche et à l'écran de modification. La suppression d'un spot se trouve en bas de son écran « Modifier ».

## Photos

Les photos de tous les spots, des plus récentes aux plus anciennes. Toucher une photo propose de la supprimer.

## Updates

Les updates de tous les spots, des plus récents aux plus anciens, avec leur suppression. Un administrateur ne peut pas réécrire le texte d'un autre.

## Types

Pour chaque type de spot : ses catégories de notes et ses sous-catégories.

- **Modifier** : libellé, couleur, icône, ordre d'affichage, activation.
- **Ajouter** un type, une catégorie de notes, une sous-catégorie.
- **Rien ne se supprime : on désactive.** Un élément désactivé n'est plus proposé à la création, mais les spots et les notes qui l'utilisent sont conservés.

La clé technique d'un nouvel élément est fabriquée à partir de son libellé (« Plans inclinés » donne `plans_inclines`) et ne change plus ensuite, même si on le renomme.

Icônes : un type choisit la sienne dans une liste ; une sous-catégorie saisit un nom Iconify. Voir [types-et-sous-categories.md](types-et-sous-categories.md).

## Réglages

- **Rayon de détection des doublons**, en mètres (100 par défaut).
- **Photos par spot** : nombre maximal de photos qu'un spot peut recevoir (10 par défaut).
- **Stockage des photos** : espace utilisé sur le gigaoctet gratuit, nombre de photos et de fichiers.
- **Fichiers orphelins** : fichiers qu'aucune photo n'utilise, restes d'un envoi ou d'une suppression interrompus. Un bouton les supprime. Les fichiers de moins d'une heure sont ignorés, car un envoi est peut-être en cours.
- **Diagnostic** : vérifie que l'application joint bien Supabase.
