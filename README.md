# Poke Scan Sell

Votre atelier de mise en vente de cartes Pokémon : photographier, identifier, vérifier, estimer et préparer les annonces.

![Vue d’ensemble de l’application](docs/screenshots/desktop.png)

## Version 0.2.8 — mode rapide et prix Vinted

Application responsive en français, utilisable sur téléphone et ordinateur. Inventaire conservé **dans le navigateur**, sans compte utilisateur ni synchronisation cloud.

Le mode rapide est affiché par défaut : **recto + verso → Préparer ma carte → vérifier → Valider et créer l’annonce**. Une seule préparation enchaîne l’OCR (ou l’IA optionnelle), la recherche catalogue et le chargement des indicateurs de marché. La référence est remplie automatiquement en croisant le nom, le numéro (complet, isolé ou promo) et le texte de l’extension lorsqu’il est lisible. Cela fonctionne aussi avec le bouton OCR des options avancées. Le mode rapide ne demande plus de sélectionner une carte dans une liste. Le nom et le numéro suffisent pour préparer l’annonce : si plusieurs éditions correspondent, ces informations sont conservées sans choisir de fiche catalogue au hasard. L’extension et la variante sont facultatives, repliées dans les détails de la vérification finale ; leur absence ne bloque pas la génération. Une nouvelle photo reste utile lorsque le nom ou le numéro n’a pas été lu. Les symboles graphiques ne sont pas reconnus par l’OCR local ; l’analyse IA configurée ou une correction manuelle peut rester nécessaire. La variante unique du catalogue est préremplie, toujours à vérifier.

Le scan local analyse une copie agrandie du recto, privilégie le titre principal en haut (selon la taille des lignes, en écartant les mentions de pré-évolution) et le numéro en bas, puis tente automatiquement des lectures ciblées et une lecture avec contraste renforcé si nécessaire. Jusqu’à huit lectures sont possibles, avec arrêt dès que nom et numéro concordent avec une référence. Une faute d’une lettre dans un nom d’au moins cinq caractères peut être rapprochée du catalogue seulement si le numéro concorde et si le nom est univoque. Le nom déjà lu n’est plus perdu lorsqu’un numéro ne correspond pas. Si l’OCR omet le séparateur du numéro (par exemple 4102), une référence peut être reconstituée uniquement lorsqu’une combinaison unique de nom, numéro et total du catalogue correspond aux caractères lus en bas ; les années de copyright sont exclues. Les totaux TG/SV sont conservés tels qu’ils sont imprimés. Si la lecture reste partielle, le message indique le champ manquant et le texte extrait est consultable ; un échec de rapprochement catalogue n’est plus présenté comme un reflet sur la photo. Le scan OCR lit du texte ; une véritable analyse visuelle IA du nom, du numéro et de l’état reste optionnelle et nécessite un serveur configuré. Une identité lue par l’IA est conservée même sans fiche catalogue.

La reconnaissance n’est plus limitée à 24 références. Le nom et le numéro lus sont conservés même si une fiche manque. Les extensions sont consultées pour cibler la référence avant de charger la fiche détaillée. Les erreurs temporaires sont réessayées automatiquement ; les données sont mises en cache cinq minutes et les requêtes de secours limitées à trois simultanément. Si l’identité est établie par les données de carte et d’extension, une fiche détaillée indisponible ne bloque pas son remplissage ; le prix absent reste à choisir, les variantes restent facultatives.

La tendance Cardmarket peut être choisie comme point de départ en un clic lorsqu’une référence catalogue unique est identifiée, sans saisir trois comparables. Sans référence unique, aucun prix catalogue n’est sélectionné automatiquement ; le vendeur peut choisir son prix et préparer l’annonce sans édition. Elle reste un agrégat général, pas un prix de vente garanti ni une estimation selon état. L’état peut être proposé par l’IA configurée. Une seule validation confirme identité et état puis génère le texte. Le seul champ d’état est « État de la carte », utilisé pour l’estimation et la description. Le formulaire, la validation et l’export ne demandent plus de libellé d’état Vinted ni d’emballage. Les options avancées conservent le parcours détaillé et les comparables.

Fonctionnalités livrées :

