# ② Six mots de fiction pour les profils de district — `glass | lattice | spine | stack | tidewater | verge`

Atelier / DA, 2026-09-22. Branche `da/2026-09-22`. Le client écrit le résolveur ; ce fichier livre la table et la décision.

## Où le code brut atteint le joueur (mesuré)

- `Assets/Scripts/CityMap/DistrictCellView.cs:55` — `{DisplayName} · {dto.profile} · {block_count} blocs` (forme non compacte).
- `Assets/Scripts/CityMap/CityMapController.cs:1052` — `DetailRow("Profile", cell.Model.profile)` (la variable, invisible à `chaines-joueur.py`).
- Aucun résolveur : `DistrictTintResolver` (teinte) et `DistrictBackgroundSlots` (fond) consomment le code, aucun ne rend un mot.

## La maquette qui commande

- **③ cadre 24 « La Carte — approcher : chez vous »**, légende « Chaque quartier a son tissu » : *le port aux rues biaises et aux lumières teal (Tidewater), la colonne vertébrale et son avenue qui luit (Spine), le damier serré (Lattice), les tours de verre aux lumières blanches (Glass), la lisière (Verge), les cheminées aux lumières orange (Stack)*. C'est le seul endroit du corpus où les six profils sont dits en clair — et ils y sont dits par leur TISSU, pas par leur fonction.
- **③ cadre 23 « La Carte — un quartier touché »**, la bande du quartier : `Les Bassins | rive nord · le port · 37 blocs`. La maquette pose déjà la FORME de la ligne que `DistrictCellView:55` dessine : nom · mot de tissu · blocs — minuscules, avec l'article.
- Canon back (`gdd/15_glossary.md:987`) : Tidewater (docks), Spine (résidentiel dense), Lattice (mixte commercial-résidentiel), Stack (industriel léger), Glass (finance & gouvernement), Verge (banlieue en déclin). Le mot de fiction doit rester compatible avec cette fonction ; il ne la nomme pas.
- Vocabulaire servi (`atelier3d-mafia/fiction/vocabulaire-servi.json`, back `032bb944`) : les 18 noms de district. **Contrainte de collision** : trois noms de district sont déjà le mot de la légende — `La Colonne` (Spine-A), `Le Verre` (Glass-1), `La Lisière` (Verge-A). Un mot de profil identique au nom du quartier rendrait « La Lisière · la lisière · 40 blocs ». Le mot de tissu doit donc être choisi *à côté* du nom, jamais dessus.

## La table

| code servi | FR — en ligne (forme du cadre 23) | FR — valeur de ligne | EN | ce que la ville peinte montre (cadre 22/24) | pourquoi ce mot |
|---|---|---|---|---|---|
| `tidewater` | le port | Port | the docks | rues biaises, jetées, deux bateaux, lumières teal (teinte +18°, `DistrictTintResolver`) | **le mot du cadre 23, tel quel**. Les trois districts s'appellent Les Bassins, Quai-Nord, Sarnes : « le port » les coiffe sans les répéter. |
| `spine` | l'avenue | Avenue | the avenue | l'avenue d'or qui luit (`.spine-av`, #f2c96b sRGB dans la maquette) le long de la colonne | la légende dit « la colonne vertébrale et son avenue qui luit » ; « la colonne » est pris (Spine-A = La Colonne), l'avenue est ce que l'œil voit la nuit. Résidentiel dense : on habite le long de l'avenue. |
| `lattice` | le damier | Damier | the grid | le pavage serré, teinte neutre (0°, le nominal du canon) | « le damier serré », mot à mot. Le Treillis (Lattice-A) est un autre mot pour la même trame — pas une collision. |
| `stack` | les cheminées | Cheminées | the smokestacks | fenêtres orange, sol le plus sombre (`.q.stack .sol` #1e2229), teinte −6° | « les cheminées aux lumières orange », mot à mot. Industriel léger : Les Entrepôts, Dépôt-Est. `Stack` EST la cheminée d'usine en anglais — l'EN rend le nom au lieu de le traduire. |
| `glass` | les tours | Tours | the towers | les `.tour` blanches à halo (#dfe9f5), teinte −20° vers le bleu | « les tours de verre aux lumières blanches » ; « le verre » est pris (Glass-1 = Le Verre). Finance & gouvernement : Place des Comptes, La Chancellerie — ce sont des tours. |
| `verge` | les faubourgs | Faubourgs | the outskirts | la rive sud, tout en bas de la carte, saturation −0,04 (délavé), sol #20273a | la légende dit « la lisière », mais **La Lisière est Verge-A** : le mot est pris par un quartier. « Les faubourgs » dit la même chose (le bord, la banlieue en déclin du canon) avec le mot de l'époque, et coiffe La Lisière, Les Friches, Pont-Gris sans en répéter un. |

## Décisions

1. **Forme** : minuscules avec l'article en ligne (« Les Bassins · le port · 37 blocs »), exactement la bande du cadre 23. La capitale de la colonne « valeur de ligne » sert au panneau de détail (`CityMapController:1052`), où la valeur est seule dans sa case. Les capitales du lettrage de la carte restent un STYLE (`FontStyles.UpperCase`, `DistrictCellView` le dit déjà) — jamais une réécriture de la donnée.
2. **Le libellé de la ligne** `"Profile"` (`CityMapController:1052`) devient **« Tissu »** — le mot de la légende du cadre 24 (« Chaque quartier a son tissu »). Repris dans ④ avec les autres libellés anglais de cet écran.
3. **Espace** : ce sont des chaînes, aucune couleur ni taille n'est livrée ici. Les hex cités sont ceux de la CSS de la maquette (sRGB), donnés pour identifier le tissu, pas pour être recopiés.
4. **Repli** : un profil inconnu (7ᵉ valeur) se montre tel quel, comme `DistrictTintResolver.UnknownProfileFallback` rend le neutre sans lever — un mot inventé pour une valeur inconnue masquerait le cran neuf.
5. **Non traduits** : les 18 noms de district restent des noms propres (`brennar_city.md:34`), la table ci-dessus ne les touche pas.
