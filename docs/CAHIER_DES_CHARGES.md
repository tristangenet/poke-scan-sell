# Cahier des charges — Poke Scan Sell

Version 1.0 — 1 octobre 2026 — Document de référence fonctionnel.

## 1. Objectif

Transformer les photos d'une carte Pokémon en une annonce fiable : photographier le recto et le verso, identifier la référence exacte, proposer un état, rechercher des prix comparables, choisir le prix, générer l'annonce, ouvrir Vinted et publier via un moyen autorisé, puis conserver le lien et le statut.

Chaque information doit rester corrigeable. Le remplissage et la publication automatiques constituent l'objectif cible ; leur disponibilité dépend d'une intégration autorisée. Le transfert manuel assisté est un repli et ne vaut pas livraison de l'automatisation.

## 2. Périmètre initial

- Cartes Pokémon individuelles non gradées, marché français, euros.
- Français en priorité ; autre langue confirmable manuellement.
- Capture sur téléphone et import sur ordinateur.
- Une annonce par exemplaire physique ; inventaire personnel.
- Hors MVP : lots, cartes gradées, produits scellés, autres jeux.

## 3. Supports et parcours

Application responsive installable sur téléphone ; reprise sur ordinateur avec le même compte. Composant local complémentaire seulement si nécessaire et autorisé pour l'intégration.

Écrans : Scanner, Fiche carte, Estimation, Annonce, Inventaire.

Parcours : capture → identification → confirmation de l'état → estimation → choix du prix → prévisualisation → publication → suivi. Sauvegarde du brouillon à chaque étape.

## 4. Capture

Recto et verso, puis détails des coins, bords, défauts et vue inclinée pour la finition. Cadre de positionnement ; contrôle du flou, de l'éclairage et des reflets ; nouvelle capture demandée si nécessaire. Orientation et recadrage proposés, originaux conservés, ordre des photos modifiable.

Aucun traitement ne doit effacer un défaut. Les images du catalogue servent à l'identification, jamais à représenter la carte vendue dans l'annonce.

## 5. Identification

Combiner OCR, analyse visuelle et rapprochement catalogue.

Champs : nom complet, numéro conservant préfixes/lettres/dénominateur, extension, langue, variante (standard/holo/reverse/promotionnelle…), édition ou tampon particulier, identifiant catalogue stable et confiance par champ.

Le nom et le numéro ne suffisent pas lorsqu'il existe plusieurs variantes. Présenter jusqu'à trois candidats illustrés avec leurs différences. Permettre la correction, la recherche manuelle et l'enregistrement d'une carte inconnue sans inventer de référence.

Ne pas présenter la reconnaissance comme une certification d'authenticité. Une suspicion de contrefaçon entraîne une vérification avant publication.

## 6. État

Évaluer les défauts visibles : bords, coins, rayures, plis, déformations, taches, humidité et altérations de surface. Échelle interne : M, NM, EX, GD, LP, PL, PO, expliquée dans l'interface.

Retour : état proposé, défauts et zones concernés, confiance, besoins de photos supplémentaires. L'utilisateur confirme l'état. Une image insuffisante ou le verso manquant produit « État à vérifier », jamais une appréciation favorable par défaut.

La correspondance avec les états Vinted réellement disponibles dans la catégorie doit être explicite et modifiable. L'évaluation photographique ne constitue ni une authentification ni une notation professionnelle.

## 7. Sources et nature des prix

Sources interchangeables : données Cardmarket accessibles et autorisées, données Vinted via un moyen autorisé, comparables saisis manuellement, historique de ventes personnelles.

Chaque observation conserve : source, URL si disponible, date de collecte et date de transaction si connue, référence, langue, variante, état, montant, devise et frais inclus/exclus.

Distinguer :

- Prix demandé : montant d'une annonce.
- Vente réalisée vérifiée : montant final connu d'une transaction.
- Indicateur de marché : agrégat fourni par une source.

Une annonce marquée vendue ne prouve pas son prix final. Un agrégat général ne constitue pas un prix exact pour une langue et un état précis.

## 8. Estimation

Privilégier même référence, variante, langue et état. Exclure les lots, cartes gradées et références incompatibles ; dédupliquer ; traiter les valeurs atypiques et la fraîcheur. Conserver les références Vinted et Cardmarket séparément, sans moyenne aveugle entre marchés.

Afficher échantillon retenu, fourchette basse/haute, prix conseillé, confiance, date et justification. Trois stratégies configurables : vente rapide (bas de fourchette), équilibrée (proche de la médiane), prix haut (haut de fourchette avec négociation).

Pas de coefficient universel de décote présenté comme un fait de marché. Les seuils de fraîcheur, d'effectif et de dispersion sont versionnés et validés pendant la faisabilité. Sans échantillon suffisant, afficher « Données insuffisantes » ; référence indicative clairement signalée et prix manuel possibles.

Comparer sur une base cohérente : carte, livraison et frais acheteur séparés lorsque connus.

## 9. Annonce

Générer titre, description, prix, catégorie proposée, état Vinted, attributs obligatoires, photos ordonnées et format de colis fondé sur l'emballage déclaré.

Titre type : Pokémon — [Nom] — [Numéro] — [Extension] — [Langue] — [Variante].

Description : identité, extension/langue/variante, état confirmé, défauts, photos de l'exemplaire vendu et modalités de protection/expédition configurées. Aucun ajout non justifié comme « authentique », « parfait », « PSA 10 » ou « très rare ». L'emballage annoncé doit correspondre à la pratique réelle.