- Capture/import recto, verso et détails (JPEG/PNG/WebP).
- Lecture OCR locale avec Tesseract.js et recherche dans le catalogue TCGdex.
- Nom et numéro remplis automatiquement ; extension et variante facultatives ; correction manuelle.
- Évaluation guidée de l'état et **analyse IA optionnelle** du recto/verso via un serveur OpenAI.
- Tendances Cardmarket relayées par TCGdex, clairement distinguées d'une estimation selon état.
- Comparables saisis et confirmés par le vendeur, calcul de fourchette et stratégies de prix.
- Annonces modifiables, copier-coller et dossier ZIP avec les photos originales.
- Remplissage Vinted par un compagnon Chrome / Edge : titre, description, prix, photos originales, catégorie et état lorsqu’ils sont reconnus ; suivi manuel de la publication/vente.
- Sauvegarde JSON, restauration sans écrasement, recherche, filtres et archivage.

**Le remplissage du formulaire Vinted est développé via le compagnon Chrome / Edge, à installer une fois depuis l’application.** Il a été testé sur des formulaires de contrôle ; la validation du formulaire réel avec un compte connecté reste à effectuer. Les champs non reconnus sont signalés. La collecte automatique des comparables par état et la publication automatique restent indisponibles. Aucun prix ou résultat de publication n’est simulé.

## Démarrer

Node.js 24 LTS recommandé.

```bash
npm ci
npm run dev
```

Ouvrir http://localhost:5173. Le catalogue nécessite une connexion Internet. Les modèles OCR sont inclus après npm ci.

Pour servir la version construite :

```bash
npm start
```

Ouvrir http://localhost:3001. L'application fonctionne sans clé API en mode OCR et saisie guidée.

## Remplir Vinted

Après validation de votre carte, cliquez sur **Remplir mon annonce sur Vinted**. À la première utilisation, ouvrez **Activer le remplissage Vinted**, téléchargez et décompressez l’extension, puis chargez le dossier dans `chrome://extensions` ou `edge://extensions` avec le mode développeur activé. Rechargez l’application ; le même bouton enverra ensuite le texte corrigé, le prix et les photos.

Le compagnon est associé à l’origine exacte de l’application qui a fourni le ZIP. Une autre adresse nécessite un nouveau téléchargement de l’extension. Il attend la connexion sur Vinted, conserve un brouillon existant au lieu de l’écraser, signale les champs restants et laisse le clic **Publier** au vendeur. Voir [le guide Vinted](docs/VINTED.md).

La version 0.2.7 remplit les champs disponibles sans attendre que titre, description et prix soient tous reconnus. Les photos peuvent débloquer des champs encore désactivés. Une attente ou un message sans réponse finit par un résultat explicite, avec diagnostic technique copiable en cas d’échec. L’application signale les anciennes extensions : **après avoir mis à jour l’application, remplacer aussi les fichiers du dossier de l’extension puis cliquer sur Recharger dans Chrome / Edge**. Recharger les deux onglets avant le prochain transfert.

La version 0.2.8 adapte la saisie du prix au séparateur du champ, vérifie le montant exact après validation et essaie l’autre format si nécessaire. Un montant refusé ou transformé n’est plus annoncé comme rempli ; la valeur initiale est restaurée. Les prix déjà saisis et les modifications faites dans Vinted pendant le transfert sont conservés. Les composants avec un titre « Prix », un mode numérique ou un identifiant `price-field--input` sont aussi reconnus.

## Activer l'analyse IA

Suivre [les instructions d'installation](docs/INSTALLATION.md). La clé API reste côté serveur ; un code d'accès protège les appels. Aucune photo n'est envoyée sans confirmation dans l'interface. Les suggestions d'identité et d'état doivent être vérifiées par le vendeur.

## Vérifier

```bash
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Tests de calcul, de refus des données incompatibles, du serveur, et parcours navigateur complet. Voir le [rapport de validation](docs/VALIDATION.md) pour les limites des vérifications.

## Documentation

- [Installation et configuration](docs/INSTALLATION.md)
- [Architecture et données](docs/ARCHITECTURE.md)
- [Cahier des charges](docs/CAHIER_DES_CHARGES.md)
- [Feuille de route et état réel](docs/ROADMAP.md)
- [Tâches GitHub](https://github.com/tristangenet/poke-scan-sell/issues)

Projet indépendant, non affilié à Pokémon, Vinted, Cardmarket ou TCGdex. Ne jamais committer clés, cookies, photos personnelles ou sauvegardes d'inventaire.
