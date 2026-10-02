# Validation — version 0.3.1

## Liens de comparaison Cardmarket — 0.3.1

Vérifications exécutées le 2 octobre 2026 : construction Vite réussie, 37 tests Node et les sept parcours navigateur de l’interface réussis. Contrôle complémentaire dans Chromium avec une carte synthétique « Dracaufeu 010/078 — Pokémon GO » : lien Cardmarket présent à côté de Vinted, recherche « Dracaufeu 010 », ouverture prévue dans un nouvel onglet avec `noopener noreferrer`, recherche Vinted conservée. Après modification en « Évoli TG01/TG30 », la recherche devient « Évoli TG01 » dans la vérification et les options avancées. Aucun débordement à 320, 390 et 1440 pixels, aucune erreur JavaScript ; panneau du prix inspecté visuellement à 320 pixels.

Le [guide officiel Cardmarket](https://help.cardmarket.com/fr/finding-and-listing-pokemon-cards) indique que la recherche 2.0 accepte le nom suivi du numéro de collection, y compris séparés par un espace. Le lien et ses paramètres ont été vérifiés dans l’application ; la page de résultats Cardmarket n’a pas pu être consultée par l’outil de navigation. Aucun résultat externe ni prix n’a été déduit de ce contrôle.

## Suite de référence — 0.3.0

Construction, tests Node et parcours navigateur exécutés le 2 octobre 2026. Les vérifications externes précédentes conservent leurs dates ci-dessous.

| Vérification                                | Résultat                                                              |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Construction de production Vite             | Réussie                                                               |
| Tests unitaires et serveur Node             | 37 réussis                                                            |
| Parcours navigateur Chromium                | 51 réussis                                                            |
| Interface 1440 px, 768 px, 390 px et 320 px | Vues inspectées ; contrôles de débordement réussis sur les sept pages |
| Service catalogue TCGdex réel               | Réponse JSON observée pour base1-4 et recherche nom/numéro            |
| OCR réel Tesseract.js local                 | Nom Dracaufeu et numéro 4/102 lus sur image synthétique               |
| Appel IA OpenAI avec une clé réelle         | Non exécuté ; connecteur validé avec réponses simulées                |
| Publication réelle sur Vinted               | Non exécutée ; mode manuel assisté uniquement                         |

## Interface et reprise des brouillons

Sept parcours ajoutés en version 0.3.0 : première utilisation, navigation et aide au clavier, reprise sans créer plusieurs brouillons vides et conservation des archives ; erreurs de champ et prix hors limite ; autosauvegarde sans quitter le champ, rechargement et volets maintenus ouverts ; texte personnalisé conservé lors d’une vérification inchangée, navigation précédent/suivant et blocage d’un titre vide ; recherche sans accents, filtres de statut et tri sans perte de carte ; trois parcours à 320, 390 et 768 pixels couvrant accueil, collection, photos, vérification, annonce, aide et paramètres avec cartes synthétiques.

La saisie rapide a révélé une concurrence entre sauvegarde d’un champ et validation d’un autre. La valeur est maintenant appliquée en mémoire dès l’événement de saisie ; les erreurs sont retirées avant la sauvegarde, pour conserver celles d’une validation plus récente. Le statut d’enregistrement est préservé lors des rafraîchissements de vue. Les tests de focus, de restauration et d’erreurs passent après correction.

Inspection visuelle à 1440 et 390 pixels : accueil, photos, collection avec quatre cartes de démonstration, vérification, aperçu d’annonce, aide et paramètres. Les données et photos sont synthétiques. Les captures de documentation ont été actualisées. Les tests de transfert acceptent le compagnon 0.2.9 avec l’application 0.3.0, conservent les textes corrigés et bloquent une nouvelle transmission après modification du prix. Les scripts du compagnon et le protocole n’ont pas changé.

La construction, les 37 tests Node et les 51 parcours Chromium passent. Les nouveaux écrans ne déclenchent aucun abonnement ni paiement ; comptes, collection distante et facturation sont documentés comme travaux à venir.

## Transfert Vinted

Régression état 0.2.9 : une liste de contrôle avec titres, descriptions sans saut de ligne et boutons radio, inspirée de la capture fournie le 2 octobre, laisse l’état vide avec le script 0.2.8. Après correction, trois parcours vérifient EX → Très bon état, GD → Bon état et PL → Satisfaisant, avec prix décimal conservé, deux photos et aucun clic Publier. Deux variantes vérifient des lignes radio sans rôle option et un sélecteur à bouton. Un parcours attend le champ d’état monté après la catégorie. Un choix au titre ambigu reste vide et partiel ; un choix refusé peut être repris sans relire les photos. Le neuvième nouveau parcours utilise le worker et sa file IndexedDB réels avec les APIs Chrome simulées : l’état refusé conserve brouillon et deux originaux, la reprise confirme l’état sans nouvel événement d’envoi photo puis efface les données temporaires. Le résultat filled exige maintenant l’état confirmé dans le sélecteur.

Le retour utilisateur précédant la correction de l’état acceptait le prix et demandait aussi le remplissage de l’état. Le retour suivant confirme que le fonctionnement convient et demande une interface plus simple. Les titres de choix visibles sur sa capture ont été utilisés dans le formulaire de contrôle. Le DOM exact du compte connecté et son état interne n’ont pas été inspectés. Le résultat sur ce compte reste donc à vérifier après installation du compagnon 0.2.9.

Régression prix 0.2.8 : six nouveaux formulaires de contrôle ont d’abord exercé le script 0.2.7. Les formats à virgule et numérique fonctionnaient ; quatre cas échouaient : format texte à point recevant `12,25`, champ monétaire normalisant cette saisie en `12`, composant avec titre « Prix » et identifiant `price-field--input` restant vide, et montant transformé entraînant un blocage plutôt qu’un résultat partiel. Les six cas passent après correction. Deux autres parcours vérifient qu’un prix antérieur d’un autre brouillon et une saisie utilisateur pendant la validation ne sont pas écrasés. La validation du prix porte sur le montant exact, les contraintes natives et `aria-invalid`, avec reprise de séparateur et restauration de la valeur antérieure en cas de refus. Les vingt parcours Vinted passent, ainsi que les tests Node et la construction. Un neuvième nouveau cas vérifie un champ sans indication de format dont la valeur affichée peut rester à virgule tandis que son état numérique utilise parseFloat ; le format par défaut à point conserve le montant exact. Ce cas passe aussi. Les quatorze autres parcours de l’application passent, soit trente-cinq parcours navigateur et trente-sept tests Node au total.

Le retour utilisateur du 2 octobre confirme que le reste du transfert fonctionne, avec un prix encore manquant. Aucun diagnostic du champ réel n’a été reçu pendant cette correction ; le cas précis du compte utilisateur n’a donc pas été observé et reste à confirmer après mise à jour du compagnon 0.2.8.

Régression 0.2.7 : comparaison des scripts 0.2.6 et 0.2.7 sur un même formulaire dont les champs sont désactivés jusqu’à l’ajout de photos. Après 1,2 seconde, 0.2.6 reste en chargement, titre vide et aucune photo ; 0.2.7 a rempli le titre, la description et le prix, soumis deux photos et reçu un résultat `filled`. Ce formulaire est contrôlé ; le blocage exact du formulaire utilisateur n’a pas été observé.

Cinq parcours ajoutés : libellé de conteneur avec texte complémentaire malgré une aria-label générique, nom `item[description]` et identifiant sur conteneur du prix en conservant la recherche du site ; champs débloqués par les photos et prix monté plus tard ; prix ambigu laissant les autres champs et photos remplis avec résultat partiel, diagnostic sans valeurs et reprise sans doublon ; message de lecture photo sans réponse produisant une erreur après trente secondes ; extension 0.2.6 signalée comme ancienne, instructions de rechargement et aucun nouvel envoi de brouillon. Les douze parcours ciblés puis les vingt-six parcours de l’application passent. Le panneau Vinted v0.2.7 et les instructions de mise à jour de l’application ont été inspectés visuellement.

Le CLI agent-browser s’arrête au démarrage de son daemon dans cet environnement ; les vérifications ont utilisé Playwright avec Chromium. La visite du 2 octobre à `/items/new` a redirigé vers la connexion Vinted. Aucun compte connecté ni annonce réelle n’a été utilisé. Le transfert réel du formulaire utilisateur reste donc à confirmer après mise à jour des fichiers de l’extension, rechargement du compagnon et des deux onglets.

Sept nouveaux parcours navigateur : saisie du titre et de la description corrigée, prix décimal, catégorie et état par libellés, conservation octet par octet des deux photos, absence de clic Publier, protection d’un brouillon existant, champs non reconnus signalés, installation guidée sans extension, contenu et association du ZIP à l’origine exacte, transfert en un clic depuis une carte validée et blocage après modification du prix. La file IndexedDB réelle et les scripts réels sont aussi exercés de l’application jusqu’au formulaire de contrôle, avec API Chrome de messages/onglets simulées : connexion en attente puis reprise dans le même onglet, rejet d’une autre application, résultat retourné et suppression des originaux temporaires après transfert complet.

Trois tests de protocole vérifient l’identifiant stable de l’extension, l’origine exacte de l’application, les limites du texte/prix, le recto/verso et la validation des photos locales jusqu’à 10 Mo. Le Chromium disponible ne permet pas de charger l’extension complète ; Chrome for Testing a été téléchargé mais son démarrage est bloqué par une restriction de sockets de l’environnement. Le chargement Manifest V3 et le formulaire réel d’un compte Vinted connecté restent donc à valider dans le navigateur utilisateur. Le site réel a redirigé vers la connexion lors de la visite du 1 octobre. Aucun compte Vinted ni annonce réelle n’a été créé ou modifié.

## Mode rapide

OCR réel sur image synthétique et catalogue simulé : proposition unique selon numéro complet, variante unique proposée, tendance choisie explicitement, refus de générer sans état de la carte, validation unique et génération sans libellé d’état Vinted ni emballage, blocage du ZIP après changement de prix. Les deux champs sont absents du mode rapide et des options avancées ; le texte généré et le ZIP omettent leurs mentions automatiques. Deux éditions avec le même numéro complet conservent le nom et le numéro, sans liste de choix ni demande de reprendre la photo pour l’édition. Le parcours crée une annonce et active le ZIP avec extension et variante vides ; le titre et la description omettent ces champs. Aucune tendance de prix d’une édition arbitraire n’est proposée. Tests du résolveur : extension lisible départageant les éditions, suffixes ex, noms courts, numéros isolés et promos, refus des contradictions de nom/numéro et des catalogues incomplets ; extension contradictoire ignorée pour l’identité de base, sans attribution de fiche catalogue. Le bouton OCR du mode avancé applique aussi la référence automatiquement. Parcours IA simulé : identité et état préremplis, variante proposée visible, aucune confirmation implicite. Aucun appel OpenAI réel.

## Régression de lecture

Nouveaux tests navigateur avec le moteur OCR réel et des images synthétiques : nom conservé sans numéro après les nouvelles tentatives, nom conservé pour un numéro absent du catalogue, numéro TG01/TG30 conservé sans remplacement par le total de l’extension, référence 4/102 récupérée à partir de 4102 avec nom et total concordants. Analyse IA simulée : nom et numéro conservés sans résultat catalogue. Tests de logique : faute d’une lettre avec numéro concordant, refus d’un nom approximatif ambigu, confusion OCR O/0 dans le numéro, numéro du bas préféré à un ratio d’attaque, champ manquant explicite, priorité au titre principal plutôt qu’à la pré-évolution, récupération d’un séparateur manquant uniquement avec métadonnées concordantes et exclusion des années de copyright. Moteur simulé dans les tests unitaires de reprises : récupération par les zones agrandies et fin bornée des huit tentatives sur une image illisible. Aucune photo du dernier test utilisateur n’a été fournie ; la reconnaissance de cette photo précise reste à vérifier.

Test complémentaire sur l’image réelle du catalogue Dracaufeu base1-4 (https://assets.tcgdex.net/fr/base/base1/4/high.webp), avec les 22 170 cartes et 202 extensions de l’API réelle chargées le 1 octobre : le défaut a été reproduit, puis la correction a rempli Dracaufeu, 4/102 et Set de Base sans erreur JavaScript. Il s’agit d’une image de catalogue nette, pas d’une photographie physique de l’exemplaire utilisateur.

## Régression catalogue

Cas navigateur : 30 références candidates, identification de la 29e grâce au total de l’extension sans charger les autres fiches ; récupération après une erreur HTTP 503 ; identité conservée avec un détail HTTP 404 et prix/variante vides. Tests client : reprises sur 503/429, absence de cache des échecs, déduplication des requêtes en cours, copie indépendante des résultats, limite de trois requêtes simultanées et actualisation explicite contournant le cache.

Requêtes HTTP réelles le 1 octobre : catalogue français de 22 170 cartes, 202 extensions et fiches de cartes examinées avec succès. Le rapprochement des métadonnées réelles identifie base1-4 à partir de Dracaufeu 4/102. La photo du test utilisateur signalant l’erreur n’a pas été fournie : ce cas précis n’a pas été reproduit sur son image.

## Parcours navigateur

Ajout d'un exemplaire et de photos synthétiques recto/verso ; identité manuelle confirmée ; état confirmé ; trois comparables ajoutés ; prix conseillé appliqué ; texte d'annonce généré et corrigé ; ZIP contenant les deux photos et le texte inspecté ; publication déclarée manuellement ; sauvegarde JSON ; rechargement ; restauration sans écraser l'exemplaire existant.

Autres scénarios : mobile sans débordement ; verso absent empêchant la confirmation d'état ; absence de données donnant « Données insuffisantes » ; sélection catalogue sans confirmation implicite ; échappement de données externes contenant du HTML ; OCR avec le moteur et les modèles réels servis localement. Les données catalogue sont simulées dans les tests automatisés pour garantir leur reproductibilité ; une lecture HTTP réelle du catalogue a été vérifiée séparément.

## Règles de calcul et serveur

Les tests couvrent séparation des marchés et types de prix, refus des agrégats pour l'estimation selon état, exclusion des références/états/devises/dates incompatibles, déduplication et prix extrêmes. Les annonces périmées après modification des faits sont détectées. Les anciens brouillons sont migrés en supprimant les champs d’état Vinted et d’emballage ; les textes personnalisés et les contrôles de péremption sont conservés.

Le serveur construit sert l'interface et les ressources ; le mode IA non configuré renvoie une indisponibilité explicite. Les tests du connecteur vérifient le schéma de réponse, l'exigence recto/verso, l'absence de conservation de la réponse via store:false, et le rejet d'un résultat incomplet/refusé. Aucun secret réel ni photo utilisateur n'a servi aux tests.

## Limites de la validation

Ces tests fonctionnels ne mesurent pas la précision sur 200 vraies cartes, la qualité d'évaluation de l'état ou un taux de détection des contrefaçons. Les objectifs de 95 % et de 30 secondes du cahier des charges restent à mesurer sur un corpus représentatif. Le mode IA nécessite encore configuration et validation avec une clé et un quota. L'accès autorisé à la publication Vinted et à des comparables automatiques par état reste non résolu.
