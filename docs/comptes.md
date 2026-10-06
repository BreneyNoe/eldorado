# Gérer les comptes

L'inscription publique est fermée et l'application n'envoie aucun email. Les comptes se gèrent donc depuis le tableau de bord Supabase, par un administrateur.

## Inscription : libre, avec bannissement après coup

1. La personne ouvre l'application, touche **Créer un compte**, choisit son nom, son e-mail et son mot de passe.
2. Elle accède aussitôt aux spots, comme simple membre.
3. L'administrateur consulte **Administration → Utilisateurs** : les inscrits les plus récents sont en tête, avec leur e-mail et leur date d'inscription.
4. Pour écarter quelqu'un : **Bannir**. La personne perd tout accès, immédiatement. **Rétablir** le lui rend.

### Ce que ce choix implique

L'adresse du site est publique. Quiconque la connaît peut donc créer un compte, voir tous les spots et en ajouter, jusqu'à ce que tu le bannisses.

- Bannir ne supprime pas ce que la personne a ajouté : ses spots, photos et updates restent, et se suppriment séparément depuis l'administration.
- L'e-mail n'étant pas vérifié, une personne bannie peut se réinscrire avec une autre adresse.
- La parade : quand ton groupe est au complet, **ferme les inscriptions** dans Supabase (voir ci-dessous). Les comptes existants continuent de fonctionner, et tu rouvres le temps d'accueillir quelqu'un.

### Deux réglages à faire une fois dans Supabase

Dans **Authentication → Sign In / Providers** :

- **Allow new users to sign up** : activé. Le désactiver ferme les inscriptions.
- **Email**, option **Confirm email** : désactivée. Sans cela, Supabase attend que la personne clique sur un e-mail de confirmation, que le plan gratuit n'envoie pas.

### À savoir

- Un compte banni voit un écran « Accès retiré » et rien d'autre : la base lui refuse toute lecture.
- Un compte créé à la main dans le tableau de bord Supabase est actif lui aussi.
- L'inscription ne peut jamais donner le rôle d'administrateur : il s'attribue uniquement depuis l'administration.

## Créer un compte

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Saisir l'email et un mot de passe provisoire, cocher « Auto Confirm User ».
3. Transmettre les identifiants à la personne. Elle change son mot de passe dans l'application : **Mon compte → Mot de passe**.

Le profil est créé automatiquement, avec le début de l'email comme nom affiché. La personne le modifie dans **Mon compte**.

## Photo ou icône de profil

Dans **Mon compte**, chacun peut choisir :

- **une photo** : elle est recadrée en carré et allégée sur l'appareil avant l'envoi (256 px, quelques dizaines de Ko) ;
- **une icône**, parmi une douzaine ;
- **rien** : c'est alors l'initiale du nom qui s'affiche, sur une couleur qui dépend du nom.

L'avatar apparaît à côté du nom de la personne : sur les fiches qu'elle a créées, dans le journal, sous les photos qu'elle a ajoutées, et sur le bouton du compte.

Les photos de profil sont dans un bucket à part, `avatars`. Chacun n'écrit que dans son propre dossier, et la base refuse qu'un profil pointe vers la photo d'un autre. Changer de photo supprime l'ancienne.

Un administrateur peut retirer l'avatar d'un compte : **Administration → Utilisateurs → Retirer l'avatar**.

### Couleur du fond

Sous les icônes, une palette permet de choisir la couleur du disque derrière l'icône ou l'initiale. « Auto » revient à la couleur tirée du nom. Sur une couleur claire, le dessin passe automatiquement en sombre pour rester lisible. La couleur ne s'affiche pas derrière une photo.

## Rangs et ornements

Un ornement entoure l'avatar de ceux qui publient des spots. Il change avec le nombre de spots publiés :

| Spots publiés | Rang | Ornement |
|---|---|---|
| 5 | Cheap researcher (Bronze) | Tourbillon de bronze |
| 15 | Explorer (Argent) | Tourbillon d'argent |
| 30 | Spot Finder (Or) | Couronne d'or tressée |
| 50 | Land Guardians (Platine) | Tourbillon d'argent serti de rubis |
| 80 | Cavalier of Eldorado (Acier noir et argent) | Grande roue dentée d'acier, au cadran romain |

