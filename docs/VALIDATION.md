# Validation — version 0.2.6

Vérifications effectuées le 1 octobre 2026.

| Vérification                               | Résultat                                                   |
| ------------------------------------------ | ---------------------------------------------------------- |
| Construction de production Vite            | Réussie                                                    |
| Tests unitaires et serveur Node            | 37 réussis                                                 |
| Parcours navigateur Chromium               | 21 réussis                                                 |
| Interface desktop 1440 px et mobile 390 px | Vérifiée visuellement ; pas de débordement horizontal      |
| Service catalogue TCGdex réel              | Réponse JSON observée pour base1-4 et recherche nom/numéro |
| OCR réel Tesseract.js local                | Nom Dracaufeu et numéro 4/102 lus sur image synthétique    |
| Appel IA OpenAI avec une clé réelle        | Non exécuté ; connecteur validé avec réponses simulées     |
| Publication réelle sur Vinted              | Non exécutée ; mode manuel assisté uniquement              |

## Transfert Vinted

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
