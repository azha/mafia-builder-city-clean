# Implémentation F12 + F13 — ⑤ « la décision du jour » (E11), carte portrait et feutre qui épouse le contenu

Tête client : `67f689fc` + working tree (non commité). Unity NON lancé (un gate tourne) ; typecheck hors porte seulement.

## Fichiers
- `Assets/Scripts/Shell/DecisionDetailScreenController.cs` : refonte de `Construire` (pile dans une fenêtre défilante), colonnes PORTÉE/URGENCE, cachet de cire, jeton moleté, titre ; classe `PileDeDecision` (fin de fichier).
- `Assets/Scripts/ShellContracts/ProceduralUI.cs` : AJOUTS `DisqueAFoyer`, `DisqueMolete`, `NombreDeTirets`, `OmbreDeDisque` (+ cuiseur privé `CuireUnDisque`).
- `Assets/Tests/PlayMode/DecisionDetailCartePlayModeTests.cs` (+ `.meta`) : 11 tests, catégorie `DecisionCarte`.
- `Assets/Tests/PlayMode/DecorDeScenePosePlayModeTests.cs` : `Bandes` retirée de `RecettesEnAttente["⑤"]` (désormais posée par `Filets.Poser`, D6b l'exigeait).
- `Assets/Tests/PlayMode/DecorDeScenePlayModeTests.cs` (D4j) : échelle du banc = celle du shell (`scaleFactor = W/1280`) + une image de plus ; l'assertion « premier touché = Capteur » est inchangée.
- `DecorDeScene.cs`, `ReserveDeBande.cs`, `DecorsDeScene.cs` : NON touchés (le correctif n'exige pas `SupportEpouseLeContenu`, voir ci-dessous).

## Forme choisie — défilement et support
`Fenetre` (RectMask2D + `ListeDefilante.Equiper`, de la barre du shell au bas de l'écran) > `Defile` (contenu du ScrollRect, haut = max(pile, fenêtre)) > `Pile` (VLG ancré EN BAS de `Defile`, haut = sa hauteur PRÉFÉRÉE). `PileDeDecision` est un `ILayoutSelfController` posé sur `Pile` : il pose les deux hauteurs dans la passe de mise en page (comme un ContentSizeFitter) et le haut du support du décor = haut de la pile quand elle tient (`retrait + fenêtre − pile`), haut de la fenêtre quand elle déborde. Ancres du support 0..1, `offsetMax.y = −haut` : plus aucune fraction (ni `Bande`, ni `AncrerSousLaBande`) pour ⑤. `TopInsetPx`/`BottomInsetPx` relus à chaque image (le shell les publie après le montage).
Pourquoi pas le champ `SupportEpouseLeContenu` : il aurait touché 3 fichiers partagés ; le décor expose déjà `DecorPose.Support` (ancrage libre, comme `SuivreLeCadre` pour ㊲). Le catalogue garde `Bande = 0.34` (valeur mesurée, utilisée seulement à la pose initiale et par D4).
Le Graphic de réception de la fenêtre n'est raycast-actif que si le contenu déborde (sinon `Decor/Capteur` avale le clic).

## Maquette (série 6, cadre 5) suivie
Carte 176 CSS de large, plancher 212 (portrait 0,83), table centrée gap 14, colonne jeton 64 ; `.bandes` : deux colonnes + ressort (space-between), filet haut = `Filets.Poser(DecorsDeScene.Filets.DecisionDetail.Bandes, matière de la carte)` ; titre gras, centré, boîte élastique (`flexibleHeight=1`, marges 24/8) ; cachet `right:-10;top:-14`, 36, `circle at 40% 35%`, anneau 3 `#8a2a18`, ♦ or 13, +12° Unity ; jeton 42, `circle at 40% 32%`, tranche 3 laiton, bordure 2 `dashed #fff6`, ombre `0 6 10 #000c`.
Espace colorimétrique : dégradés/anneau/tirets cuits en pixels OPAQUES (mélange sRGB fait à la cuisson : aucune opacité à convertir) ; seules les ombres sont translucides (`AlphaVoileSurFondQuelconque(noir, 0,8)`, le fond n'est pas unique).

## Déviations (quoi / pourquoi / ce que la spec disait)
1. Moletage par primitive neuve et non par `Filets` : la recette `Piece` (tireté, 50 %) passe par `RoundedRectDashedOutline` dont un côté égal à deux rayons n'a plus de section répétée : anneau PLEIN. `Piece`/`Piece_2` restent en dette D6b.
2. Kicker « CE QUI PÈSE LE PLUS AUJOURD'HUI » (série 4, absent de la série 6) : 7,5 → 6,5 CSS, centré, passe à la ligne ; à 7,5 il faisait ≈172 CSS dans 152 de carte. Non demandé, nécessaire au portrait.
3. Pas de titre doré « CE QUI PÈSE LE PLUS CE SOIR » hors carte, pas de `.grave`, pas de bordure dorée `TapisFeutre` (3 px) : hors du constat, restent à traiter (F4/A).
4. Pip 7 CSS et libellés 7,5 CSS gardés (maquette : 8 et 6) : pas de re-mesure des tailles dans ce lot.
5. Jeton toujours doré : la variante `.pris` de la maquette (dégradé éteint) n'existe pas ici avant ce lot, non ajoutée.
6. Pile ancrée en haut au repos si elle déborde : à 1920 la pile peut dépasser la fenêtre ; elle s'ouvre sur la carte, le tampon (CTA) est atteignable au défilement.
7. `CoreLoops` doit être passée en `--frais` pour que `JaugeDeTensionPlayModeTests` compile (DLL périmée, sans lien avec ce lot).

## Doutes que seule une capture lèvera
- Position/rotation exacte du cachet (+12° Unity, centre à −8/−4 CSS) et lisibilité du ♦ (police `primaryFont` ; si le glyphe manque il sort en carré).
- Dash : période 10 CSS, part 0,6 (Chromium 2 px : 6/4) ; bord dégradé de la pièce vu en border-box (CSS : padding-box répété).
- Hauteur réelle de la pile à 1080×1920 / 2400 (estimée ≈1 700 u pour une fenêtre ≈2 075) : tient-elle sans défilement ? Le test banc le suppose à 540×960 et 540×1200.
- Ombres : halo cachet/jeton un peu plus dur qu'en CSS (cosinus, alpha unique).
