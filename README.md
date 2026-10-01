# Poke Scan Sell

Photographier une carte Pokémon, identifier sa référence et sa variante, confirmer son état, estimer son prix et préparer sa vente sur Vinted.

## Statut

**Projet initialisé : documentation et plan de développement. L'application n'est pas encore implémentée.**
Aucune reconnaissance IA, estimation en direct ni publication automatique n'est actuellement opérationnelle.

## Parcours cible

1. Capturer recto et verso.
2. Confirmer référence, variante, langue et état.
3. Consulter des prix sourcés et choisir le prix.
4. Générer et vérifier l'annonce.
5. Publier via une intégration Vinted autorisée ; utiliser le transfert manuel assisté si cet accès manque.
6. Conserver le lien et le statut dans l'inventaire.

## Documentation

- [Cahier des charges](docs/CAHIER_DES_CHARGES.md)
- [Feuille de route](docs/ROADMAP.md)
- [Tâches de développement](../../issues)

## Contraintes structurantes

- Prix demandé, vente réalisée vérifiée et indicateur agrégé sont distincts.
- Ne pas inventer de prix, de variante ou de certification d'authenticité.
- L'état photographique doit être confirmé et les défauts conservés sur les photos.
- L'accès API Cardmarket et l'automatisation Vinted ne sont pas acquis.
- Aucun contournement des contrôles de sécurité ; aucune publication en double après incident.

## Développement

Commencer par les tâches de faisabilité avant de choisir la pile technique.
Il n'existe pas encore de commande d'installation ou de lancement. Les documenter avec la première implémentation.
Ne jamais committer de secrets, de cookies de session, de photos personnelles ou d'exports de comptes.

Projet indépendant, non affilié à Pokémon, Vinted ou Cardmarket.
