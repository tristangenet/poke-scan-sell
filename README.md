# Poke Scan Sell

Votre atelier de mise en vente de cartes Pokémon : photographier, identifier, vérifier, estimer et préparer les annonces.

![Vue d’ensemble de l’application](docs/screenshots/desktop.png)

## Version 0.2.0 — mode rapide

Application responsive en français, utilisable sur téléphone et ordinateur. Inventaire conservé **dans le navigateur**, sans compte utilisateur ni synchronisation cloud.

Le mode rapide est affiché par défaut : **recto + verso → Préparer ma carte → vérifier → Valider et créer l’annonce**. Une seule préparation enchaîne l’OCR (ou l’IA optionnelle), la recherche catalogue et le chargement des indicateurs de marché. Une référence est proposée automatiquement lorsque les candidats sont départagés par le numéro complet ; les ambiguïtés restent visibles. La variante unique du catalogue est préremplie, toujours à vérifier.

La tendance Cardmarket peut être choisie comme point de départ en un clic, sans saisir trois comparables. Elle reste un agrégat général, pas un prix de vente garanti ni une estimation selon état. L’état peut être proposé par l’IA configurée. Une seule validation confirme identité et état puis génère le texte. L’emballage et le libellé Vinted sont mémorisés après cette validation pour les prochaines cartes. Les options avancées conservent le parcours détaillé et les comparables.

Fonctionnalités livrées :

- Capture/import recto, verso et détails (JPEG/PNG/WebP).
- Lecture OCR locale avec Tesseract.js et recherche dans le catalogue TCGdex.
- Confirmation de l'extension et de la variante ; correction manuelle.
- Évaluation guidée de l'état et **analyse IA optionnelle** du recto/verso via un serveur OpenAI.
- Tendances Cardmarket relayées par TCGdex, clairement distinguées d'une estimation selon état.
- Comparables saisis et confirmés par le vendeur, calcul de fourchette et stratégies de prix.
- Annonces modifiables, copier-coller et dossier ZIP avec les photos originales.
- Ouverture de Vinted et suivi manuel de la publication/vente.
- Sauvegarde JSON, restauration sans écrasement, recherche, filtres et archivage.

**La collecte automatique des comparables par état, le remplissage et la publication automatiques sur Vinted ne sont pas disponibles.** Ces fonctions restent dépendantes d'accès autorisés. Aucun prix ou résultat de publication n'est simulé.

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
