# Validation — version 0.1.0

Vérifications effectuées le 1 octobre 2026.

| Vérification                               | Résultat                                                   |
| ------------------------------------------ | ---------------------------------------------------------- |
| Construction de production Vite            | Réussie                                                    |
| Tests unitaires et serveur Node            | 13 réussis                                                 |
| Parcours navigateur Chromium               | 4 réussis                                                  |
| Interface desktop 1440 px et mobile 390 px | Vérifiée visuellement ; pas de débordement horizontal      |
| Service catalogue TCGdex réel              | Réponse JSON observée pour base1-4 et recherche nom/numéro |
| OCR réel Tesseract.js local                | Nom Dracaufeu et numéro 4/102 lus sur image synthétique    |
| Appel IA OpenAI avec une clé réelle        | Non exécuté ; connecteur validé avec réponses simulées     |
| Publication réelle sur Vinted              | Non exécutée ; mode manuel assisté uniquement              |

## Parcours navigateur

Ajout d'un exemplaire et de photos synthétiques recto/verso ; identité manuelle confirmée ; état confirmé ; trois comparables ajoutés ; prix conseillé appliqué ; texte d'annonce généré et corrigé ; ZIP contenant les deux photos et le texte inspecté ; publication déclarée manuellement ; sauvegarde JSON ; rechargement ; restauration sans écraser l'exemplaire existant.

Autres scénarios : mobile sans débordement ; verso absent empêchant la confirmation d'état ; absence de données donnant « Données insuffisantes » ; sélection catalogue sans confirmation implicite ; échappement de données externes contenant du HTML ; OCR avec le moteur et les modèles réels servis localement. Les données catalogue sont simulées dans les tests automatisés pour garantir leur reproductibilité ; une lecture HTTP réelle du catalogue a été vérifiée séparément.

## Règles de calcul et serveur

Les tests couvrent séparation des marchés et types de prix, refus des agrégats pour l'estimation selon état, exclusion des références/états/devises/dates incompatibles, déduplication et prix extrêmes. Les annonces périmées après modification des faits sont détectées.

Le serveur construit sert l'interface et les ressources ; le mode IA non configuré renvoie une indisponibilité explicite. Les tests du connecteur vérifient le schéma de réponse, l'exigence recto/verso, l'absence de conservation de la réponse via store:false, et le rejet d'un résultat incomplet/refusé. Aucun secret réel ni photo utilisateur n'a servi aux tests.

## Limites de la validation

Ces tests fonctionnels ne mesurent pas la précision sur 200 vraies cartes, la qualité d'évaluation de l'état ou un taux de détection des contrefaçons. Les objectifs de 95 % et de 30 secondes du cahier des charges restent à mesurer sur un corpus représentatif. Le mode IA nécessite encore configuration et validation avec une clé et un quota. L'accès autorisé à la publication Vinted et à des comparables automatiques par état reste non résolu.
