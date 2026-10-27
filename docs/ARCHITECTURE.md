# Architecture — version 0.6.0

Frontend Vite / JavaScript ES modules, CSS responsive, sans framework. Node.js 24 pour le serveur optionnel. Dépendances verrouillées par package-lock.json.

| Module                | Responsabilité                                                                    |
| --------------------- | --------------------------------------------------------------------------------- |
| src/main.js           | Routes, commandes, préparation, autosauvegarde et transfert utilisateur           |
| src/interface.js      | Navigation commune, accueil, collection, récapitulatif, paramètres et aide        |
| src/quick-view.js     | Deux écrans Photos → Vérification, puis transfert Vinted                          |
| src/ui-state.js       | Étape de reprise, validité d’annonce, groupes, tri, recherche et erreurs de champ |
| src/domain.js         | États, règles de préparation, estimation, empreinte d'annonce                     |
| src/storage.js        | Transactions IndexedDB                                                            |
| src/catalog.js        | TCGdex et orchestration de la lecture OCR                                         |
| src/catalog-client.js | Reprises, cache et limite de concurrence des requêtes catalogue                   |
| src/ocr.js            | Copies de lecture, zones agrandies et reprises OCR bornées                        |
| src/recognition.js    | Extraction de nom/numéro et résolution catalogue                                  |
| src/photos.js         | Import et conversion HEIC, contrôles d’éclairage/résolution, téléchargements      |
| src/vision.js         | Appel du serveur IA, sans clé fournisseur                                         |
| server/index.js       | Fichiers construits, contrôle d'accès/origine, limites, API                       |
| server/vision.js      | Validation photos et appel Responses structuré                                    |

## Thème du studio — 0.6.0

`src/studio.css` est importé après la base CSS pour définir les couleurs, les surfaces, les états et les compositions du studio. `layout` ajoute la classe `studio` au cadre existant et `wizardFrame` place les deux étapes dans un bandeau Pokédex. Le SVG local `public/scan-orbit.svg` est décoratif. La fiche de résumé est rendue uniquement pendant la vérification ; l’écran photo dispose d’un panneau d’action à droite sur ordinateur.

L’identité et l’état sont regroupés dans `review-details`, en colonnes sur grand écran et en pile sur téléphone. Les éléments de formulaire, actions, routes et libellés accessibles restent ceux du parcours rapide. Les photos utilisent toujours un affichage intégral sans filtre visuel sur leur contenu. Le thème inclut les états de focus, les erreurs, le dialogue d’agrandissement et la réduction des mouvements. Les pages historiques héritent des couleurs et contrôles communs.

Aucun changement du modèle, d’IndexedDB, du serveur ou du protocole Vinted. Le compagnon reste en 0.2.10. Les captures documentaires utilisent les photos HEIC synthétiques du dépôt ; elles ne peuplent pas les navigateurs utilisateurs.

## Import HEIC / HEIF

