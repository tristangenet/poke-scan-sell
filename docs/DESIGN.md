# Design de Poke Scan Sell — 0.5.0

L’application accompagne une carte physique jusqu’à son annonce. Son identité s’inspire du Pokédex et du classeur de cartes : des titres bleu nuit, une action de scan rouge, des références jaunes et les photos de l’exemplaire au premier plan.

## Repères visuels

| Usage                  | Couleur               |
| ---------------------- | --------------------- |
| Navigation et titres   | Bleu nuit `#18243e`   |
| Scan et validation     | Rouge `#d92e43`       |
| Illustration d’accueil | Jaune `#ffda69`       |
| Fond de travail        | Gris bleuté `#f5f6fb` |
| Texte secondaire       | `#647189`             |
| Annonce à préparer     | Ambre                 |
| Annonce prête          | Vert                  |
| Carte en vente         | Bleu                  |
| Carte vendue           | Violet                |

Les statuts comportent aussi du texte. La couleur seule ne porte aucune information nécessaire. Les titres utilisent Manrope et les textes DM Sans, avec une police système de repli. Les pictogrammes accompagnent des libellés explicites.

## Navigation

L’application s’ouvre directement sur le scan ou la vérification en cours. L’en-tête contient la marque et l’action Scanner. La barre latérale, la barre mobile et les liens Accueil, Mes cartes, Aide, Paramètres et Besoin d’aide ont été retirés. Le contenu utilise la largeur disponible et ne réserve plus de place pour ces menus. Les sauvegardes normales sont silencieuses ; les erreurs restent visibles.

Sur téléphone, les champs gardent une taille de texte de 16 pixels. Les deux étapes et le bouton principal restent accessibles sans débordement à 320 pixels.

## Le parcours de vente

1. **Photos** : deux emplacements illustrent les zones utiles sur le recto et le verso. Le compteur repose sur les faces effectivement ajoutées. La préparation reste désactivée si une face manque. Le recto seul est analysé ; le verso sert à l’annonce. La langue se choisit dans un volet optionnel, avec le français par défaut.
2. **Vérification** : identité, état et prix sont regroupés. La fiche permet de consulter les deux faces et d’agrandir une photo originale sans quitter le formulaire. Les annonces Vinted et Cardmarket s’ouvrent dans un autre onglet.
   Le bouton **Valider et remplir Vinted** prépare le texte et ouvre directement le formulaire Vinted. Il n’existe plus d’étape Annonce dans ce parcours. Les champs d’extension, de variante et le texte brut de l’OCR sont retirés. Si le compagnon manque, ses instructions s’ouvrent dans la vérification. Le texte et le ZIP restent dans des volets secondaires après la préparation.

## Reprise et collection

Les cartes locales sont conservées. L’ouverture reprend un brouillon et le bouton Scanner commence une autre carte. Les pages historiques de collection et de sauvegarde restent accessibles par lien direct, sans menu supplémentaire.

Les saisies restent automatiquement enregistrées. Le champ actif, les volets ouverts et la face consultée sont conservés lors d’un rafraîchissement du formulaire. Un changement de carte remet l’aperçu sur le recto.

## Accessibilité et mouvements

- Les actions principales et les commandes de consultation recto/verso ont une zone de clic d’au moins 44 pixels.
- Le focus au clavier reste visible ; les erreurs sont associées aux champs.
- Les étapes ont un libellé comprenant leur numéro et signalent l’étape courante.
- L’agrandissement utilise une boîte native : Échap et le bouton de fermeture la ferment, puis le focus revient au bouton d’ouverture.
- La préférence de réduction des mouvements désactive les transitions et animations.

## Visuels

Le logo et l’illustration d’accueil sont des SVG locaux. Les cartes stylisées de l’illustration sont décoratives. Elles n’ajoutent aucun exemplaire ni prix à la collection. Les captures de vérification utilisant des cartes de démonstration sont produites dans un navigateur de test isolé.

Les vues et composants sont dans `src/interface.js`, `src/quick-view.js` et `src/main.js` ; la présentation est regroupée dans `src/style.css`. Les données et le protocole du compagnon Vinted restent compatibles avec la version précédente.
