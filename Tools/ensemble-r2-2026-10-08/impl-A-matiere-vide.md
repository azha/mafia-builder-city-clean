# impl-A — matière et vide (juge d'ensemble r2 : F1, F3, F5, F6)

Spec : `enquete-A.md`. Unity NON lancé (interdit) : seul le typecheck hors porte a tourné. Aucun rendu n'est établi par ce document.

## Fichiers modifiés (les miens)
- `Assets/Scripts/ShellContracts/DecorPose.cs` — `HauteurSupportCss`, `Bande` (calculée), `FixerLaHauteurDuSupport(float?)`, `LacherLeCadre()`, `Reserve` (interne).
- `Assets/Scripts/ShellContracts/ReserveDeBande.cs` — lit `pose.Bande` (et s'enregistre auprès de la pose).
- `Assets/Scripts/ShellContracts/DecorDeScene.cs` — `AncrerSousLaBande` passe `internal` (une ligne).
- `Assets/Scripts/ShellContracts/DecorsDeScene.cs` — `Liege()` : deux couches `Points` (grain) ; constante `HauteurSupportInspectionVideCss = 400`.
- `Assets/Scripts/CitySim/Inspection/InspectionScreenController.cs` — garde le `DecorPose`, borne le support à l'état vide.
- `Assets/Scripts/Operational/Distribution/DistributionScreenController.cs` — plaque sans fond + `CadreB`, `SuivreLeCadre`/`LacherLeCadre`, ligne 1 de la fiche, `ProposeAchatTermine`, `Liege` (couleur) supprimée.
- Tests : `DecorDeScenePlayModeTests.cs` (D4f adapté, D4o, D4p neufs), `InspectionScreenPlayModeTests.cs` (garde de pixels F1), `DistributionScreenPlayModeTests.cs` (F6 inversé, F3/F5 neuf), `PlanchesParEcranCapturePlayModeTests.cs` (harnais), `DecorDeScenePosePlayModeTests.cs` (une ligne : `"CadreB"` retiré de la dette ㉘).

## F1 — forme choisie
Champ neuf `DecorPose.HauteurSupportCss` (float?, null = fraction du catalogue). `DecorPose.Bande` = fraction du catalogue, ou `1 − hauteurCss·Echelle/hauteurRéelleDuDécor` si l'état borne le support ; lu par `ReserveDeBande` (la pile commence sous le haut du liège) et par l'ancrage de `Decor/Support` (recalculé à chaque changement de rect, jamais figé au montage). ⑮ pose `400` quand `EtatVide`, `null` sinon : l'état peuplé (cadre 32, 18 lignes) garde la fraction 0,10 ; les 25 autres écrans n'appellent rien (comportement identique : `Bande == Spec.Bande`).
Reste de l'écran : la SCÈNE (district 0,45 + voile) au-dessus du liège, comme les cadres 33/34 (scène 32 %, corkboard `min-height:400px`). Aucun texte.
Chiffres attendus (arithmétique sur les mesures du juge, dock = 61 px CSS lu sur l'image de 2400) : trou = 400 − 8 − 202 − 61 ≈ 129 px CSS ⇒ 24,2 % à 533 px CSS de haut (1920), 19,3 % à 667 (2400) ; maquette : 145 px CSS. **Le 1920 est à 0,8 point sous le seuil de 25 % : la marge est mince.**

## F3
- ⑮ (et ⑰, même `Liege()`) : `.grain` de `ecrans-brennar-6.html:476` posé en deux `Points` au-dessus du cercle (6 px / 0,8→1,1 `#00000022` ; 9 px / 0,6→0,9 `#ffffff10` à 3,3). Unity compose en linéaire : l'opacité CSS n'est pas recopiée, `DecorDeScene.Ajuster` la traduit sur le cercle opaque dessous (fond connu). Le noir à 13 % ne peut pas être rendu en entier (encre négative) : p99 attendu ≈ 2/3 de la maquette.
- ㉘ cadre : plaque (`Panneau`, `PanneauVide`) SANS fond (l'aplat `#7a5230` recouvrait la planche) + `Filets.Poser(…, Filets.Distribution.CadreB)`. `"CadreB"` retiré de `RecettesEnAttente["㉘"]`. Couleur `Liege` du contrôleur supprimée (plus utilisée).
- ㉘ « grain perdu » : **RÉFUTÉ** (confirmé par `enquete-A.md`). Le « 73 → 1 » de `05b` compare deux grandeurs : à la maquette le profil traverse le `cadre-b` (le pas de 73 est le bord de 5 px), au jeu la ligne 1500 est lue sur le `Support` nu par pas de 4 px quand le grain est en points de 8 px tous les 32 px. Sur patchs 2D : maquette p99 15, jeu p99 10 (2400) / 7 (1920) sur le `Support` nu. Le grain est là ; ce qui manquait est le cadre (corrigé) et, DANS la plaque, le grain masqué par l'aplat (corrigé : plaque sans fond).

## F5
- (a) `RendreAucunRelais` : `decorPose.SuivreLeCadre(vide)` ; `RendreCorkboard` et `RendreEtatIndisponible` : `decorPose.LacherLeCadre()` (neuf dans `DecorPose` ; garde un drapeau `suit` distinct de `suivi != null` car le cadre suivi est détruit au re-rendu ; détruit le `SuiviDuCadre` et ré-ancre sous la bande). Plaque conservée à 120 px CSS (la cote « 224 » reste le choix de f2). La zone sous la plaque devient la scène sombre : l'instrument `04` la comptera encore comme « trou » faute de contraste — à juger à l'œil.
- (b) `DistributionScreenController.ProposeAchatTermine` (faux de l'entrée dans `Charger()` jusqu'à sa fin, geste compris ; vrai aussi après un rendu de test). Harnais `PlanchesParEcranCapturePlayModeTests.Charger` : `ProposeAchatTermine` dans `finis` et `tousRequis` ; pour un écran qui l'expose, `DerniereErreur` n'est plus un verdict mais un diagnostic ; ㉘ sans relais n'attend ni courriers ni projection ; le journal dit « aucun relais · AVEC le geste d'achat » ou « SANS geste d'achat ».

## F6
Ligne 1 de la fiche = `Libelle.De("distribution","bloc","Aucune route tendue pour l’instant.")`. Clé `distribution.bloc.aucune_route_tendue_pour_l_instant` : servie EN (`string_table.ts:730`) et FR (`:3611`) dans `/home/erutheone/project/mafia-lot-mots-1008/services/game-back/src/i18n/string_table.ts`, déjà employée par ce contrôleur (`:539`, état sans route : jamais simultanée avec l'état vide). Assertion de `EcranDistributionF2…` inversée (différent du titre ET égal à la clé).

## Gardes d'effet
- `DecorDeScenePlayModeTests.D4o` : scène noire, support borné à 400 px CSS à 960 / 1200 / 800 de haut (aucun pixel de liège au-dessus ; contrôle positif sans la hauteur : le point est du liège ; `ReserveDeBande` suit).
- `DecorDeScenePlayModeTests.D4p` : p99 du passe-haut du liège nu > 3/255, contrôle positif : le même liège sans ses couches `Points` rend < 1,5.
- `InspectionScreenPlayModeTests.Vide_LeLiegeEstBorne_…` : l'écran RÉEL (compte frais, vrai back) dans un banc à 540×960 et 540×1200 (1 px CSS = 1,8 px) : support = 400 px CSS, part de liège nu sous la fiche jusqu'au dock ≤ 25 %, sous la fiche c'est du liège (≥ 90 %), au-dessus du support c'est la scène (≤ 10 %) ; contrôle positif : `FixerLaHauteurDuSupport(null)` rend l'ancien défaut (support ~90 %, trou > 25 %).
- `DistributionScreenPlayModeTests.EcranDistributionF5_…` : support = rect de la plaque dans l'état vide, plaque sans `Image` et avec `Filets`, retour pleine page à l'état nominal.

## Deviations
1. Seuil de grain 3/255 (spec : 4) : l'attendu est une extrapolation (p99 ≈ 7 sur le canal vert de la maquette ramené à 2/3 puis atténué par le filtrage bilinéaire des tuiles) ; 3 reste discriminant (contrôle < 1,5, maquette 11).
2. `ProposeAchatTermine` enveloppe `Charger()` (pas seulement `ProposerAchatDeRelais`) : le verdict « erreur » partait AVANT `RendreAucunRelais`, un drapeau posé dans `ProposerAchatDeRelais` seul laissait la fenêtre ouverte.
3. Garde F1 : le dock du banc est publié par `ShellChrome.PublierInsets` (61 px CSS) ; la part est lue sur la géométrie (bas de la fiche) et confirmée par des pixels (liège dessous, scène dessus), pas par l'instrument `04` du juge.
4. D4f : le coin bas-droit est lu à la MÉDIANE d'un carré de 9×9 (un point de grain peut tomber sur le pixel unique), le cercle est la dernière couche (`Couches.Length − 1`) au lieu de `0`.
5. Pas de « vignette » (`inset 0 0 60px #00000055`), pas de `Filets.Inspection.Corkboard` (bord haut 6 px) : classe C / dette déclarée, non demandés.

## Doutes que seule une capture lèvera
- Les gradients linéaires du `Support` de ㉘ (158°) sont des sprites à l'aspect de la boîte pleine page ; étirés sur une plaque de 120 px CSS leur angle apparent change (subtil : 9a774b → 654a2c).
- ㉘ vide : la plaque kraft de 120 px CSS sur la scène sombre — « cartel » ou « grand carré brun » ? (parti pris d'état sans cadre, assumé n° 1 ; à valider par f2).
- ⑮ vide : le bord haut du liège borné est une coupe nue sur la scène (la recette `Corkboard`, 6 px `#3a2a12` + ombre, reste en dette) ; la marge de 0,8 point à 1920.
- Contraste de l'étiquette crème sur le kraft du `Support` (133,101,62) au lieu de (122,83,49).
- Le cercle de liège ⑮ est recalculé sur le rect de 400 px CSS : son foyer (30 %, 20 %) est donc plus bas qu'avant en valeur absolue.
