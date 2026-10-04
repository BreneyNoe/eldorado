# Vue satellite

Le bouton à calques, sur la carte et sur l'écran de placement d'un spot, bascule entre le plan et la vue satellite. Le choix est mémorisé sur l'appareil.

## Ce qu'elle affiche

- **Les photos aériennes de l'IGN** (Géoplateforme), gratuites et sans clé.
- **Le tracé des cours d'eau** par-dessus, en bleu clair avec un liseré sombre : rivières, canaux, ruisseaux.
- **Le nom des cours d'eau et des communes**, pour se repérer.
- **Les spots**, comme sur le plan.

Les cours d'eau ne viennent pas d'une source à part : ce sont ceux du plan habituel (données OpenStreetMap), superposés à l'image.

## Limites

- **France uniquement.** Hors de France, l'image est vide : il faut revenir au plan.
- **Un ruisseau absent d'OpenStreetMap n'est pas tracé.** La couverture est très bonne en France, mais pas parfaite.
- Les petits ruisseaux n'apparaissent qu'à partir d'un certain niveau de zoom.

## Changer de fournisseur d'images

L'adresse des images est dans la variable `VITE_SATELLITE_TILES_URL` (voir `.env.example`). Elle doit contenir `{z}`, `{x}` et `{y}`. La mention légale affichée se règle dans `src/config/constants.ts` (`SATELLITE_ATTRIBUTION`).

Le tracé des cours d'eau, lui, suit le plan : il est construit à partir du style indiqué par `VITE_MAP_STYLE_URL`.
