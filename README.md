# Poke Scan Sell

De la carte à l’annonce : photographiez une carte Pokémon, vérifiez ses informations et préparez sa vente sur Vinted.

![Accueil de Poke Scan Sell](docs/screenshots/desktop.png)

## Version 0.4.0 — le compagnon de votre collection Pokémon

La version 0.4.0 refond tous les écrans autour d’une identité inspirée du Pokédex : bleu nuit, rouge et jaune, logo Poké Ball, cartes illustrées et navigation mobile avec le scan au centre.

- **Accueil** : scan visible, reprise d’un brouillon et compteurs cliquables pour ouvrir les cartes concernées.
- **Collection** : photos, numéro, langue, avancement et prix, avec recherche et filtres.
- **Scan** : repères pour le recto et le verso et compteur des deux photos requises.
- **Vérification** : consultation des deux faces et agrandissement de la photo originale, aussi sur téléphone ; liens Vinted et Cardmarket dans le panneau du prix.
- **Annonce** : aperçu avec photo, texte modifiable et transfert Vinted bien identifié.

Voir [les principes du design](docs/DESIGN.md).

L’application propose un parcours en **trois écrans : Photos → Vérification → Annonce**, en français, sur ordinateur et téléphone.

1. **Photos** : ajoutez le recto et le verso, puis cliquez sur **Préparer ma carte**. L’OCR lit le nom et le numéro et recherche la référence dans le catalogue.
2. **Vérification** : contrôlez les informations, choisissez l’état et le prix. L’extension et la variante sont facultatives, dans un volet replié. Une validation prépare l’annonce.
3. **Annonce** : relisez l’aperçu, ajustez le texte si nécessaire et cliquez sur **Remplir mon annonce sur Vinted**. Le compagnon envoie le texte, les originaux, le prix et l’état. Vous vérifiez le formulaire Vinted avant de publier.

L’accueil explique les étapes et propose de reprendre un brouillon. **Mes cartes** regroupe les cartes à préparer, prêtes, en vente, vendues et archivées, avec recherche sans distinction d’accents et tri. **Paramètres** regroupe le compagnon Vinted et les sauvegardes. **Aide** explique les étapes et les questions fréquentes.

La saisie est enregistrée automatiquement après une courte pause et à la sortie d’un champ. Le champ actif et les volets ouverts restent en place. Le rechargement reprend la page et la carte en cours. Les erreurs apparaissent à côté des champs à compléter. Les réglages techniques, outils manuels et options avancées sont accessibles dans des volets secondaires.

Cette version conserve les cartes et sauvegardes existantes. **Le compagnon Vinted reste en version 0.2.9** : aucune réinstallation n’est nécessaire si cette version est déjà chargée et associée à la même adresse.

## Ce qui fonctionne

- Import/capture recto, verso et détails, ou glisser-déposer sur ordinateur ; originaux JPEG/PNG/WebP conservés.
- OCR Tesseract.js exécuté dans le navigateur et recherche TCGdex avec reprises automatiques.
- Nom et numéro préremplis quand la lecture permet de les identifier ; corrections manuelles possibles.
- Extension et variante facultatives. Une édition ambiguë conserve le nom et le numéro sans attribuer le prix d’une autre édition.
- Analyse IA optionnelle du recto/verso, via un serveur configuré, proposant l’identité, l’état et les défauts.
- Tendance Cardmarket via TCGdex quand une référence unique est trouvée ; comparables vérifiés et estimation dans les options avancées.
- Annonce modifiable et transfert Vinted par le compagnon Chrome / Edge ; copier-coller et ZIP en complément.
- Collection locale, reprise des brouillons, archivage, suivi manuel des publications/ventes, sauvegarde JSON et restauration sans écrasement.
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
HOST=0.0.0.0 npm start
```

Actualiser l’onglet : le pied de page doit afficher **v0.4.0**.

## Remplir Vinted

À la première utilisation, ouvrir **Activer le remplissage Vinted**, télécharger et décompresser le ZIP, puis charger le dossier dans `chrome://extensions` ou `edge://extensions` avec le mode développeur activé. Recharger l’application. Le bouton **Remplir mon annonce sur Vinted** transmet ensuite votre annonce et ses photos.

Le compagnon est associé à l’origine exacte de l’application qui a fourni le ZIP. Une autre adresse nécessite un nouveau téléchargement. Il attend la connexion sur Vinted, conserve un brouillon préexistant, signale les champs restants et laisse le clic **Publier** au vendeur. Voir [le guide Vinted](docs/VINTED.md).

L’état est choisi depuis celui de la carte : M/NM/EX → « Très bon état », GD → « Bon état », LP/PL/PO → « Satisfaisant ». Aucun deuxième champ d’état ni champ d’emballage n’est demandé. Les tests vérifient le prix exact, l’état sélectionné, les originaux et les reprises sans doublon sur des formulaires de contrôle ; ils ne publient aucune annonce réelle.

## Analyse IA et future offre commerciale

Pour configurer l’analyse IA, suivre [les instructions d’installation](docs/INSTALLATION.md). La clé API reste sur le serveur ; le code d’accès à l’instance se renseigne dans le volet IA des paramètres. L’utilisateur choisit l’analyse IA avant l’envoi des photos. Les propositions restent à vérifier.

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
