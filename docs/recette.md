# Recette : vérifier l'application en conditions réelles

Cette liste se parcourt sur le **site publié**, avec un **iPhone**, après une mise à jour importante. Elle couvre ce qu'aucun test automatique ne peut atteindre : le vrai Supabase, le vrai téléphone, les vrais fonds de carte.

Compte une demi-heure pour le tout. Il faut deux comptes : un administrateur et un simple membre.

Coche au fur et à mesure. En cas d'échec, note l'écran, le message exact, et fais une capture.

## 1. Installation et démarrage

- [ ] Le site s'ouvre dans Safari à son adresse publique.
- [ ] Partager → Sur l'écran d'accueil : l'icône est la cascade, le nom « Eldorado ».
- [ ] Lancée par son icône, l'application s'ouvre en plein écran, sans barre de navigateur.
- [ ] L'écran de connexion s'affiche, sans erreur.

## 2. Comptes

- [ ] Créer un compte depuis « Créer un compte » : on arrive directement sur la carte.
- [ ] Se déconnecter, se reconnecter.
- [ ] Mauvais mot de passe : message clair, pas de blocage.
- [ ] Mon compte : changer le nom affiché, changer le mot de passe.
- [ ] Avec l'administrateur : Administration → Utilisateurs liste le nouveau compte, en tête.
- [ ] Bannir ce compte : sur son téléphone, « Accès retiré ». Le rétablir : « Vérifier à nouveau » le fait rentrer.

## 3. Carte

- [ ] Le fond de carte s'affiche ; on peut zoomer et se déplacer avec deux doigts.
- [ ] Le bouton de localisation centre la carte sur ma position (après autorisation).
- [ ] Les spots apparaissent, regroupés quand on dézoome.
- [ ] Toucher un spot ouvre son aperçu ; « Voir la fiche » ouvre la fiche.
- [ ] Les filtres par type masquent et affichent les bons spots.
- [ ] Bouton des calques : la vue satellite s'affiche, avec le tracé des cours d'eau par-dessus.

## 4. Création d'un spot

- [ ] Avec une photo prise sur place : la position est proposée d'après la photo.
- [ ] Avec « Prendre une photo » : l'appareil photo s'ouvre.
- [ ] Sans photo : on place le repère à la main.
- [ ] « Partir d'un point Google Maps » avec des coordonnées copiées : la position est reprise, et on peut encore ajouter des photos.
- [ ] Un spot proche d'un autre déclenche l'avertissement de doublon.
- [ ] Type principal, puis un type supplémentaire : les catégories de notes des deux apparaissent.
- [ ] Type Ride : une sous-catégorie est demandée ; « Rails » porte l'icône de la rampe.
- [ ] Type Nature : la case « Bivouac » est facultative ; cochée, elle propose « Tente » et « Hamac ».
- [ ] Notes avec une demi-étoile.
- [ ] Le spot créé apparaît sur la carte, à la bonne place, avec la bonne icône.
- [ ] Plus de 10 photos : les photos en trop sont refusées avec un message.

## 5. Fiche d'un spot

- [ ] Photos, description, adresse, auteur et date s'affichent.
- [ ] Une photo s'ouvre en grand ; on passe de l'une à l'autre.
- [ ] « Y aller » ouvre Google Maps sur l'itinéraire.
- [ ] Ajouter une photo à un spot existant.
- [ ] Modifier ses notes ; la moyenne change.
- [ ] Publier un update, le modifier, le supprimer.
- [ ] Modifier son propre spot (nom, description, types supplémentaires).
- [ ] Sur le spot d'un autre : pas de bouton de modification.

## 6. Profils et rangs

- [ ] Mon compte : choisir une photo de profil ; elle apparaît à côté de mon nom sur une fiche.
- [ ] Choisir une icône et une couleur de fond.
- [ ] Toucher le nom de quelqu'un ouvre son profil : avatar en grand, rang, trois chiffres, derniers spots.
- [ ] Au cinquième spot publié : l'annonce « Nouveau rang » apparaît, une seule fois.
- [ ] L'ornement entoure l'avatar partout où il apparaît.

## 7. Administration

- [ ] Un simple membre ne voit pas le bouton Administration ; l'adresse `/#/admin` lui affiche « Accès réservé ».
- [ ] Spots : recherche, accès à la modification, suppression d'un spot de test.
- [ ] Photos et Updates : suppression d'un élément de test.
- [ ] Types : renommer une catégorie de notes ; elle change dans le formulaire de création.
- [ ] Réglages : le rapport de stockage s'affiche ; modifier le rayon de doublons.

## 8. Hors ligne

- [ ] Ouvrir l'application, parcourir la carte et deux fiches, puis passer en mode avion.
- [ ] Fermer l'application et la rouvrir : elle s'ouvre, avec le bandeau « Hors ligne ».
- [ ] La carte, la liste et les deux fiches consultées s'affichent, photos comprises.
- [ ] Créer un spot : refus expliqué.
- [ ] Retour du réseau : le bandeau disparaît, tout fonctionne de nouveau.

## 9. Mise à jour

- [ ] Après un `git push`, l'application ouverte sur le téléphone affiche « Une nouvelle version est disponible ».
- [ ] « Mettre à jour » recharge l'application sur la nouvelle version.

## 10. Entretien

- [ ] Sur GitHub, onglet Actions : la dernière publication et la tâche « Garder Supabase éveillé » sont vertes.
- [ ] Dans Supabase, le script `supabase/admin/verify_install.sql` n'affiche que des lignes `ok = true`.
- [ ] Administration → Réglages : pas de fichiers orphelins, ou les supprimer.
- [ ] `npm run backup` se termine par « Sauvegarde complete. » (voir [sauvegarde.md](sauvegarde.md)).
