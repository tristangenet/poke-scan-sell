# Design de Poke Scan Sell — 0.6.0

## Le bureau du collectionneur

L’application prend l’identité d’un studio de cartes Pokémon : une base ivoire, un bandeau Pokédex bleu nuit, des actions rouge Poké Ball et des bords holographiques. La marque reste Poke Scan Sell. Les cartes de l’utilisateur occupent le premier plan, avec un dessin de cartes et d’orbites créé en SVG pour l’en-tête.

| Usage                           | Couleur                            |
| ------------------------------- | ---------------------------------- |
| Bureau et fonds                 | Ivoire `#f2f4ed`, papier `#fffefa` |
| Pokédex, prix et fiche de carte | Bleu nuit `#122b33`, `#16323b`     |
| Action principale               | Rouge `#d72843`                    |
| Reflets et face sélectionnée    | Menthe `#c7f3dc`                   |
| Détail holographique            | Rose, bleu pâle et doré            |
| Texte secondaire sur papier     | `#5d7378`                          |
| Bord des champs                 | `#78938f`                          |

Manrope porte les titres et DM Sans les textes, avec repli système. Les petits repères utilisent une police monospace. Les statuts et les étapes ont un texte lisible ; la couleur seule ne porte pas une information nécessaire.

## Composition des écrans

L’en-tête contient la marque et Scanner. Le bandeau présente les deux étapes sous forme de segments, une illustration de cartes holographiques et le statut réel du brouillon. L’illustration est masquée sur les petits écrans pour réserver la place au travail.

**Photos.** Sur ordinateur, les deux emplacements se trouvent dans une surface papier, avec un panneau de préparation à droite : langue optionnelle, disponibilité des photos et action de lecture. La fiche de résumé a été retirée de cet écran, où les deux photos sont déjà affichées. Sur téléphone, les deux faces restent côte à côte et la préparation vient en dessous. Les photos sont affichées entières avec `object-fit: contain` ; aucun effet holographique ne s’applique à leurs pixels.

**Vérification.** Identité et état partagent la même rangée sur les écrans larges et s’empilent sur téléphone. La fiche de carte est sombre, avec une bordure holographique, le recto/verso et l’agrandissement. Elle est placée à droite sur ordinateur, au-dessus du formulaire sur téléphone. Le prix occupe un panneau bleu nuit avec un champ papier et deux liens de comparaison. L’action rouge conduit directement à Vinted.

Le parcours conserve ses deux étapes. Aucun menu Accueil, Mes cartes, Aide ou Paramètres n’a été réintroduit. La langue reste française par défaut, le verso sert à l’annonce et l’OCR ne lit que le recto. Les textes générés, les prix et les filtres Cardmarket/Vinted conservent leurs règles.

## Interaction et accessibilité

- Les zones tactiles principales mesurent au moins 44 pixels ; les champs ont une taille de texte de 16 pixels sur téléphone.
- Les bordures des champs, les contrastes du texte et le focus restent perceptibles sur papier et sur fond sombre. Le bouton principal atteint un contraste de 4,91 pour le texte blanc ; le texte secondaire de référence sur papier atteint 4,97.
- Les commandes de face et le dialogue d’agrandissement gardent leurs libellés. Échap ferme le dialogue et le focus revient au déclencheur.
- Les étapes signalent leur position et les erreurs restent associées aux champs.
- La préférence de réduction des mouvements désactive les transitions du thème. Les illustrations ne sont pas animées en continu.
- Les saisies, la sélection, les volets ouverts et la face consultée restent conservés lors des rafraîchissements.

## Ressources et captures

`src/studio.css` définit le thème après la base `src/style.css`. Les compositions sont dans `src/interface.js` et `src/quick-view.js`. `public/scan-orbit.svg` est une illustration vectorielle locale, décorative et sans donnée de carte. Le logo Poké Ball existant reste utilisé. Aucune illustration externe ni nouvelle dépendance n’est ajoutée.

Les captures [ordinateur](screenshots/studio-desktop.jpg) et [mobile](screenshots/studio-mobile.jpg) montrent des photos synthétiques provenant des fichiers de test HEIC, dans une session isolée. Elles ne présentent ni de fausses cartes officielles comme produits réels, ni de prix de marché constatés. Les originaux des cartes de l’utilisateur restent conservés sans retouche.
