# Remplir une annonce Vinted

## Installer une seule fois

1. Mettre à jour et relancer l’application. Le pied de page doit afficher v0.2.6.
2. Préparer et valider une carte, puis ouvrir **Activer le remplissage Vinted** dans l’annonce.
3. Cliquer sur **Télécharger l’extension Chrome / Edge**, puis décompresser le ZIP.
4. Ouvrir `chrome://extensions` ou `edge://extensions` et activer le **mode développeur**.
5. Cliquer sur **Charger l’extension non empaquetée** et choisir le dossier `poke-scan-sell-vinted` contenant `manifest.json`.
6. Recharger l’application. Elle doit indiquer **Compagnon Vinted connecté**.

Le téléchargement associe le compagnon uniquement à l’adresse exacte de cette application. Si l’adresse du Codespace, le domaine ou le port change, télécharger à nouveau le compagnon depuis cette nouvelle adresse et recharger l’extension.

## Pour chaque carte

Cliquer sur **Remplir mon annonce sur Vinted**. Le compagnon ouvre un nouvel onglet et transfère le titre et la description tels que corrigés par le vendeur, le prix et les originaux dans l’ordre recto, verso, détails. Si Vinted demande une connexion, elle se fait sur Vinted ; les informations restent en attente dans ce navigateur pendant trente minutes.

La catégorie « Cartes Pokémon » ou « Cartes à collectionner » et l’état sont sélectionnés lorsqu’un libellé reconnu est disponible. Les états M/NM/EX sont rapprochés de « Très bon état », GD de « Bon état » et les états usés de « Satisfaisant » ou « État correct ». L’état détaillé de la carte reste dans la description. Aucun libellé ou identifiant inconnu n’est choisi automatiquement.

Un message dans Vinted indique le résultat et les champs à vérifier ou compléter. Contrôler les photos une fois leur chargement terminé, les attributs de la catégorie et le format de colis, puis cliquer sur **Publier**. Le compagnon ne soumet pas l’annonce et ne déclare pas automatiquement sa publication.

## Reprendre un transfert

- Un autre brouillon est présent : ses champs et ses photos sont conservés. Vider ce brouillon dans Vinted puis cliquer sur **Reprendre le remplissage** dans le message du compagnon.
- Un champ n’est pas reconnu ou une photo n’est pas acceptée : le message indique un transfert partiel. Compléter ce champ sur Vinted ou reprendre après avoir corrigé le problème.
- L’annonce a changé dans l’application : la valider et actualiser son texte avant de transférer à nouveau.
- Le transfert a expiré ou l’onglet a été fermé : relancer depuis l’application.
- Le compagnon n’est pas reconnu : recharger l’application et vérifier que le dossier a été chargé dans le même navigateur, pour cette même adresse.

Le ZIP des photos et les boutons copier restent disponibles pour un transfert manuel.

## Validation actuelle

Le texte, le prix, les photos et la file de transfert ont été testés sur des formulaires de contrôle, avec les APIs de l’extension simulées. Le chargement complet du compagnon dans Chrome et le formulaire réel d’un compte Vinted connecté restent à valider. Des changements de structure ou de champs sur Vinted peuvent demander une adaptation des repères du formulaire.