Respecter les contraintes effectives du formulaire cible. Tous les champs sont modifiables ; une régénération ne doit pas écraser silencieusement les corrections.

## 10. Publication Vinted

Module indépendant, activé uniquement après validation d'un moyen autorisé.

Séquence : ouvrir Vinted ou l'interface autorisée ; vérifier le compte ; transférer les photos ; renseigner texte, prix, catégorie, état et attributs ; valider les champs obligatoires ; publier ; récupérer identifiant/URL ; confirmer l'existence de l'annonce avant le statut Publiée.

Modes :

1. Validation avant publication.
2. Publication automatique activée préalablement par l'utilisateur, selon des règles configurables.

Suspendre l'automatisation si identité ambiguë, état non confirmé, estimation insuffisante ou seuil de valeur dépassé. Ne pas présumer qu'une application mobile peut piloter librement l'application Vinted.

Repli : boutons copier titre/description, téléchargement photos, récapitulatif des champs, ouverture de Vinted et saisie du lien après publication manuelle.

Ne pas contourner les contrôles de sécurité, les restrictions d'accès ou les CAPTCHA. Conserver le brouillon en cas de session expirée, de vérification ou de changement du formulaire.

## 11. Doublons et incidents

Identifiant unique pour chaque exemplaire physique ; plusieurs cartes identiques réellement possédées restent distinctes.

Une coupure après envoi produit « Publication à vérifier ». Rechercher le résultat précédent avant nouvelle tentative ; aucune republication automatique à l'aveugle. Historiser tentatives et confirmations. Prévoir une clé d'idempotence interne ; elle ne remplace pas la vérification côté plateforme.

## 12. Inventaire

Conserver photos, identité confirmée, états suggéré/validé, observations de prix, estimation datée, prix choisi, brouillon, lien Vinted et historique.

Statuts : À identifier, À vérifier, Estimée, Prête, Publication en cours, Publication à vérifier, Publiée, Vendue, Archivée.

Vente mise à jour via synchronisation autorisée ou déclaration utilisateur. Export de l'inventaire et suppression des données disponibles.

## 13. Architecture et sécurité

Modules séparés : interface/capture, reconnaissance, évaluation d'état, connecteurs de prix, estimation, génération, publication, stockage.

Entités distinctes : référence catalogue, exemplaire physique, photo, observation de prix, estimation, annonce, tentative de publication et événement d'audit.

Connecteurs remplaçables sans réécrire l'application. Secrets côté serveur ou coffre sécurisé local adapté ; aucun mot de passe, cookie ou jeton dans les logs. Contrôle d'accès par propriétaire des cartes et des images. Photos non réutilisées pour l'entraînement sans accord explicite. Documenter conservation, suppression et sous-traitants.

Aucune pile technique n'est imposée à ce stade : documenter le choix après le prototype de faisabilité.

## 14. Recette

Objectifs à mesurer sur un jeu distinct des données d'ajustement :

- Référence exacte : objectif 95 % sur 200 cartes du périmètre avec photos conformes ; identité complète, variante incluse.
- Ambiguïtés de variante : demande de confirmation.
- Verso absent/photos insuffisantes : pas de validation automatique de l'état.
- Prix : source, date, nature de donnée et comparables visibles ; aucune estimation inventée.
- Exclusion des lots, variantes incompatibles et cartes gradées.
- Corrections utilisateur conservées.
- Publiée uniquement après confirmation et référence d'annonce.
- Interruption et reprise sans doublon.
- Objectif 30 secondes pour identification + estimation hors capture et indisponibilité externe.

Mesurer séparément l'évaluation d'état, notamment le taux de surestimation. Tester refus d'accès, données périmées, reconnexion, absence de prix et formulaire cible modifié. Les objectifs ne sont pas des performances déjà atteintes.

## 15. Phases

1. Faisabilité : droits et accès, couverture catalogue, finesse des prix par état/langue, démonstration sur quelques cartes, décision pour chaque connecteur.
2. MVP : capture, identification, confirmation d'état, estimation traçable, annonce et inventaire.
3. Publication : intégration autorisée ou repli explicitement identifié ; la cible automatique reste ouverte si l'accès manque.
4. Évolutions : lots, batch de cartes, cartes gradées, historique et autres plateformes.

## 16. Livrables

Code source, application déployée/installable, documentation d'installation, modèle de données, connecteurs documentés, paramètres versionnés, résultats de recette, guide utilisateur, coûts des services externes et liste des dépendances non résolues.

Distinguer développement, hébergement, analyse d'images, accès aux prix et maintenance des intégrations dans le chiffrage.

## Sources et contraintes vérifiées au 1 octobre 2026

- Cardmarket API : https://help.cardmarket.com/en/cardmarket-api — nouvelles demandes d'accès non acceptées au moment de la consultation ; ne pas fonder le MVP sur l'obtention présumée d'une clé.
- Catalogue et guide des prix : https://news.cardmarket.com/en/Magic/were-making-the-price-guide-and-product-catalogue-available-for-download — disponibilité annoncée pour tous les jeux ; vérifier licence, format, fréquence et granularité réellement exploitables pour Pokémon.
- État : https://help.cardmarket.com/fr/CardCondition
- Vinted : https://www.vinted.fr/terms-and-conditions — page consultée annonçant une version applicable au 5 octobre 2026, encadrant les logiciels externes ; valider l'autorisation applicable avant développement du connecteur.
- Version Vinted antérieure : https://www.vinted.fr/old-terms-and-conditions

Ces dépendances doivent être réévaluées avant activation. Aucun accès autorisé à Vinted ni flux de ventes finales par état n'est acquis par la création de ce dépôt.
