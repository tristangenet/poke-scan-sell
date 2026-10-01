# Validation — version 0.2.3

Vérifications effectuées le 1 octobre 2026.

| Vérification                               | Résultat                                                   |
| ------------------------------------------ | ---------------------------------------------------------- |
| Construction de production Vite            | Réussie                                                    |
| Tests unitaires et serveur Node            | 24 réussis                                                 |
| Parcours navigateur Chromium               | 9 réussis                                                  |
| Interface desktop 1440 px et mobile 390 px | Vérifiée visuellement ; pas de débordement horizontal      |
| Service catalogue TCGdex réel              | Réponse JSON observée pour base1-4 et recherche nom/numéro |
| OCR réel Tesseract.js local                | Nom Dracaufeu et numéro 4/102 lus sur image synthétique    |
| Appel IA OpenAI avec une clé réelle        | Non exécuté ; connecteur validé avec réponses simulées     |
| Publication réelle sur Vinted              | Non exécutée ; mode manuel assisté uniquement              |

## Mode rapide

OCR réel sur image synthétique et catalogue simulé : proposition unique selon numéro complet, variante unique proposée, tendance choisie explicitement, refus de générer sans état et emballage, validation unique et génération, blocage du ZIP après changement de prix, réutilisation des préférences d’emballage. Deux éditions avec le même numéro complet conservent le nom et le numéro, sans liste de choix ni demande de reprendre la photo pour l’édition. Le parcours crée une annonce et active le ZIP avec extension et variante vides ; le titre et la description omettent ces champs. Aucune tendance de prix d’une édition arbitraire n’est proposée. Tests du résolveur : extension lisible départageant les éditions, suffixes ex, noms courts, numéros isolés et promos, refus des contradictions de nom/numéro et des catalogues incomplets ; extension contradictoire ignorée pour l’identité de base, sans attribution de fiche catalogue. Le bouton OCR du mode avancé applique aussi la référence automatiquement. Parcours IA simulé : identité et état préremplis, variante proposée visible, aucune confirmation implicite. Aucun appel OpenAI réel.

## Régression catalogue

Cas navigateur : 30 références candidates, identification de la 29e grâce au total de l’extension sans charger les autres fiches ; récupération après une erreur HTTP 503 ; identité conservée avec un détail HTTP 404 et prix/variante vides. Tests client : reprises sur 503/429, absence de cache des échecs, déduplication des requêtes en cours, copie indépendante des résultats, limite de trois requêtes simultanées et actualisation explicite contournant le cache.

Requêtes HTTP réelles le 1 octobre : catalogue français de 22 170 cartes, 202 extensions et fiches de cartes examinées avec succès. Le rapprochement des métadonnées réelles identifie base1-4 à partir de Dracaufeu 4/102. La photo du test utilisateur signalant l’erreur n’a pas été fournie : ce cas précis n’a pas été reproduit sur son image.

## Parcours navigateur

Ajout d'un exemplaire et de photos synthétiques recto/verso ; identité manuelle confirmée ; état confirmé ; trois comparables ajoutés ; prix conseillé appliqué ; texte d'annonce généré et corrigé ; ZIP contenant les deux photos et le texte inspecté ; publication déclarée manuellement ; sauvegarde JSON ; rechargement ; restauration sans écraser l'exemplaire existant.

Autres scénarios : mobile sans débordement ; verso absent empêchant la confirmation d'état ; absence de données donnant « Données insuffisantes » ; sélection catalogue sans confirmation implicite ; échappement de données externes contenant du HTML ; OCR avec le moteur et les modèles réels servis localement. Les données catalogue sont simulées dans les tests automatisés pour garantir leur reproductibilité ; une lecture HTTP réelle du catalogue a été vérifiée séparément.

## Règles de calcul et serveur

Les tests couvrent séparation des marchés et types de prix, refus des agrégats pour l'estimation selon état, exclusion des références/états/devises/dates incompatibles, déduplication et prix extrêmes. Les annonces périmées après modification des faits sont détectées.

Le serveur construit sert l'interface et les ressources ; le mode IA non configuré renvoie une indisponibilité explicite. Les tests du connecteur vérifient le schéma de réponse, l'exigence recto/verso, l'absence de conservation de la réponse via store:false, et le rejet d'un résultat incomplet/refusé. Aucun secret réel ni photo utilisateur n'a servi aux tests.

## Limites de la validation

Ces tests fonctionnels ne mesurent pas la précision sur 200 vraies cartes, la qualité d'évaluation de l'état ou un taux de détection des contrefaçons. Les objectifs de 95 % et de 30 secondes du cahier des charges restent à mesurer sur un corpus représentatif. Le mode IA nécessite encore configuration et validation avec une clé et un quota. L'accès autorisé à la publication Vinted et à des comparables automatiques par état reste non résolu.
