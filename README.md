# Poke Scan Sell

Photographiez une carte Pokémon, vérifiez ses informations et remplissez directement son annonce Vinted.

## Version 0.5.0 — deux écrans, puis Vinted

L’application s’ouvre directement sur le scan, sans menu Accueil, Mes cartes, Aide ou Paramètres. Le bouton **Scanner** permet de commencer une autre carte. Les mentions d’enregistrement restent silencieuses ; une erreur de sauvegarde est toujours signalée.

1. **Photos** : ajoutez le recto et le verso, puis cliquez sur **Préparer ma carte**. Seul le recto passe dans l’OCR. Le verso est conservé pour l’annonce, sans analyse de pixels. La langue est française par défaut et reste modifiable dans un volet optionnel. Aucune analyse IA n’est proposée ni appelée dans ce parcours.
2. **Vérification** : contrôlez le nom et le numéro, choisissez l’état et le prix, puis cliquez sur **Valider et remplir Vinted**. Le texte est préparé et le compagnon ouvre directement le formulaire Vinted avec les photos, le prix et l’état. Aucun passage par un écran Annonce n’est nécessaire.

Les champs d’extension et de variante ainsi que le texte brut de l’OCR ne sont plus affichés dans la vérification. Les liens de comparaison Vinted et Cardmarket et l’agrandissement recto/verso restent disponibles. Le titre contient uniquement Pokémon, le nom et le numéro ; la description conserve ses trois lignes, et les prix entiers sont saisis sans décimales inutiles.

Le **compagnon Vinted reste en version 0.2.10**. S’il est déjà installé, aucune réinstallation n’est nécessaire. Sinon, les instructions s’ouvrent dans la vérification après la validation ; une fois le compagnon installé, le même bouton relance l’envoi. Les textes personnalisés et les cartes enregistrées restent conservés. Un ancien lien d’annonce revient à la vérification.

L’identité Pokémon, l’import HEIC / HEIF et les sauvegardes des versions précédentes sont conservés. Voir [le guide d’utilisation](docs/UTILISATION.md) et [les principes du design](docs/DESIGN.md).

## Ce qui fonctionne

- Import/capture recto, verso et détails, ou glisser-déposer sur ordinateur ; HEIC/HEIF convertis automatiquement en JPEG, originaux JPEG/PNG/WebP conservés (6 photos, 10 Mo par fichier).
- OCR Tesseract.js exécuté dans le navigateur et recherche TCGdex avec reprises automatiques.
- Nom et numéro préremplis quand la lecture permet de les identifier ; corrections manuelles possibles.
- Extension et variante facultatives. Une édition ambiguë conserve le nom et le numéro sans attribuer le prix d’une autre édition.
- Tendance Cardmarket via TCGdex quand une référence unique est trouvée ; comparables vérifiés et estimation conservés dans les outils historiques.
- Annonce modifiable et transfert Vinted par le compagnon Chrome / Edge ; copier-coller et ZIP en complément.
- Cartes locales et reprise automatique du brouillon ; sauvegardes et outils historiques accessibles par lien direct, sans supprimer les données existantes.
- Navigation mobile avec libellés, accès au clavier, erreurs associées aux champs et mouvements réduits selon les préférences du navigateur.

Les cartes sont conservées **dans ce navigateur, sur cet appareil**, sans compte ni synchronisation cloud. Pensez à exporter une sauvegarde avant de changer d’appareil ou d’effacer les données du site.

La tendance Cardmarket est un indicateur général, sans filtrage garanti par état, langue ou variante. Ce n’est pas un prix de vente garanti. L’estimation selon l’état utilise les comparables renseignés et vérifiés par le vendeur. La collecte automatique de ces comparables reste à développer.

Sur téléphone, la capture, la préparation et les exports fonctionnent. Le remplissage automatique Vinted utilise le compagnon **Chrome / Edge sur ordinateur**. La publication finale reste effectuée sur Vinted par le vendeur.

## Démarrer

Node.js 24 LTS recommandé.

```bash
npm ci
npm run dev
```

Ouvrir http://localhost:5173. Le catalogue nécessite une connexion Internet. Les modèles OCR sont inclus après `npm ci`.

Pour servir la version construite :

```bash
npm start
```

Ouvrir http://localhost:3001. L’application fonctionne sans clé API en mode OCR.

Dans un Codespace, arrêter le serveur avec `Ctrl+C`, puis mettre à jour et relancer :

```bash
git pull --ff-only origin main
npm ci
HOST=0.0.0.0 npm start
```

Actualiser l’onglet : le pied de page doit afficher **v0.5.0**.

## Remplir Vinted

À la première utilisation, cliquer sur **Valider et remplir Vinted**, puis utiliser les instructions de **Activer le remplissage Vinted**, télécharger et décompresser le ZIP, puis charger le dossier dans `chrome://extensions` ou `edge://extensions` avec le mode développeur activé. Recharger l’application. Le bouton **Valider et remplir Vinted** transmet ensuite votre annonce et ses photos.

Le compagnon est associé à l’origine exacte de l’application qui a fourni le ZIP. Une autre adresse nécessite un nouveau téléchargement. Il attend la connexion sur Vinted, conserve un brouillon préexistant, signale les champs restants et laisse le clic **Publier** au vendeur. Voir [le guide Vinted](docs/VINTED.md).

L’état est choisi depuis celui de la carte : M/NM/EX → « Très bon état », GD → « Bon état », LP/PL/PO → « Satisfaisant ». Aucun deuxième champ d’état ni champ d’emballage n’est demandé. Les tests vérifient le prix exact, l’état sélectionné, les originaux et les reprises sans doublon sur des formulaires de contrôle ; ils ne publient aucune annonce réelle.

## Analyse IA et future offre commerciale

Le service IA historique reste documenté dans [les instructions d’installation](docs/INSTALLATION.md), pour compatibilité. Il n’est pas appelé par le parcours courant, qui utilise uniquement l’OCR du recto et ne nécessite aucune clé API.

L’interface est prête à accueillir une offre publique. Les comptes clients, synchronisation, paiement unique ou abonnement et contrôle des droits côté serveur constituent une évolution distincte. Aucun abonnement, quota commercial ni paiement fictif n’est affiché. Voir [la préparation d’une offre commerciale](docs/OFFRE_COMMERCIALE.md).

## Vérifier

```bash
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Un Chromium déjà disponible peut être indiqué via `TEST_BROWSER_PATH`. Voir [le rapport de validation](docs/VALIDATION.md) pour les résultats et limites.

## Documentation

- [Design et parcours utilisateur](docs/DESIGN.md)

- [Guide d’utilisation](docs/UTILISATION.md)
- [Installation et configuration](docs/INSTALLATION.md)
- [Architecture et données](docs/ARCHITECTURE.md)
- [Préparer une offre commerciale](docs/OFFRE_COMMERCIALE.md)
- [Cahier des charges](docs/CAHIER_DES_CHARGES.md)
- [Feuille de route](docs/ROADMAP.md)
- [Tâches GitHub](https://github.com/tristangenet/poke-scan-sell/issues)

Projet indépendant, non affilié à Pokémon, Vinted, Cardmarket ou TCGdex. Les captures de documentation utilisant des cartes contiennent uniquement des données et photos synthétiques de démonstration.
