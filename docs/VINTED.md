# Remplir une annonce Vinted

## Installer une seule fois

1. Mettre à jour et relancer l’application. Le pied de page doit afficher v0.2.8.
2. Préparer et valider une carte, puis ouvrir **Activer le remplissage Vinted** dans l’annonce.
3. Cliquer sur **Télécharger l’extension Chrome / Edge**, puis décompresser le ZIP.
4. Ouvrir `chrome://extensions` ou `edge://extensions` et activer le **mode développeur**.
5. Cliquer sur **Charger l’extension non empaquetée** et choisir le dossier `poke-scan-sell-vinted` contenant `manifest.json`.
6. Recharger l’application. Elle doit indiquer **Compagnon Vinted connecté**.

Le téléchargement associe le compagnon uniquement à l’adresse exacte de cette application. Si l’adresse du Codespace, le domaine ou le port change, télécharger à nouveau le compagnon depuis cette nouvelle adresse et recharger l’extension.

## Mettre à jour une extension déjà installée

Mettre à jour l’application avec `git pull` ne change pas les fichiers de l’extension chargée dans Chrome / Edge.

1. Télécharger à nouveau le ZIP depuis l’application v0.2.8 et le décompresser.
2. Remplacer les fichiers du dossier `poke-scan-sell-vinted` déjà chargé par ceux du nouveau ZIP.
3. Dans `chrome://extensions` ou `edge://extensions`, cliquer sur la flèche circulaire **Recharger** de Poke Scan Sell — Vinted. La version doit être **0.2.8**.
4. Recharger les onglets de l’application et de Vinted, puis relancer le transfert depuis l’application.

L’application indique désormais la version connectée et propose la mise à jour si le compagnon est trop ancien. Le panneau dans Vinted affiche aussi sa version.

## Pour chaque carte

Cliquer sur **Remplir mon annonce sur Vinted**. Le compagnon ouvre un nouvel onglet et transfère le titre et la description tels que corrigés par le vendeur, le prix et les originaux dans l’ordre recto, verso, détails. Si Vinted demande une connexion, elle se fait sur Vinted ; les informations restent en attente dans ce navigateur pendant trente minutes.

Le remplissage se fait dès que chaque champ est reconnu. Les photos peuvent être envoyées alors que les champs de texte sont encore désactivés ou absents. Les identifiants, noms entre crochets, libellés associés ou de conteneur et certains placeholders de prix sont pris en compte ; deux contrôles aussi plausibles restent signalés comme ambigus. Le champ de recherche du site est exclu. Le message indique les champs remplis et ceux encore attendus, puis un résultat partiel après le délai de vingt secondes pour les sections manquantes. Chaque échange avec l’extension a aussi un délai maximal, trente secondes pour une photo.

Le prix utilise le point décimal par défaut, ou la virgule indiquée par le champ. Pour un champ numérique natif, la valeur utilise toujours un point. Après les événements de saisie et de validation, le compagnon compare le montant exact et vérifie les contraintes natives ainsi que `aria-invalid`. Si le premier format est refusé, l’autre est essayé. Aucun arrondi à l’euro ni suppression des centimes n’est accepté. En cas d’échec, la valeur antérieure est restaurée et le résultat reste partiel. Une modification faite par le vendeur dans le champ interrompt ces nouvelles tentatives et est conservée.

La catégorie « Cartes Pokémon » ou « Cartes à collectionner » et l’état sont sélectionnés lorsqu’un libellé reconnu est disponible. Les états M/NM/EX sont rapprochés de « Très bon état », GD de « Bon état » et les états usés de « Satisfaisant » ou « État correct ». L’état détaillé de la carte reste dans la description. Aucun libellé ou identifiant inconnu n’est choisi automatiquement.

Un message dans Vinted indique le résultat et les champs à vérifier ou compléter. Contrôler les photos une fois leur chargement terminé, les attributs de la catégorie et le format de colis, puis cliquer sur **Publier**. Le compagnon ne soumet pas l’annonce et ne déclare pas automatiquement sa publication.

## Reprendre un transfert

- Un autre brouillon est présent : ses champs et ses photos sont conservés. Vider ce brouillon dans Vinted puis cliquer sur **Reprendre le remplissage** dans le message du compagnon.
- Un champ n’est pas reconnu ou une photo n’est pas acceptée : le message indique un transfert partiel. Compléter ce champ sur Vinted ou reprendre après avoir corrigé le problème.
- L’annonce a changé dans l’application : la valider et actualiser son texte avant de transférer à nouveau.
- Le transfert a expiré ou l’onglet a été fermé : relancer depuis l’application.
- Le compagnon n’est pas reconnu : recharger l’application et vérifier que le dossier a été chargé dans le même navigateur, pour cette même adresse.
- Un champ manque encore avec le compagnon 0.2.8 : cliquer sur **Copier le diagnostic** dans le panneau Vinted. Le rapport contient la version, les champs reconnus, les identifiants techniques des contrôles et leurs indicateurs de validation, sans valeurs de l’annonce, photos ni informations de connexion. Il aide à adapter les repères. Si la copie est refusée, une zone de texte permet de copier ce rapport manuellement.

Le ZIP des photos et les boutons copier restent disponibles pour un transfert manuel.

## Validation actuelle

Le texte, le prix, les photos et la file de transfert ont été testés sur des formulaires de contrôle, avec les APIs de l’extension simulées. Le blocage de la version 0.2.6 a été reproduit avec des champs désactivés jusqu’à l’ajout des photos : aucun texte ni photo n’était transféré. Le même formulaire reçoit les trois champs et les deux originaux avec 0.2.7. Ce test ne confirme pas la structure exacte du formulaire utilisateur. Le chargement complet du compagnon dans Chrome et le formulaire réel d’un compte Vinted connecté restent à valider. Des changements de structure ou de champs sur Vinted peuvent demander une adaptation des repères du formulaire.

Le retour utilisateur du 2 octobre indique que le transfert fonctionne mais que le prix reste à remplir. La structure de ce champ précis n’a pas été fournie. Les tests 0.2.8 reproduisent et corrigent un format à point recevant une virgule, un champ transformant `12,25` en `12` et un conteneur de prix non reconnu. Ils vérifient les formats à point et virgule, un champ numérique, une reprise de format, le refus d’un montant incorrect et la conservation des saisies existantes ou faites pendant le transfert. Ces cas sont contrôlés ; le remplissage du prix sur le compte utilisateur reste à confirmer.
