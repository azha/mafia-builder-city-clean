# impl F3 — la jauge de TENSION de ⑭ (08/10, juge visuel r1, F3 BLOQUANT)

Référence qui fait foi : série 6, `ecrans-brennar-6.html` `.cadran-fer` (l.289-292), SVG viewBox 168×100 des cadres 14-19 (l.784-804). État rendu : calme (cadre 18).

## Fichiers
- `Assets/Scripts/CoreLoops/Compression/CompressionScreenController.cs` : `ConstruireJauge` (en tête de la pile, après `ReserverLaBande`), `RendreJauge` (à chaque `Rendre`), `AngleDeLAiguilleCss`, `LegendeDeTension` (publiques, pures), `RendrePourTest(EtatData, BoardData)` (patron Forensic).
- `Assets/Scripts/ShellContracts/ProceduralUI.cs` : AJOUT de `BoiteArrondieRadiale` (coins haut/bas, dégradé radial elliptique CSS). Les primitives existantes ne couvraient pas la forme : `RoundedRectMask` est tranché en 9 (rayon 100 sur 118 de haut s'écrase), `DegradeRadial` est rectangulaire.
- `Assets/Tests/PlayMode/JaugeDeTensionPlayModeTests.cs` (NEUF) : J1 existence calme+vide, structure, cotes ; J1b légendes ; J2a angles en dur ; J2b rotation rendue + cran inconnu ; J3 pixels (bord laiton > 300 px, milieu de chaque arc contre le mélange sRGB du navigateur ±18, aiguille, moyeu, encre de l'onglet) ; J4 aucun texte écrasé ; J5 la primitive.

## Mesures (CSS `rotate()` des cadres, horaire depuis la verticale)
calm −60 (cadre 18, l.800) · mounting +12 (cadre 14, l.784) · crushing et compression_active +64 (cadres 15 l.788 et 19 l.804 ; cadre 16 l.792 dit +60 sur « un autre apparaît »). Arcs : froid 180°→120,26°, or 120,26°→59,74°, chaud 59,74°→0° (atan2 de `M49 32` et `M119 32` depuis (84,92)). Échelle SVG 1,02 ; pivot à (104,0 ; 105,8) px CSS du bord du cadran (le SVG est décalé de 4 px à droite dans la maquette : `left:14` pour une boîte de padding de 192 et un SVG de 172, fidèle).

## Ce que la maquette série 6 retire / garde (RIEN n'a été retiré)
- Le titre « LA SEMAINE » centré : ABSENT des cadres 14-19. Gardé dans le code.
- La ligne de pression « TENSION CALME · AUCUNE SEMAINE » : ABSENTE ; son rôle est tenu par la légende de la lampe (« CALME — VOS AFFAIRES RESPIRENT »). Gardée dans le code : elle double maintenant la légende.
- À décider : retirer les deux. Estimation à 1080×1920 : la pile (bande 35 % + jauge 147 + plaque ~110 + titre/pression ~50 + espacements) dépasse d'environ 35 px CSS le bas utile ; les retirer fait tenir. À 2400 ça tient.

## Deviations
1. `crushing` = +64° comme `compression_active` : la maquette n'a aucun cadre `crushing` seul (les trois cadres chauds sont en semaine ouverte). Valeur dominante reprise.
2. Pas d'ombre portée `0 10px 24px`, pas d'ombre interne `inset 0 0 24px #000c` (vignette du fond), pas d'ombre des vis ni lueur de la lampe allumée, pas de coins 2 px sur l'onglet, pas de transition `.7s` de l'aiguille : cosmétique, aucune primitive posée pour elles.
3. Fond de chaque arc résolu à son point MILIEU (le dégradé varie le long de l'arc) ; teinte déplacée pour le mélange linéaire (`CouleurPourMelangeLineaire`), opacité CSS gardée.
4. `#1a1d21` → jeton `autonomyBlockBg` (2,2/255) et `#2b2f35` → `surfaceRaised` (3,7), `#15181c` → `surfaceCard` (1,7), `#b08d3e` → `hudHairlineGold`, `#7fd4d9` → `hudGaugeArcCold`, `#d9ab4e` → `hudMoneyUnderlineGold`, `#eae0c8` → `hudCreme` (garde TD-612). Littéraux gardés (aucun jeton à < 4) : `#3a3f47 #4a3a12 #6b4a12 #d9c08a #e0402a #ff8a70 #e8c87a #2b1d0e #b3b8bf #6a6f76 #7a1f12`.
5. Un état absent (back muet) se lit « au calme », comme `RendrePlaque` ; un cran inconnu retire l'aiguille.
6. Clés i18n à demander au back (repli sur le littéral tant que non servies) : `semaine.bloc.tension`, `semaine.bloc.vos_affaires_respirent`.

## Évidence
`python3 Tools/typecheck-hors-porte.py --controle --frais ShellContracts --frais CoreLoops --frais Operational CityMap.PlayMode.Tests.csproj Assets/Tests/PlayMode/JaugeDeTensionPlayModeTests.cs` → EXIT=0, 0 erreur ; contrôle positif : OUI. (`--frais Operational` ajouté : sans lui, 6 erreurs PRÉEXISTANTES de ForensicScreenPlayModeTests — DLL Operational datée.) `--tout` : 17 assemblies EXIT=0.
Aucun test exécuté (Unity interdit) : les seuils de J3 (±18, > 300, > 10) sont posés sans mesure.

## Doutes que seule une capture lève
Fidélité du dégradé et du bord du cadran à 4 résolutions ; justesse du mélange des arcs (J3 ±18) ; largeur de la légende (30 caractères, 8,5 px, .22em) sur 300 px ; débord vertical à 1920 ; centre de l'aiguille sur le moyeu.
