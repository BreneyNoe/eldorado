# Sauvegarde

Le plan gratuit de Supabase ne fait aucune sauvegarde à ta place. Cette commande copie tout sur ton ordinateur :

```powershell
npm run backup
```

Elle ne modifie rien dans Supabase : elle ne fait que lire.

## Mise en place, une seule fois

La sauvegarde a besoin de la **clé secrète** du projet : elle seule peut tout lire, y compris les notes de chacun.

1. Dans Supabase : **Project Settings → API Keys**, section **Secret keys**. Copie la clé qui commence par `sb_secret_`.
2. Dans le dossier `C:\dev\spots-app`, crée un fichier nommé `.env.backup.local` contenant une seule ligne :

```
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxx
```

Dans PowerShell, pour le créer et l'ouvrir d'un coup :

```powershell
notepad C:\dev\spots-app\.env.backup.local
```

**Cette clé donne tous les droits sur ta base.** Elle ne doit jamais être mise ailleurs que dans ce fichier : ni dans `.env.local`, ni dans GitHub, ni dans un message. Le fichier est ignoré par Git, comme le dossier des sauvegardes : `git status` ne doit jamais les lister.

## Ce que contient une sauvegarde

Tout est rangé dans `C:\dev\spots-app\backups` :

```
backups/
├─ 2026-10-06_1432/          une sauvegarde, datée
│  ├─ donnees/               un fichier par table : spots, notes, updates, profils, types…
│  │  └─ comptes.json        identifiant et e-mail de chaque compte
│  └─ manifeste.json         le résumé : nombre de lignes, de fichiers, problèmes éventuels
└─ fichiers/                 les photos, communes à toutes les sauvegardes
   ├─ spot-photos/
   └─ avatars/
```

- Les photos ne sont téléchargées qu'une fois : les sauvegardes suivantes ne prennent que les nouvelles, et durent quelques secondes.
- **Les mots de passe ne sont pas sauvegardés** : personne ne peut les lire, pas même avec la clé secrète.
- La commande se termine par « Sauvegarde complete. ». Si elle liste des points « A regarder », le détail est dans `manifeste.json`.

## À quelle fréquence

Une fois par mois suffit pour un petit groupe, et avant toute opération risquée (une migration, une suppression en masse). Copie de temps en temps le dossier `backups` ailleurs que sur ton ordinateur : une clé USB, un disque externe. Il contient les e-mails et les photos de tes amis : ne le mets pas sur un espace partagé.

## Si la base est perdue ou abîmée

Une sauvegarde contient tout ce qu'il faut pour reconstruire l'application : les données, les comptes, les photos. **Mais il n'existe pas encore de commande qui la réinjecte automatiquement dans Supabase.**

Ce qu'une restauration demande, dans l'ordre :

1. Un projet Supabase en état de marche (le même, ou un nouveau), avec le schéma installé par `supabase/install_all.sql`.
2. Recréer les comptes à partir de `comptes.json`. Les mots de passe sont à redonner à chacun.
3. Réinjecter les tables dans le bon ordre, en reliant chaque spot, photo, note et update au bon compte.
4. Renvoyer les photos dans le stockage.

Les étapes 3 et 4 demandent un script, à écrire et surtout à essayer une fois « à blanc » sur un second projet Supabase gratuit : une restauration jamais essayée n'est pas une garantie. Tant que ce n'est pas fait, la sauvegarde te protège contre la perte des données, mais les remettre en place demandera un travail à la main.

## Erreurs possibles

| Message | Cause | Solution |
|---|---|---|
| « la cle secrete est introuvable » | Le fichier `.env.backup.local` manque ou est mal nommé | Refaire la mise en place |
| « la cle fournie est la cle publique » | La clé copiée commence par `sb_publishable_` | Prendre celle de la section Secret keys |
| « 401 sur … » | La clé est erronée ou a été révoquée | En recopier une valide |
| « fichier introuvable : … » | Une photo est référencée en base mais absente du stockage | Sans gravité pour le reste ; la supprimer depuis l'administration |
