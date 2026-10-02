# Design de Poke Scan Sell — 0.4.0

L’application accompagne une carte physique jusqu’à son annonce. Son identité s’inspire du Pokédex et du classeur de cartes : une navigation bleu nuit, une action de scan rouge, des références jaunes et les photos de l’exemplaire au premier plan.

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

Sur ordinateur, la navigation reste dans la colonne de gauche : Accueil, Mes cartes, Scanner, Aide et Paramètres. La sauvegarde de la collection y est accessible.

Sur téléphone et tablette étroite, la navigation passe en bas de l’écran. Scanner occupe le centre avec un bouton rouge. L’application réserve de la place pour cette barre et la zone de sécurité du téléphone. Les champs gardent une taille de texte de 16 pixels sur mobile.

## Le parcours de vente

1. **Photos** : deux emplacements illustrent les zones utiles sur le recto et le verso. Le compteur repose sur les faces effectivement ajoutées. La préparation reste désactivée si une face manque.
2. **Vérification** : identité, état et prix sont regroupés. La fiche permet de consulter les deux faces et d’agrandir une photo originale sans quitter le formulaire. Les annonces Vinted et Cardmarket s’ouvrent dans un autre onglet.
3. **Annonce** : la photo, le titre, la description et le prix composent l’aperçu. Le bouton de transfert prend la couleur turquoise de cet espace. La correction du texte et les outils complémentaires restent accessibles dans les volets.

Les éditions et variantes restent facultatives. La validation de la carte conserve les règles existantes ; le design ne transforme pas une suggestion ou un transfert en publication confirmée.

## Reprise et collection

Les compteurs de l’accueil ouvrent les cartes concernées. Ils proviennent des données locales. Les cartes du classeur montrent leur photo, numéro, langue, statut de préparation et prix choisi. Les recherches, filtres et tris s’appliquent sans modifier les exemplaires.

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
