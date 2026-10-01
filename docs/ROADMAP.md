# Feuille de route

Statut initial : toutes les tâches ci-dessous sont ouvertes. Aucun module applicatif n'est encore implémenté.

| Phase | Tâche | Dépendances |
|---|---|---|
| Faisabilité | [#1 — Sources et accès Vinted](https://github.com/tristangenet/poke-scan-sell/issues/1) | Aucune |
| Conception | [#2 — Architecture et données](https://github.com/tristangenet/poke-scan-sell/issues/2) | #1 |
| MVP | [#3 — Capture et inventaire](https://github.com/tristangenet/poke-scan-sell/issues/3) | #2 |
| MVP | [#4 — Identification](https://github.com/tristangenet/poke-scan-sell/issues/4) | #1, #2, #3 |
| MVP | [#5 — État](https://github.com/tristangenet/poke-scan-sell/issues/5) | #3, #4 |
| MVP | [#6 — Estimation](https://github.com/tristangenet/poke-scan-sell/issues/6) | #1, #4, #5 |
| MVP | [#7 — Annonces](https://github.com/tristangenet/poke-scan-sell/issues/7) | #3 à #6 |
| Intégration conditionnelle | [#8 — Publication Vinted](https://github.com/tristangenet/poke-scan-sell/issues/8) | #1, #2, #7 et accès autorisé |
| Livraison | [#9 — Recette](https://github.com/tristangenet/poke-scan-sell/issues/9) | Modules livrés |

## Ordre de réalisation

Valider d'abord les sources et accès. Définir ensuite une architecture adaptée aux capacités effectivement disponibles. Livrer le parcours capture → identification → état → prix → annonce, puis la publication autorisée si possible.

Le transfert manuel assisté permet un MVP utilisable mais ne clôture pas la tâche #8. Documenter cette dépendance explicitement.

## Évolutions hors MVP

Traitement de plusieurs cartes, lots, cartes gradées, produits scellés, autres jeux et plateformes, historique détaillé des ventes.

## Critère de clôture

Chaque tâche doit satisfaire ses critères d'acceptation et référencer les preuves de vérification. Ne pas remplacer des données réelles par des simulations non signalées.
