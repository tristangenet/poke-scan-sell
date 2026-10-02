# Architecture — version 0.3.0

Frontend Vite / JavaScript ES modules, CSS responsive, sans framework. Node.js 24 pour le serveur optionnel. Dépendances verrouillées par package-lock.json.

| Module                | Responsabilité                                                                    |
| --------------------- | --------------------------------------------------------------------------------- |
| src/main.js           | Routes, commandes, préparation, autosauvegarde et transfert utilisateur           |
| src/interface.js      | Navigation commune, accueil, collection, récapitulatif, paramètres et aide        |
| src/quick-view.js     | Trois écrans du parcours Photos → Vérification → Annonce                          |
| src/ui-state.js       | Étape de reprise, validité d’annonce, groupes, tri, recherche et erreurs de champ |
| src/domain.js         | États, règles de préparation, estimation, empreinte d'annonce                     |
| src/storage.js        | Transactions IndexedDB                                                            |
| src/catalog.js        | TCGdex et orchestration de la lecture OCR                                         |
| src/catalog-client.js | Reprises, cache et limite de concurrence des requêtes catalogue                   |
| src/ocr.js            | Copies de lecture, zones agrandies et reprises OCR bornées                        |
| src/recognition.js    | Extraction de nom/numéro et résolution catalogue                                  |
| src/photos.js         | Import d'originaux, contrôles d'éclairage/résolution, téléchargements             |
| src/vision.js         | Appel du serveur IA, sans clé fournisseur                                         |
| server/index.js       | Fichiers construits, contrôle d'accès/origine, limites, API                       |
| server/vision.js      | Validation photos et appel Responses structuré                                    |

## Navigation et saisie

Le parcours par défaut sépare les photos, la vérification et l’annonce. Les options avancées conservent les cinq étapes détaillées. Les champs d’extension/variante, outils de transfert manuel, suivi et configuration IA sont accessibles dans des volets repliés.

Les routes utilisent le fragment d’URL : `#/`, `#/cards`, `#/help`, `#/settings`, `#/cards/:id/photos|review|listing` et `#/cards/:id/advanced/:step`. Le rechargement et la navigation précédent/suivant reprennent une carte enregistrée. Une route d’annonce périmée ramène à la vérification. Les liens et commandes restent dans le même document.

La valeur d’un champ est appliquée en mémoire dès la saisie, puis enregistrée dans IndexedDB après 350 ms d’inactivité ou à la sortie du champ. Cela évite de perdre une saisie lorsque la sauvegarde d’un autre champ termine. Les écritures capturent la carte concernée ; le statut affiché suit la réussite ou l’erreur de la transaction. Les rafraîchissements du formulaire conservent le focus, la sélection, la position et les volets ouverts. Les erreurs de validation sont associées aux champs, et la navigation place le focus sur le titre de la page.

La collection recherche sans distinction d’accents, filtre par préparation/statut et trie par date, nom ou prix. Les compteurs sont calculés depuis les cartes enregistrées. Les publications et ventes restent des déclarations du vendeur ; un transfert de formulaire n’est pas compté comme une publication.

Les anciens schémas, empreintes et identifiants IndexedDB restent compatibles. Le ZIP Vinted distribue le compagnon 0.2.9 ; la version de l’interface 0.4.0 ne change pas le protocole ni l’origine autorisée.

## Inspection de la carte — interface 0.4.0

Le choix recto/verso reste un état d’affichage temporaire dans `src/main.js` ; il ne modifie ni l’exemplaire ni ses photos. `summaryView` affiche la face sélectionnée. La boîte native `dialog` agrandit l’original, garde la navigation au clavier dans la boîte et rend le focus au bouton d’ouverture après fermeture. Le résumé reste accessible pendant la vérification et l’annonce sur téléphone.

Les compteurs de l’accueil ouvrent la collection avec le filtre correspondant. Les repères du parcours distinguent l’étape affichée et les étapes effectivement complétées. Les illustrations et le logo sont des SVG servis par l’application. Les règles de génération, prix, sauvegarde et transfert Vinted restent dans leurs modules existants.

## Modèle local

Chaque exemplaire possède un UUID, des photos originales, des attributs confirmés, des observations de prix, un brouillon et un historique. La référence catalogue et la variante sont conservées distinctement de l'UUID physique. Deux exemplaires identiques peuvent donc être vendus séparément.

Une observation contient sa source, date, montant EUR hors frais, type, référence/variante/langue, état et confirmation du vendeur. L'estimation exclut les données incompatibles, vieilles de plus de 90 jours, dupliquées et les agrégats. Elle calcule une fourchette interquartile sur au moins trois observations d'un même marché et type. Les ventes vérifiées sont privilégiées si leur échantillon est suffisant. Pas de pondération temporelle fine dans cette version.

Une empreinte des faits de la carte évite le téléchargement et la confirmation de publication d'un brouillon périmé après modification du prix, de l'état, des photos ou de la référence. Le texte corrigé par le vendeur ne change pas cette empreinte. La régénération demande accord avant d'écraser les corrections. Le formulaire utilise uniquement l’état de la carte ; l’état Vinted et l’emballage ont été retirés. Au chargement, les anciennes empreintes sont adaptées sans réinitialiser les brouillons périmés ni modifier les textes corrigés.

