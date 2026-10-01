# Architecture — version 0.2.6

Frontend Vite / JavaScript ES modules, CSS responsive, sans framework. Node.js 24 pour le serveur optionnel. Dépendances verrouillées par package-lock.json.

| Module                | Responsabilité                                                        |
| --------------------- | --------------------------------------------------------------------- |
| src/main.js           | Navigation, formulaires, brouillons et commandes utilisateur          |
| src/domain.js         | États, règles de préparation, estimation, empreinte d'annonce         |
| src/storage.js        | Transactions IndexedDB                                                |
| src/catalog.js        | TCGdex et orchestration de la lecture OCR                             |
| src/catalog-client.js | Reprises, cache et limite de concurrence des requêtes catalogue       |
| src/ocr.js            | Copies de lecture, zones agrandies et reprises OCR bornées            |
| src/recognition.js    | Extraction de nom/numéro et résolution catalogue                      |
| src/photos.js         | Import d'originaux, contrôles d'éclairage/résolution, téléchargements |
| src/vision.js         | Appel du serveur IA, sans clé fournisseur                             |
| server/index.js       | Fichiers construits, contrôle d'accès/origine, limites, API           |
| server/vision.js      | Validation photos et appel Responses structuré                        |

## Modèle local

Chaque exemplaire possède un UUID, des photos originales, des attributs confirmés, des observations de prix, un brouillon et un historique. La référence catalogue et la variante sont conservées distinctement de l'UUID physique. Deux exemplaires identiques peuvent donc être vendus séparément.

Une observation contient sa source, date, montant EUR hors frais, type, référence/variante/langue, état et confirmation du vendeur. L'estimation exclut les données incompatibles, vieilles de plus de 90 jours, dupliquées et les agrégats. Elle calcule une fourchette interquartile sur au moins trois observations d'un même marché et type. Les ventes vérifiées sont privilégiées si leur échantillon est suffisant. Pas de pondération temporelle fine dans cette version.

Une empreinte des faits de la carte évite le téléchargement et la confirmation de publication d'un brouillon périmé après modification du prix, de l'état, des photos ou de la référence. Le texte corrigé par le vendeur ne change pas cette empreinte. La régénération demande accord avant d'écraser les corrections. Le formulaire utilise uniquement l’état de la carte ; l’état Vinted et l’emballage ont été retirés. Au chargement, les anciennes empreintes sont adaptées sans réinitialiser les brouillons périmés ni modifier les textes corrigés.

## Sources externes

TCGdex : https://tcgdex.dev/rest/cards et https://tcgdex.dev/rest/card. Les tendances proviennent du champ pricing.cardmarket ; leur présence ne garantit pas le prix d'une langue/variante/condition précise. L'API propose des données publiques ; leur disponibilité et conditions doivent être suivies.

OCR : https://github.com/naptha/tesseract.js. Traitement dans le navigateur, avec moteur et modèles français/anglais servis par l’application après npm ci. Il s'agit de lecture de texte, sans évaluation d'état ou certification. Le scan remplit automatiquement le nom et le numéro quand ils concordent. Les copies agrandies et contrastées servent uniquement à la lecture ; les originaux restent intacts. Le nom et le numéro sont conservés indépendamment du rapprochement catalogue, et les références de sous-séries gardent leur total imprimé. Les étapes OCR émettent des diagnostics locaux de progression et de réussite des champs, sans journaliser les photos. La référence catalogue exacte est nécessaire pour attribuer sa tendance de prix, tandis que l’extension et la variante sont facultatives pour générer une annonce. Les informations sont vérifiées par le vendeur à la validation.

IA optionnelle : https://developers.openai.com/api/docs/guides/images-vision et https://developers.openai.com/api/docs/guides/structured-outputs. Recto/verso envoyés seulement après accord utilisateur. La réponse contient identité lisible, état suggéré, défauts, confiance et besoin de meilleures photos. Aucune publication déclenchée par la réponse.

Vinted : compagnon Manifest V3 dans `extensions/vinted`, téléchargé depuis l’application via `src/vinted-transfer.js`. L’origine de l’application est liée dans le ZIP et vérifiée sur chaque message externe. Une file IndexedDB reçoit les photos séparément pour rester sous la taille limite des messages Chrome. Le service worker ouvre un nouvel onglet et lie le transfert à son identifiant ; seules les pages Vinted de cet onglet reçoivent les données. Le script de contenu remplit les champs reconnus avec les événements du formulaire, transfère les originaux via File/DataTransfer, puis remonte un résultat. Catégorie et état sont sélectionnés uniquement par libellés reconnus. Les brouillons préexistants sont conservés ; un résultat précédent évite un nouvel envoi des photos lors d’une reprise. Les originaux temporaires sont retirés après transfert complet ou fermeture de l’onglet, et les transferts expirés sont purgés toutes les cinq minutes après leur délai de trente minutes. Aucun accès aux cookies, aucune API privée, collecte automatisée, session partagée ou clic de publication automatique. Le copier-coller et le ZIP restent des replis.

## Limites

Pas de comptes, synchronisation cloud, traitement par lots, gradation professionnelle, garantie d'authenticité ou déploiement public fourni. La précision de l'OCR et de l'IA sur un corpus de vraies cartes n'est pas encore mesurée. L'analyse du flou et des reflets est guidée humainement ; les contrôles photo automatisés ne mesurent que luminosité et résolution.
