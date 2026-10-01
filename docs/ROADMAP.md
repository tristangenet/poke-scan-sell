# Feuille de route

## Version 0.1.0 livrée

Le code de l'application est disponible : capture, OCR local, catalogue TCGdex, inventaire local, état guidé, analyse IA optionnelle, comparables manuels, estimation, annonce modifiable, export ZIP/JSON et restauration.

Les tâches restent ouvertes lorsque tous les critères du cahier des charges ne sont pas validés. Le transfert manuel assisté ne clôture pas la publication automatique.

| Tâche                                                                                 | Avancement réel                                                                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [#1 Sources et accès Vinted](https://github.com/tristangenet/poke-scan-sell/issues/1) | Catalogue TCGdex et agrégats Cardmarket disponibles ; collecte de comparables par état et accès publication Vinted non résolus |
| [#2 Architecture et données](https://github.com/tristangenet/poke-scan-sell/issues/2) | Modules séparés, serveur optionnel, IndexedDB, export/import ; comptes et synchronisation cloud hors version actuelle          |
| [#3 Capture et inventaire](https://github.com/tristangenet/poke-scan-sell/issues/3)   | Recto/verso/détails, originaux, luminosité/résolution, inventaire ; reprise entre appareils par export/import                  |
| [#4 Identification](https://github.com/tristangenet/poke-scan-sell/issues/4)          | OCR réel et catalogue ; confirmation des variantes ; précision sur 200 vraies cartes non mesurée                               |
| [#5 État](https://github.com/tristangenet/poke-scan-sell/issues/5)                    | Liste de contrôle et connecteur IA avec confirmation humaine ; validation IA réelle et métriques de surestimation à effectuer  |
| [#6 Estimation](https://github.com/tristangenet/poke-scan-sell/issues/6)              | Comparables manuels traçables et calcul testé ; collecte automatique par état non disponible                                   |
| [#7 Annonces](https://github.com/tristangenet/poke-scan-sell/issues/7)                | Textes, modifications, copier-coller, ZIP d'originaux et ouverture Vinted                                                      |
| [#8 Publication Vinted](https://github.com/tristangenet/poke-scan-sell/issues/8)      | Bloquée : pas de moyen autorisé validé ; publication assistée manuellement                                                     |
| [#9 Recette](https://github.com/tristangenet/poke-scan-sell/issues/9)                 | 13 tests unitaires/serveur et 4 parcours navigateur réussis ; corpus réel et plateformes à valider                             |

## Prochaines étapes

1. Configurer et valider le mode IA sur de vraies cartes.
2. Constituer le corpus de recette avec variantes et états divers.
3. Valider une source autorisée de comparables précis par état et langue.
4. Obtenir et tester un accès autorisé de publication Vinted.
5. Ajouter authentification/synchronisation cloud si un usage multi-appareil continu est souhaité.

## Hors MVP

Lots, cartes gradées, produits scellés, autres jeux, traitement par lots et autres plateformes.