- L'ornement apparaît partout où l'avatar apparaît. L'avatar garde sa taille et l'ornement s'ajoute autour ; sur le bouton rond du compte, le tout est réduit pour tenir dans le bouton.
- L'ornement du dernier rang est très large (plus de trois fois l'avatar). Pour qu'il ne prenne pas toute la place, l'ensemble est alors plafonné à 2,4 fois la taille d'un avatar nu, et à 320 px de large.
- **Une annonce** félicite l'utilisateur quand il atteint un nouveau rang, y compris à l'instant où il publie le spot décisif. Elle ne s'affiche qu'une fois, quel que soit l'appareil : le dernier rang annoncé est retenu dans son profil.
- L'écran **Mon compte** indique le rang, le nombre de spots publiés et ce qui manque pour le suivant.
- Seuls les spots créés comptent, pas les photos ni les updates. Un spot supprimé n'est plus compté : un rang peut donc se perdre.
- Le compte est tenu par la base, à chaque création ou suppression de spot. Personne ne peut le modifier à la main, pas même un administrateur depuis l'application.

## Profil d'un utilisateur

Toucher l'avatar ou le nom de quelqu'un ouvre son profil : sur une fiche (« Ajouté par… »), dans le journal, sous une photo dans la visionneuse, et dans la liste des comptes de l'administration. Depuis **Mon compte**, « Voir mon profil » ouvre le sien.

Le profil montre :

- l'avatar et son ornement, en grand ;
- le rang, le rôle d'administrateur le cas échéant, et la date d'inscription ;
- trois chiffres : spots publiés, photos ajoutées, updates publiés ;
- le prochain ornement à obtenir ;
- les cinq derniers spots de la personne, avec un lien vers chacun.

Tous les membres actifs voient le profil de tous. Le profil ne montre ni l'adresse e-mail, ni les notes données. Un compte supprimé n'a plus de profil : son nom n'est alors pas cliquable.

### Changer un seuil, un nom ou un ornement

- Seuils et noms : `src/lib/avatar.ts`, liste `AVATAR_RANKS`.
- Images : `src/assets/ornaments/`, une par rang (`bronze.webp`, `silver.webp`, `gold.webp`, `platinum.webp`, `dark.webp`). Chaque image est carrée, sur fond transparent, avec un trou rond au centre pour l'avatar.
- Taille de chaque ornement par rapport à l'avatar : `src/lib/ornaments.ts`, valeur `scale`.

## Mot de passe oublié

Ouvrir `supabase/admin/reset_password.sql`, y mettre l'email et un mot de passe provisoire, l'exécuter dans le **SQL Editor**, puis transmettre ce mot de passe à la personne.

Ne pas enregistrer ce fichier avec un vrai mot de passe dedans.

## Nommer un administrateur

Le premier se désigne avec `supabase/admin/make_first_admin.sql`. Les suivants se nommeront depuis l'écran d'administration de l'application (étape 14).

## Désactiver un compte

Un compte désactivé peut encore se connecter, mais ne voit plus rien et ne peut plus rien écrire : l'application lui affiche « Compte désactivé ». Ses contenus restent en place.

En attendant l'écran d'administration (étape 14), exécuter dans le SQL Editor :

```sql
update public.profiles
set is_active = false
where id = (select id from auth.users where email = 'personne@exemple.com');
```

Remettre `true` pour réactiver.

## Supprimer un compte

Supabase → **Authentication → Users**, menu de la ligne → **Delete user**.

Les spots, photos et updates de la personne sont conservés, sans nom d'auteur. Ses notes sont supprimées. Cette action est définitive.

## Ce que fait l'application à la connexion

- La session est conservée sur l'appareil : on reste connecté entre deux ouvertures.
- « Se déconnecter » ne déconnecte que l'appareil utilisé, pas les autres.
- Changer son mot de passe exige de saisir l'ancien.
- Un changement de rôle ou une désactivation est pris en compte au retour dans l'application, sans se reconnecter.
