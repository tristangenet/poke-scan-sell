# Utiliser Poke Scan Sell — 0.6.0

## 1. Photos

L’application ouvre directement votre carte en cours, ou un nouveau scan s’il n’y a pas de brouillon. Cliquez sur **Scanner** pour commencer une autre carte.

Ajoutez le recto et le verso dans les deux emplacements, par sélection de fichier ou glisser-déposer. Les deux faces sont côte à côte, aussi sur téléphone. Sur ordinateur, le panneau Préparer la carte regroupe la langue et le lancement du scan à droite. Seul le recto sert à lire le nom et le numéro. Le verso est une photo de l’annonce : il n’est soumis ni à l’OCR, ni à une analyse IA, ni au contrôle des pixels. Les deux faces restent consultables pour choisir vous-même l’état de la carte.

Le français est sélectionné par défaut. Ouvrez **Changer la langue (français par défaut)** pour choisir l’anglais si nécessaire. Cliquez sur **Préparer ma carte** pour lire le recto et accéder à la vérification. Vous pouvez aussi choisir la saisie manuelle.

Formats : **HEIC / HEIF, JPEG, PNG et WebP**, six photos maximum et 10 Mo par fichier. Les HEIC sont convertis automatiquement en JPEG sur cet appareil, avec conservation de la résolution. Cette conversion reste nécessaire pour afficher et transmettre la photo du verso. Un fichier illisible est refusé sans remplacer la photo précédente.

## 2. Vérification, puis Vinted

Contrôlez le nom et le numéro lus, choisissez l’état et votre prix. En cas de lecture partielle, complétez uniquement ce qui manque. Aucun champ d’extension, de variante ni texte brut de l’OCR n’est affiché.

Utilisez **Recto** et **Verso** dans la fiche pour consulter les deux faces ; touchez la photo pour l’agrandir. Échap ou la croix ferme l’aperçu. Les liens **Comparer les annonces Vinted** et **Comparer les annonces Cardmarket** ouvrent les recherches dans un autre onglet. Vinted recherche uniquement le nom et le numéro complet, sans extension ni variante. Cardmarket recherche le nom et le numéro de collection, avec les paramètres de pays du vendeur France et de langue de carte française ou anglaise selon votre choix à l’étape Photos. Une tendance Cardmarket disponible peut être choisie comme point de départ ; elle ne garantit pas le prix selon l’état.

Cliquez sur **Valider et remplir Vinted**. Ce bouton confirme vos informations, prépare le texte et ouvre directement le formulaire Vinted par le compagnon. L’application reste sur la vérification, sans écran Annonce intermédiaire.

Le titre contient uniquement Pokémon, le nom et le numéro complet, par exemple **Pokémon Magirêve 212/193**. La description garde ses trois lignes : carte, langue et état. Un prix entier est saisi comme `3`, sans `3.00` ; les centimes sont conservés.

Si le compagnon est absent ou trop ancien, ses instructions s’ouvrent sur place. Le compagnon reste en **0.2.10** : s’il est déjà installé pour cette adresse, aucune réinstallation n’est nécessaire. Après installation, rechargez l’application et validez à nouveau. Voir [le guide Vinted](VINTED.md).

Sur Vinted, vérifiez le résultat et les éventuels champs restants, puis publiez. Pour la carte suivante, revenez dans l’application et cliquez sur **Scanner**. Le texte personnalisé et le ZIP restent disponibles dans des volets secondaires de la vérification, une fois l’annonce préparée.

## Reprendre et conserver ses données

La saisie est automatiquement sauvegardée après une courte pause et à la sortie d’un champ, sans mention d’enregistrement permanente. Le rechargement reprend la carte et l’étape en cours. Les erreurs de sauvegarde restent signalées.

Les anciennes cartes et sauvegardes sont conservées. Un ancien lien vers une annonce revient à sa vérification. Pour les opérations de maintenance, les pages historiques restent accessibles directement : `#/cards` pour la collection et `#/settings` pour exporter ou restaurer une sauvegarde. Ces pages ne figurent plus dans le menu. Une restauration ajoute les cartes sans écraser les existantes, dans la limite de 50 Mo, 500 cartes et six photos par carte.

Les données restent dans ce navigateur, sur cet appareil. Pour changer de navigateur ou d’appareil, exportez puis restaurez une sauvegarde. Le remplissage automatique Vinted nécessite Chrome ou Edge sur ordinateur ; sur téléphone, les photos, la vérification et les exports restent utilisables.
