# Installation

## Usage local

Installer Node.js 24 LTS, cloner le dépôt et ouvrir un terminal dans son dossier :

```bash
git clone https://github.com/tristangenet/poke-scan-sell.git
cd poke-scan-sell
npm ci
npm run dev
```

Ouvrir http://localhost:5173. Le bouton Ajouter une carte démarre un exemplaire vide. Les champs se sauvegardent lors de leur changement/validation, et les photos lors de l'import.

Les données appartiennent à l'origine du site : localhost:5173 et localhost:3001 ont des inventaires distincts. Exporter puis restaurer pour transférer. Pas de synchronisation automatique entre téléphone et ordinateur.

## Remplissage Vinted

Depuis une annonce validée, ouvrir « Activer le remplissage Vinted », puis suivre l’installation du compagnon dans Chrome ou Edge sur ordinateur. Le ZIP est généré pour l’adresse exacte de l’application. [Guide et limites du transfert](VINTED.md).

## Analyse IA optionnelle

1. Copier `.env.example` vers `.env`.
2. Configurer `OPENAI_API_KEY` dans ce fichier uniquement.
3. Générer un code d'accès aléatoire d'au moins 32 caractères :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Mettre ce code dans `APP_ACCESS_TOKEN`.
5. Lancer `npm start` puis ouvrir http://localhost:3001.
6. Dans Données & services, saisir le **code d'accès**, jamais la clé OpenAI.
7. Ajouter recto/verso ; dans État, lancer Analyser le recto et le verso par IA. L'envoi est soumis à confirmation.

`OPENAI_MODEL` est configurable ; valeur initiale `gpt-4o-mini`, pour l'analyse multimodale structurée. L'API OpenAI doit être accessible et disposer du quota approprié. Les appels sont facturés par le fournisseur. Aucun appel réel n'a été validé avec une clé dans l'environnement de développement.

Le serveur garde les images uniquement en mémoire pendant la requête et utilise `store:false` pour la réponse. Cette option ne constitue pas une promesse de rétention nulle côté fournisseur : consulter ses conditions de traitement.

En développement avec deux terminaux, lancer `npm run server` puis `npm run dev`. Configurer `APP_ORIGIN=http://localhost:5173` (ou l'origine exacte utilisée, par exemple http://127.0.0.1:5173) pour l'appel via le proxy Vite.

## Version construite et hébergement

`npm run build` produit le dossier `dist`. Un hébergement statique peut servir ce dossier pour le mode local/OCR, sans analyse IA. Le serveur Node sert `dist` et `/api/vision` avec `npm run server`.

Sur un hébergement Node : définir `HOST=0.0.0.0`, le port attendu et `APP_ORIGIN` à l'origine publique HTTPS exacte. Protéger le serveur derrière HTTPS. Ne jamais exposer OPENAI_API_KEY dans une variable `VITE_*`.

Le code d'accès est destiné à une instance personnelle. Pour ouvrir le service à plusieurs utilisateurs, une authentification avec comptes, une limitation durable et une gestion des quotas par utilisateur restent à ajouter. Le limiteur actuel (20 analyses/heure, une analyse concurrente) est en mémoire et se réinitialise au redémarrage.

Sur smartphone, l'accès caméra et le presse-papiers peuvent nécessiter HTTPS. L'import de photos fonctionne avec le sélecteur du système. Le champ de capture utilise la caméra arrière lorsque le navigateur le permet.

## Mettre à jour la version 0.3.0

Arrêter le serveur en cours avec `Ctrl+C`, puis, dans le dépôt :

```bash
git pull --ff-only origin main
HOST=0.0.0.0 npm start
```

Actualiser l’application et vérifier **v0.3.0** dans le pied de page. La version du compagnon reste **0.2.9** : si elle est déjà installée pour la même adresse, aucune réinstallation n’est nécessaire pour cette refonte. La reconnaissance, les originaux et le transfert utilisent les mêmes modules. Les cartes existantes restent dans le stockage du navigateur.

## Données et sauvegardes

Indexer les cartes avec IndexedDB ; aucune carte n'est envoyée dans un cloud de stockage. Exporter régulièrement depuis Données & services. Effacer les données du navigateur ou utiliser un autre navigateur ne conserve pas l'inventaire. Import JSON version 1 limité à 50 Mo / 500 cartes, six photos par carte. Les cartes importées prennent de nouveaux identifiants.

La limite d'import peut être inférieure à la taille d'une collection exportée très volumineuse : conserver ses sauvegardes et diviser une grosse collection avant restauration. Une future version devra fournir un format de sauvegarde par lots.

## Tests

```bash
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Un navigateur Chromium déjà installé peut être indiqué avec `TEST_BROWSER_PATH=/chemin/vers/chromium`. Les tests créent uniquement des images et cartes synthétiques. Aucun compte Vinted n'est utilisé.
