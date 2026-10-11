# Photos HEIC de test

Ces deux fichiers sont de vraies images HEIC/HEIF encodées en HEVC, créées pour ce projet. Ils représentent une carte synthétique, avec un recto et un verso distincts, sans photographie personnelle ni illustration du catalogue Pokémon.

- `card-front.HEIC` : recto avec le texte « Dracaufeu » et « 4/102 ».
- `card-back.heif` : verso avec le texte « VERSO DE TEST ».
- Résolution : 1000 × 1400 pixels, couleurs RGB, qualité HEIF 95.

Génération avec Pillow 12.3.0 et pillow-heif 1.8.1, texte DejaVu Sans Bold et formes géométriques sur fond uni. Les fichiers sont inclus dans le dépôt : ces outils Python ne sont pas nécessaires pour exécuter l’application ou les tests.

Les parcours navigateur décodent les fichiers avec le vrai décodeur HEIC. Ils ne remplacent pas la conversion par un mock. Le catalogue et le formulaire Vinted sont simulés dans le parcours de transfert ; aucune annonce réelle n’est publiée.
