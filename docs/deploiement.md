# Mettre l'application en ligne

L'application est publiée gratuitement sur **GitHub Pages**. À chaque envoi de ton code sur GitHub, une tâche automatique le vérifie, construit le site et le met en ligne. Tu n'as rien à téléverser à la main.

Compte une demi-heure pour la première fois. Les étapes 1 à 5 ne se font qu'une fois.

## Ce qu'il te faut

- Un compte sur https://github.com (gratuit).
- L'adresse de ton projet Supabase et sa clé publique : ce sont les deux valeurs de ton fichier `.env.local`.

## 1. Installer Git

Dans PowerShell :

```powershell
winget install --id Git.Git -e
```

Ferme PowerShell, rouvre-le, puis présente-toi à Git (ces valeurs signent tes envois) :

```powershell
git config --global user.name "Ton nom"
git config --global user.email "ton.email@exemple.com"
```

## 2. Créer le dépôt sur GitHub

1. Sur GitHub, clique sur **+** en haut à droite, puis **New repository**.
2. **Repository name** : `eldorado`. Ce nom fera partie de l'adresse du site.
3. Choisis **Public**. GitHub Pages est gratuit pour les dépôts publics.
4. Ne coche rien d'autre (ni README, ni .gitignore), puis **Create repository**.

Public veut dire que le code est visible de tous. Ce n'est pas un problème : il ne contient aucun secret. Tes données, elles, sont dans Supabase, protégées par les règles de la base.

## 3. Donner au dépôt l'adresse de Supabase

Dans le dépôt : **Settings → Secrets and variables → Actions**, onglet **Variables**, bouton **New repository variable**. Crée ces deux variables, avec les valeurs de ton `.env.local` :

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

Ce sont des **variables**, pas des secrets : ces deux valeurs se retrouvent de toute façon dans le site publié. La clé secrète de Supabase (`sb_secret_…`), elle, ne doit jamais être saisie ici ni ailleurs dans le projet.

## 4. Activer GitHub Pages

Dans le dépôt : **Settings → Pages**. Sous **Build and deployment**, règle **Source** sur **GitHub Actions**.

## 5. Envoyer le code

Dans PowerShell, en remplaçant `TON-COMPTE` par ton nom d'utilisateur GitHub :

```powershell
cd C:\dev\spots-app
git init -b main
git add .
git status
```

Vérifie dans la liste affichée que `.env.local` n'apparaît **pas** : ce fichier doit rester sur ton ordinateur. Puis :

```powershell
git commit -m "Première version"
git remote add origin https://github.com/TON-COMPTE/eldorado.git
git push -u origin main
```

Au premier envoi, une fenêtre s'ouvre pour te connecter à GitHub. Des avertissements « LF will be replaced by CRLF » peuvent s'afficher : ils sont sans conséquence.

## 6. Suivre la publication

Dans le dépôt, onglet **Actions** : la tâche **Publier sur GitHub Pages** tourne pendant deux à trois minutes. Quand elle passe au vert, le site est en ligne à l'adresse :

```
https://TON-COMPTE.github.io/eldorado/
```

Si la tâche a démarré avant que tu aies fait les étapes 3 et 4, elle échoue : ouvre-la et clique sur **Re-run all jobs**.

## 7. Dernières touches dans Supabase

Dans le **SQL Editor**, exécute le contenu de `supabase/migrations/20261007100000_ping.sql`. Il crée la petite fonction qu'utilise la tâche décrite ci-dessous.

## 8. Installer sur iPhone

Ouvre l'adresse du site dans Safari, puis **Partager → Sur l'écran d'accueil**. Le détail est dans [pwa.md](pwa.md). Si tu avais créé une icône d'essai depuis ton ordinateur, supprime-la d'abord.

## Publier une nouvelle version

Après chaque modification du projet (une archive que tu installes, par exemple) :

```powershell
cd C:\dev\spots-app
npm run check
git add .
git commit -m "Ce qui a changé, en quelques mots"
git push
```

La tâche se relance toute seule. Sur les téléphones, l'application affiche « Une nouvelle version est disponible » avec un bouton **Mettre à jour**.

Si une vérification échoue sur GitHub, rien n'est publié : la version en ligne reste la précédente.

## Garder Supabase éveillé

Supabase met en pause un projet gratuit resté une semaine sans activité. La tâche **Garder Supabase éveillé** lui envoie une requête tous les trois jours.

- Pour vérifier qu'elle fonctionne : onglet **Actions**, clique sur son nom, puis **Run workflow**. Elle doit passer au vert.
- GitHub suspend les tâches planifiées d'un dépôt resté 60 jours sans modification, après un e-mail d'avertissement. Réactive-la alors dans l'onglet **Actions**, ou envoie n'importe quelle modification.
- Si le projet a quand même été mis en pause : tableau de bord Supabase, bouton **Restore**. Les données sont conservées.

## En cas de problème

| Ce que tu vois | Cause | Solution |
|---|---|---|
| La tâche échoue à « Refuser un site sans configuration » | Les deux variables manquent | Étape 3, puis **Re-run all jobs** |
| La tâche échoue à « Vérifier » | Un test ou une vérification ne passe pas | Lance `npm run check` sur ton ordinateur pour voir lequel |
| La tâche échoue à « Mettre en ligne » | GitHub Pages n'est pas activé | Étape 4, puis **Re-run all jobs** |
| L'adresse affiche « 404 » | La publication n'est pas terminée, ou Pages n'est pas activé | Attends la fin de la tâche ; vérifie l'étape 4 |
| « Eldorado ne peut pas démarrer » | Une variable est vide ou mal recopiée | Corrige-la (étape 3) et relance la tâche |
| Page blanche après avoir renommé le dépôt | Le site est construit pour l'ancienne adresse | Relance la tâche : elle reprend le nouveau nom |
| L'ancienne version s'affiche encore | Le téléphone garde le code en mémoire | Touche **Mettre à jour**, ou ferme et rouvre l'application |

## Cas particuliers

**Nom de domaine personnalisé, ou dépôt nommé `TON-COMPTE.github.io`.** Le site est alors servi à la racine, et non sous `/eldorado/`. Ajoute une troisième variable `VITE_BASE_PATH` valant `/`.

**Autres réglages facultatifs.** `VITE_MAP_STYLE_URL`, `VITE_SATELLITE_TILES_URL` et `VITE_GEOCODER_URL` ont de bonnes valeurs par défaut. Pour les changer en ligne, ajoute-les aux variables du dépôt et dans le fichier `.github/workflows/deploy.yml`, à côté des deux premières.

## Ce que ça coûte

Rien : dépôt public, GitHub Pages et tâches automatiques sont gratuits pour un dépôt public, et Supabase reste sur son plan gratuit.
