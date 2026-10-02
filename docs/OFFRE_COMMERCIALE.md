# Préparer une offre commerciale

## Base livrée en version 0.3.0

Le produit dispose d’une identité visuelle cohérente, d’un accueil explicatif et d’un parcours principal en trois écrans. Les actions courantes sont mises en avant ; les réglages techniques, comparables détaillés et outils manuels restent accessibles dans des volets secondaires.

La collection permet de reprendre une carte, rechercher, filtrer et trier. La saisie est sauvegardée automatiquement, les erreurs sont proches des champs et les anciennes cartes restent compatibles. L’aide, les sauvegardes et la connexion Vinted sont regroupées. La navigation est adaptée au téléphone et au clavier.

Les vues et règles d’affichage sont séparées dans `src/interface.js`, `src/quick-view.js` et `src/ui-state.js`. Les règles de carte, d’estimation et de transfert restent dans leurs modules existants. Cette séparation permet d’ajouter un espace client et une offre commerciale sans multiplier les étapes du scan.

## Ce qu’une offre payante devra ajouter

| Besoin                     | Travail à réaliser                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Comptes clients            | Inscription, connexion, récupération de compte et session vérifiée sur le serveur                                                  |
| Collection entre appareils | Stockage distant lié au propriétaire, contrôle d’accès aux cartes et photos, migration/import du stock local                       |
| Paiement unique            | Paiement hébergé par un prestataire, preuve d’achat validée côté serveur et droits d’utilisation associés au compte                |
| Abonnement                 | Souscription, modification et résiliation, états d’abonnement, factures, événements de paiement vérifiés et traités une seule fois |
| Usage de l’IA              | Autorisation par compte, comptage serveur des appels, limites explicites et coûts suivis                                           |
| Distribution du compagnon  | Installation publique simple, mise à jour et association aux adresses autorisées de l’application                                  |
| Exploitation               | Hébergement stable, suivi des erreurs, sauvegardes serveur et canal d’aide                                                         |

Les comptes, paiements, abonnements et quotas commerciaux ne sont pas implémentés dans cette version. Le code d’accès actuel du service IA protège une instance ; il ne constitue pas un abonnement client. La collection reste locale.

## Parcours à conserver

Le client doit pouvoir commencer par **Scanner**, préparer ses photos et comprendre le service. La connexion doit intervenir au moment utile pour enregistrer la collection dans son compte. L’offre payante doit être consultable depuis **Mon compte**, avec droits, montant et renouvellement visibles ; elle ne doit pas ajouter une étape à chaque carte.

Si une limite est atteinte, garder le brouillon et expliquer l’action disponible. Après un paiement confirmé par le serveur, permettre de reprendre à l’étape précédente. Le contrôle d’accès et les limites doivent être appliqués au serveur ; masquer un bouton dans le navigateur ne protège pas une fonctionnalité payante.

## Ordre d’implémentation

1. Définir le modèle de vente : achat unique, abonnement ou crédits d’analyse, et les fonctionnalités incluses.
2. Ajouter les comptes et la collection distante avec import des cartes locales.
3. Intégrer le paiement et les droits côté serveur, puis l’espace client et le suivi d’usage.
4. Simplifier la distribution du compagnon et vérifier les parcours avec de nouveaux utilisateurs, sur vraies cartes et navigateurs cibles.

L’achat unique et l’abonnement peuvent partager le même écran de scan et les mêmes règles d’annonce. Les montants et limites restent à définir à partir des coûts et des usages observés. Aucun tarif ni compteur d’abonnement fictif n’est présenté dans l’application.
