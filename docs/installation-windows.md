# Installation sous Windows

Toutes les commandes se tapent dans **PowerShell** (menu Démarrer → « PowerShell ») ou dans le terminal de VS Code.

## 1. Installer les outils

```powershell
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
winget install --id Microsoft.VisualStudioCode -e
```

Ferme puis rouvre PowerShell, et vérifie :

```powershell
node -v
npm -v
git --version
```

Node doit être en version 24.15 ou plus récente (ou 22.22.2 et plus sur la branche 22).

### Si `npm` affiche « l'exécution de scripts est désactivée sur ce système »

C'est un réglage de sécurité de PowerShell. Autorise les scripts pour ton compte, une fois pour toutes :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## 2. Installer le projet

Décompresse l'archive dans `C:\dev`, de façon à obtenir `C:\dev\spots-app`.

```powershell
cd C:\dev\spots-app
npm install
```

## 3. Configurer l'accès à Supabase

```powershell
Copy-Item .env.example .env.local
code .
```

Dans VS Code, ouvre `.env.local` et remplace les deux valeurs d'exemple :

| Variable | Où la trouver dans Supabase |
|---|---|
| `VITE_SUPABASE_URL` | Project Settings → Data API. Seule la partie `https://<projet>.supabase.co` compte |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key (`sb_publishable_...`) |

Le bouton **Connect**, en haut du tableau de bord, affiche aussi ces deux valeurs.

Ne copie jamais la clé **secret** (`sb_secret_...`) : l'application refuse de démarrer si elle la détecte.

## 4. Lancer

```powershell
npm run dev
```

Ouvre http://localhost:5173. L'écran de vérification doit afficher trois coches vertes.

Pour arrêter le serveur : `Ctrl + C` dans le terminal.

## 5. Mettre le projet sur GitHub

Une seule fois, présente-toi à Git (utilise l'email de ton compte GitHub) :

```powershell
git config --global user.name "Ton Nom"
git config --global user.email "ton.email@exemple.com"
```

Crée le dépôt local :

```powershell
cd C:\dev\spots-app
git init -b main
git add .
git status
```

Avant de continuer, relis la liste affichée par `git status` : `.env.local` et `node_modules` ne doivent **pas** y figurer.

```powershell
git commit -m "Initialisation du projet"
```

Sur github.com, crée un dépôt **public** nommé `spots-app`, **sans** README, sans .gitignore et sans licence (le projet les a déjà). Puis, en remplaçant `TON_COMPTE` :

```powershell
git remote add origin https://github.com/TON_COMPTE/spots-app.git
git push -u origin main
```

Au premier envoi, une fenêtre de navigateur s'ouvre pour te connecter à GitHub.

## Au quotidien

```powershell
npm run check
git add .
git commit -m "Ce que j'ai fait"
git push
```

`npm run check` enchaîne la vérification des types, l'analyse du code et les tests.