## Sources externes

TCGdex : https://tcgdex.dev/rest/cards et https://tcgdex.dev/rest/card. Les tendances proviennent du champ pricing.cardmarket ; leur présence ne garantit pas le prix d'une langue/variante/condition précise. L'API propose des données publiques ; leur disponibilité et conditions doivent être suivies.

OCR : https://github.com/naptha/tesseract.js. Traitement dans le navigateur, avec moteur et modèles français/anglais servis par l’application après npm ci. Il s'agit de lecture de texte, sans évaluation d'état ou certification. Le scan remplit automatiquement le nom et le numéro quand ils concordent. Les copies agrandies et contrastées servent uniquement à la lecture ; les originaux restent intacts. Le nom et le numéro sont conservés indépendamment du rapprochement catalogue, et les références de sous-séries gardent leur total imprimé. Les étapes OCR émettent des diagnostics locaux de progression et de réussite des champs, sans journaliser les photos. La référence catalogue exacte est nécessaire pour attribuer sa tendance de prix, tandis que l’extension et la variante sont facultatives pour générer une annonce. Les informations sont vérifiées par le vendeur à la validation.

IA optionnelle : https://developers.openai.com/api/docs/guides/images-vision et https://developers.openai.com/api/docs/guides/structured-outputs. Recto/verso envoyés seulement après accord utilisateur. La réponse contient identité lisible, état suggéré, défauts, confiance et besoin de meilleures photos. Aucune publication déclenchée par la réponse.

Vinted : compagnon Manifest V3 dans `extensions/vinted`, téléchargé depuis l’application via `src/vinted-transfer.js`. L’origine de l’application est liée dans le ZIP et vérifiée sur chaque message externe. Une file IndexedDB reçoit les photos séparément pour rester sous la taille limite des messages Chrome. Le service worker ouvre un nouvel onglet et lie le transfert à son identifiant ; seules les pages Vinted de cet onglet reçoivent les données. Le script de contenu remplit les champs reconnus avec les événements du formulaire, transfère les originaux via File/DataTransfer, puis remonte un résultat. Catégorie et état sont sélectionnés uniquement par libellés reconnus. Les brouillons préexistants sont conservés ; un résultat précédent évite un nouvel envoi des photos lors d’une reprise. Les originaux temporaires sont retirés après transfert complet ou fermeture de l’onglet, et les transferts expirés sont purgés toutes les cinq minutes après leur délai de trente minutes. Aucun accès aux cookies, aucune API privée, collecte automatisée, session partagée ou clic de publication automatique. Le copier-coller et le ZIP restent des replis.

Le remplissage Vinted progresse par champ, avec priorité aux identifiants et libellés associés, puis aux conteneurs portant un seul contrôle et aux placeholders reconnus. Les égalités de score et contrôles de recherche ne sont pas remplis. Les champs et photos sont recherchés pendant vingt secondes, indépendamment les uns des autres ; chaque message a un délai maximal. Le worker conserve un point de reprise dès l’envoi des photos au formulaire pour éviter un doublon si un champ échoue ensuite. Les journaux de progression et le diagnostic copiable ne contiennent pas le contenu de l’annonce ni les photos. L’application exige une version de compagnon au moins égale à celle qu’elle distribue, avec protocole compatible ; l’identifiant d’extension reste stable.

La saisie du prix distingue champs numériques et champs monétaires texte. Le séparateur est choisi selon le type, l’indication du champ et son motif de validation ; le point est le format par défaut. Deux formats au maximum sont essayés, avec validation après perte de focus et comparaison du montant exact. Une valeur transformée ou invalidée par le composant n’est pas comptée comme remplie. La valeur antérieure est restaurée en cas de refus ; les événements de saisie utilisateur interrompent la reprise. Les diagnostics indiquent le mode numérique et les échecs de validation sans conserver le montant saisi.

Le sélecteur d’état est recherché jusqu’à la fin du délai de montage, même si le texte et les photos sont déjà transmis. Les options sont rapprochées par leur titre, indépendamment de leur description ; les cibles radio imbriquées sont regroupées pour un seul choix, et deux options distinctes au même titre restent ambiguës. Le menu lié par aria-controls/aria-owns est privilégié lorsqu’il existe. Le choix doit être confirmé dans la valeur ou le libellé du sélecteur après les événements, y compris après un remplacement du contrôle. Un résultat filled exige désormais aussi l’état confirmé ; un échec conserve le brouillon, les originaux temporaires et le point de reprise photos.

## Limites

Pas de comptes, synchronisation cloud, traitement par lots, gradation professionnelle, garantie d'authenticité ou déploiement public fourni. La précision de l'OCR et de l'IA sur un corpus de vraies cartes n'est pas encore mesurée. L'analyse du flou et des reflets est guidée humainement ; les contrôles photo automatisés ne mesurent que luminosité et résolution.

## Évolution commerciale

La séparation entre vues, état d’affichage et règles de carte permet d’ajouter ultérieurement comptes, collection distante et espace de facturation. Ces fonctionnalités restent à développer, avec droits et comptage contrôlés côté serveur. Voir [la préparation d’une offre commerciale](OFFRE_COMMERCIALE.md).