`src/photos.js` accepte les types MIME HEIC/HEIF et leurs variantes `-sequence`, ou les extensions `.heic` / `.heif` sans distinction de casse, même sans type MIME. La limite de 10 Mo est vérifiée avant le décodage. La lecture native est tentée ; sinon `heic-to/csp` 1.6.6 est chargé à la demande et utilise son décodeur local dans un worker. Aucun service de conversion ni CDN n’est appelé. La [licence du décodeur](../public/licenses/heic-to.txt) est distribuée avec l’application ; son code est disponible dans le paquet npm verrouillé et dans le [dépôt heic-to](https://github.com/hoppergee/heic-to). La première image décodée est utilisée pour une photo.

Le JPEG conserve les dimensions décodées, avec une qualité de 0,95 ; des qualités de 0,9 à 0,8 sont essayées si le résultat dépasse 10 Mo. Un fichier qui reste trop grand est rejeté. Les bitmaps et canevas de conversion sont libérés après traitement. Le JPEG est enregistré avec un nom `.jpg`, `type: image/jpeg` et une URL de données JPEG cohérente ; `convertedFrom` indique le nom du fichier d’import. Les formats JPEG/PNG/WebP ne sont pas réencodés. Le remplacement d’une face se fait uniquement après une lecture réussie.

Les contrôles OCR, IA, sauvegarde, ZIP et Vinted reçoivent ainsi des photos dans les formats existants. Le schéma IndexedDB et le protocole du compagnon restent inchangés. Le module de conversion de production est séparé et chargé uniquement si le décodage natif HEIC échoue (environ 3,15 Mo, 0,79 Mo compressé).

## Navigation et saisie

Le parcours courant comporte deux écrans, Photos et Vérification. `prepareQuickCard` appelle uniquement `recognizePhoto` sur le recto ; le choix IA et son appel recto/verso ont été retirés de ce parcours. La langue reste optionnelle, française par défaut. `readPhoto` valide le décodage du verso et assure sa conversion HEIC éventuelle, mais retourne avant le canevas d’analyse des pixels et ne produit pas d’avertissement de qualité pour cette face.

L’entrée `#/` reprend le brouillon courant ou ouvre un nouveau scan. Les routes normales sont `#/cards/:id/photos|review`. Les anciens liens `listing` sont remplacés par `review`. Les pages historiques `#/dashboard`, `#/cards`, `#/help`, `#/settings` et `advanced/:step` restent accessibles directement pour compatibilité, sans liens dans le parcours courant. La barre latérale, la navigation mobile, les liens d’aide et les mentions normales de sauvegarde sont retirés. Le bouton Scanner reste dans l’en-tête.

La validation vérifie les informations et les deux photos, génère le texte si nécessaire, enregistre le brouillon puis appelle `fillVinted` dans la même opération. Un brouillon déjà valide conserve ses textes personnalisés. Le compagnon absent ou ancien ouvre ses instructions dans la vérification, sans perdre le brouillon ; une validation ultérieure reprend l’envoi. Les actions sont verrouillées pendant l’opération pour éviter un double transfert. Le démarrage d’un scan rend les champs avant sa première sauvegarde asynchrone, pour ne pas détacher un champ photo utilisé immédiatement.

La valeur d’un champ est appliquée en mémoire dès la saisie, puis enregistrée dans IndexedDB après 350 ms d’inactivité ou à la sortie du champ. Cela évite de perdre une saisie lorsque la sauvegarde d’un autre champ termine. Les écritures capturent la carte concernée ; les sauvegardes normales restent silencieuses et les erreurs sont affichées. Les rafraîchissements du formulaire conservent le focus, la sélection, la position et les volets ouverts. Les erreurs de validation sont associées aux champs, et la navigation place le focus sur le titre de la page.

La collection recherche sans distinction d’accents, filtre par préparation/statut et trie par date, nom ou prix. Les compteurs sont calculés depuis les cartes enregistrées. Les publications et ventes restent des déclarations du vendeur ; un transfert de formulaire n’est pas compté comme une publication.

Les anciens schémas, empreintes et identifiants IndexedDB restent compatibles. Le ZIP Vinted distribue le compagnon 0.2.10 ; la version de l’interface 0.6.0 ne change pas le protocole ni l’origine autorisée.

## Liens de comparaison — 0.5.1

`vintedSearchUrl` construit la recherche avec le nom et le numéro complet uniquement, sans extension ni variante. `cardmarketSearchUrl` conserve la recherche 2.0 par nom et numéro de collection, puis ajoute `sellerCountry=12` et `language=2` pour une carte française ou `language=1` pour une carte anglaise. La langue de l’interface Cardmarket reste française. Les identifiants de pays et de langues sont référencés dans la [documentation officielle Cardmarket](https://apiv2.cardmarket.com/ws/documentation/API_2.0%3AArticles) ; les noms des paramètres web suivent l’URL fournie par l’utilisateur.

Les deux fonctions sont partagées entre la vérification et l’ancien écran d’estimation. Les liens sont reconstruits depuis la carte active à chaque rendu ; le choix de langue est sauvegardé à l’étape Photos. Ces paramètres concernent les liens de comparaison, sans appel à une API Cardmarket ni changement de calcul de la tendance TCGdex.

## Texte et prix d’annonce — 0.4.3

Le titre généré contient uniquement `Pokémon`, le nom et le numéro complet. L’extension, la langue et la variante restent dans les données de la carte, sans être ajoutées au titre. La description garde ses trois lignes : nom et numéro, langue, état détaillé. `migrateCard` reconnaît exactement les deux anciens formats de titre (avec ou sans langue) et l’ancienne description, uniquement lorsque l’empreinte de carte est encore valide et que l’annonce n’est ni publiée, vendue ni archivée. Chaque champ personnalisé est conservé indépendamment ; une mise à jour du texte supprime la référence à l’ancien transfert Vinted sans invalider les faits déjà confirmés. La restauration applique la même adaptation.

Le compagnon 0.2.10 utilise une chaîne sans décimales pour un montant entier, dans les champs texte et numériques. Une valeur équivalente déjà présente, comme `3.00`, est compactée une fois ; un composant qui reformate à la perte de focus ne déclenche pas de boucle de réécriture. Les centimes et la validation du montant exact sont conservés. L’application exige cette version avant un nouveau transfert.

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
