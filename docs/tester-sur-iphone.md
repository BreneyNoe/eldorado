# Tester sur un iPhone pendant le développement

La localisation et la caméra n'acceptent de fonctionner que sur une adresse en **https**. En développement, l'application tourne sur ton ordinateur en simple http : il faut donc un mode spécial pour l'essayer sur le téléphone.

## Méthode

1. L'ordinateur et l'iPhone doivent être sur le **même Wi-Fi**.
2. Sur l'ordinateur :

   ```powershell
   npm run dev:https
   ```

   Le terminal affiche deux adresses. Celle qui t'intéresse est la ligne **Network**, de la forme `https://192.168.x.x:5173/`.
3. Au premier lancement, Windows peut demander d'autoriser Node.js à travers le pare-feu : accepte pour les réseaux privés.
4. Sur l'iPhone, ouvre cette adresse dans **Safari**.
5. Safari prévient que la connexion n'est pas privée : c'est normal, le certificat est fabriqué par ton ordinateur et aucune autorité ne le connaît. Choisis **Afficher les détails**, puis **Consulter ce site web**.

## Limites à connaître

- Ce mode ne sert qu'aux essais. L'avertissement de Safari disparaîtra une fois le site déployé sur GitHub Pages (étape 18), qui fournit un vrai certificat.
- Il n'est pas garanti que Safari accorde la localisation à un site dont le certificat n'est pas reconnu. Si le bouton « Ma position » répond que la localisation exige une connexion sécurisée, l'essai devra attendre le déploiement.
- L'installation sur l'écran d'accueil et le fonctionnement hors ligne se testent uniquement sur le site déployé.
- L'adresse `192.168.x.x` change si l'ordinateur change de réseau.

## Si Safari n'ouvre pas le site

Commence par repérer ce que Safari affiche, puis suis la ligne correspondante.

| Ce que Safari affiche | Cause probable | Quoi faire |
|---|---|---|
| « Safari ne peut pas ouvrir la page » ou attente sans fin | L'iPhone n'atteint pas l'ordinateur | Voir « Réseau et pare-feu » ci-dessous |
| « Cette connexion n'est pas privée » | Certificat local, c'est attendu | **Afficher les détails**, puis **Consulter ce site web** |
| « Blocked request. This host is not allowed » | Adresse saisie avec le nom de l'ordinateur | Utiliser l'adresse en chiffres de la ligne **Network** |
| Écran bleu nuit « L'application n'a pas pu démarrer » | Erreur de l'application | Faire une capture : elle contient l'erreur et la version de Safari |
| Page blanche pendant plus de 20 secondes | Chargement bloqué | Recharger ; si cela persiste, voir « Réseau et pare-feu » |

### Isoler le problème en une minute

Arrête le serveur, lance `npm run dev:lan`, puis ouvre sur l'iPhone l'adresse **Network** en `http://` (sans « s »).

- **La page de connexion s'affiche** : le réseau fonctionne, le problème vient de l'étape du certificat en https.
- **Rien ne s'affiche** : le problème est le réseau ou le pare-feu.

Dans ce mode, la connexion et la carte fonctionnent, mais pas la localisation.

### Réseau et pare-feu

1. Ouvre l'adresse **Network** dans le navigateur de l'ordinateur lui-même. Si elle ne s'ouvre pas, le serveur n'a pas été lancé avec `dev:lan` ou `dev:https`.
2. Vérifie que l'iPhone est sur le même Wi-Fi que l'ordinateur : pas en 4G/5G, pas sur un réseau « invités », pas derrière un VPN.
3. Vérifie le pare-feu de Windows. Dans PowerShell **en tant qu'administrateur** :

   ```powershell
   Get-NetConnectionProfile
   ```

   Si `NetworkCategory` vaut `Public`, Windows bloque les connexions entrantes. Passe ce réseau en privé (remplace `Wi-Fi` par le nom affiché dans `InterfaceAlias`) :

   ```powershell
   Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
   ```

   Puis autorise le port du serveur de développement :

   ```powershell
   New-NetFirewallRule -DisplayName "Vite dev 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
   ```

4. Si rien ne change, une règle de blocage a pu être créée le jour où la demande du pare-feu a été refusée. Pour la voir :

   ```powershell
   Get-NetFirewallRule -DisplayName "Node.js*" | Format-Table DisplayName, Action, Enabled, Profile
   ```

   Une ligne dont `Action` vaut `Block` l'emporte sur toute autorisation. Pour la retirer :

   ```powershell
   Get-NetFirewallRule -DisplayName "Node.js*" | Where-Object Action -eq Block | Remove-NetFirewallRule
   ```

5. Certaines box isolent les appareils Wi-Fi les uns des autres (« isolation des clients »). Dans ce cas, aucun réglage de l'ordinateur n'y changera rien : le test attendra le déploiement.

## Version d'iOS nécessaire

L'application demande Safari 16.4 ou plus récent, donc iOS 16.4 au minimum. Sur une version plus ancienne, l'affichage est cassé ou la carte ne démarre pas.
