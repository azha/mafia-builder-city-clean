# Enquête B — juge d'ensemble r2 (08/10) — F2 F4 F7 F8

Lecture seule : aucun fichier du dépôt modifié, ni Unity ni typecheck. Scripts : `enquete-B-mesures/` (PIL seul, `python3 -I`),
sorties collées dans `enquete-B-mesures/sorties.txt`. Scripts du juge (`07`, `10`, `10b`) rejoués tels quels (copies `m_*_juge_copie.py`).
Table de clés : `mafia-lot-mots-1008/services/game-back/src/i18n/string_table.ts` (⚠ branche du lot : « servi ? » au SHA de la pile
non revérifié ici).

## Verdicts

| F | verdict | cause racine | correctif | effort |
|---|---|---|---|---|
| F2 | **PAS une seule donnée** : ASSUMÉ pour ㉛ (TD-823), ㉘ (n°1) et ㉝ (règle table 63, état light) ; ㉞ RÉTABLISSABLE (phrase servie, code absent) ; ⑮ = ligne d'un AUTRE écran (⑰) | par écran, voir §F2 | ㉞ : lire le roster + écrire la voix ; ⑮ : arbitrage f2 | M (㉞) |
| F4 | **CONFIRMÉ en plus petit** : arc 0,44-0,46 R contre 0,57-0,60 R (×0,75), pas « 52 → 93 % » ; épaisseur d'anneau RÉFUTÉE | `TopBarController.cs:444` `ArcRayonMedianFractionCanon = 0.45f` | 0.45 → 0.556 (15/27) + 2 tests | S |
| F7 | **CONFIRMÉ** | `DecisionDetailScreenController.cs:524-545` : tampon de la série 4 (`.tampon`) au lieu de `.plaque-laiton` de la série 6 | reposer `.plaque-laiton` | M |
| F8 | **CONFIRMÉ** | recette `TapisFeutre` jamais posée : `DecisionDetailScreenController.cs:340` n'appelle pas `Filets.Poser` ; dette `DecorDeScenePosePlayModeTests.cs:62` | un `Filets.Poser` + `SetAsLastSibling` | S |

Cause commune F7+F8 : ⑤ est construit à moitié sur la série 4, à moitié sur la série 6 ; les deux recettes de la série 6
(`PlaqueLaiton`, `TapisFeutre`) sont GÉNÉRÉES dans `DecorsDeSceneFilets.cs:64-69` mais restent « recettes en attente »
(`DecorDeScenePosePlayModeTests.cs:62`, dette datée). F2 et F4 : causes indépendantes.

---

## F2 — la voix en pied

### Mesure (la maquette dit quoi, par écran)
`m_f2_bas.py` (extrait de `ecrans-brennar-6.html`, texte des `.dit`/bande basse par cadre) : voix présente dans les cadres ㉚ (Lt. Kane/Rin/Hara),
㉘ (phrases sans nom), ㉞ cadres 43-45/47 (« Lt. Rin : … »), ㉛ (parl6, 25-30), ㉝ (demo6, 37-38, 41-42, 103), ㉓ (vitr6, bande Wexler).

### Une même donnée non servie (TD-823) ? NON. Écran par écran :

1. **㉛ E05 — ASSUMÉ (donnée non servie).** TD-823 (`mafia-lot-mots-1008/docs_int/tech_debt_inventory.md:865`) : « aucun champ servi ne dit QUEL lieutenant
   parle ni QUELLE phrase » ; grep de la table : aucune clé `loi.*` de réplique (« Pour l'instant il n'a rien dit… » : 0 hit). Décision f2 08/10
   « bande basse sans voix » (`Tools/juge-visuel/ecran_loi/dossier.md:91`). Capture = « parloir vide », « AUCUN cadre » (`journal.tsv` E05).
2. **㉝ E06 — ASSUMÉ par état, PAS par donnée.** Les phrases SONT servies avec `{nom}` (`string_table.ts:5527-5530`, `demolition.dit.*`) et le code les rend :
   `DemolitionScreenController.cs:513, 637, 850, 884` (`Dit` → `Locuteur(Roster, …)` :1240, nom du roster servi). L'écran capturé est l'état LIGHT
   (« Rien ne se gêne », planche E06) et `:513` `if (!leger) Dit(...)` (« table 63 : à la bande light, la réplique ne s'affiche pas ») ; aucun cadre
   demo6 n'est un état light. ⇒ rien à rétablir ; le dossier du juge ne le liste pas (§Assumés n° 1-15 : seuls ㉓ n° 13 et ㉘ n° 1).
3. **㉘ E04 — ASSUMÉ n° 1.** État « aucun relais » : `DistributionScreenController.cs:964` `MontrerLesZones(couriers:false, pied:false)` (la bande basse
   n'est rendue que si le geste d'achat est offert, `:868`) ; la voix nominale est codée `:701-758` (phrases servies : `string_table.ts:3628-3629`).
   Aucun cadre ne porte l'état ⇒ pas de phrase à y mettre.
4. **㉞ E02 — RÉTABLISSABLE, mais pas visible sur l'état capturé.** La phrase est servie :
   `carnet.bloc.n_ordres_on_peut_en_mettre_reste_de_plus_ou_partir_comme_ca` (`string_table.ts:4421`, `{n, plural…}`, `{reste}`, SANS `{nom}`).
   Le client ne la lit nulle part (grep `Assets` : 0 hit) ; `CarnetScreenController.cs:879` écrit « La VOIX du lieutenant n'est pas servie (TD-823) » :
   commentaire périmé/erroné — TD-823 nomme ㉛ ㉝ ㉓, pas ㉞, et la phrase de ㉞ est servie. Le locuteur manque (pas de `Locuteur(Roster)` dans le
   Carnet : aucun champ `Roster`). Capture = 0 ordre : la clé y lirait « 0 ordres. On peut en mettre 8… », sans cadre ⇒ rien à rendre sur E02 tel
   que capturé ; à ≥ 1 ordre (cadre 85 : « Lt. Rin : Cinq ordres… ») la voix manquerait.
   Correctif : lire `GET /v1/lieutenants` (même source que ㉝/㉚), poser sous `bandeBasse` (`:880`) « {Locuteur} : » + la clé avec `n = Brouillon.Compte`,
   `reste = 8 − n`, seulement si `n ≥ 1` (patron `DemolitionScreenController.Dit`, `:1253`). Ne PAS inventer de nom : `Locuteur` renvoie null sans roster.
5. **⑮ E09 — la ligne n'est pas de ⑮.** `Tools/juge-visuel/INDEX.md:20-21` : ⑮ ET ⑰ pointent les mêmes cadres 31-35 ; le cadre 31 est « CE QU'ILS SAVENT »
   (six précincts) et sa ligne de pied est le résumé des précincts EN CHASSE (`police.bloc.n_d_entre_eux_vous_chassent` + `aucun_ne_dort`,
   `string_table.ts:4585-4586`, bloc « commissariat ⑰ »). ⑮ (`InspectionScreenController`) ne lit que `world/districts` + files d'inspection :
   aucune posture de précinct (grep `precinct|hunting` dans `CitySim/Inspection` : 0). En outre ⑰ ne rend PAS non plus cette ligne
   (`PrecinctScreenController.cs` : 0 hit sur `chass`), clés servies mais non consommées. ⇒ sur ⑮, non rétablissable avec ses données ;
   arbitrage f2 : le pied du cadre 31 appartient à ⑰ (à poser là, clés servies, effort S), ou ⑮ lit aussi l'état des précincts.
6. **㉚ E03 — rendue** (`ChaineDApproScreenController.cs:565-580` : clé `appro.bloc.nestor_…` `{nom}` servie + nom du roster). ㉓ : n° 13.

### Verdict F2
Le F2 est vrai comme constat (1 voix sur 6) mais sa cause est TRIPLE : donnée non servie (㉛), état sans cadre (㉘, ㉝, ㉞ à 0 ordre), ligne d'un autre écran (⑮).
Seul ㉞ (≥ 1 ordre) est rétablissable avec des données déjà servies (+ ⑰, hors capture).

---

## F4 — le cadran du manomètre

### Mesure (le juge se trompe de grandeur, le défaut existe pourtant)
`m_07_juge_copie.py` rejoué : réf 92,7 % / jeu 52,3 % du rayon ; anneau 4,6 % / 2,7 %. Mais son prédicat `est_arc` (« rouge » : r>95, r>g+35, r>b+30)
accepte les pixels anti-crénelés BRUNS du bord de l'anneau d'or : le « 89,9 px » de la référence est le bord de l'anneau (97 − 9), pas l'arc.
Et l'épaisseur est lue sur la colonne `cx−60` (hors axe : 1/cos θ). Mesure refaite en TEINTE (HSV) avec ajustement de cercle à centre libre
(`m_f4_profil.py`, `m_f4_ajust.py`, Python pur) :

```
                    arc médian / R ext. anneau   arc ext. / R ext.   épaisseur anneau (% du diamètre)
maquette E03-c48          0,603 (0,57 du centre anneau)    0,674              3,6 %
jeu E03 2400              0,444 (0,46 du centre anneau)    0,496              4,2 %
```
Profil radial (teal/rouge, plusieurs angles) : réf arc 54-64 px sur R 97 ; jeu 40-51 px sur R 92 ; anneau d'or 6 px et 6 px.
⇒ ANNEAU : RÉFUTÉ (jeu pas plus mince). ARC : CONFIRMÉ à ×0,74-0,77 (pas ×0,56).

### Cause racine
Source maquette (séries 4 et 6 identiques, `ecrans-brennar-6.html:197-199`) : `.mano` 54 px (R = 27), `svg` 40×26 à l'échelle 1, arc `A15 15` ⇒ rayon médian
**15/27 = 0,556 R**, trait 3 ⇒ 0,111 R (jeu : 0,103). La source HUD d'août (`Tools/hud-topbar-reference-source.html:41-44`, 44×28, viewBox 60×40, r 26, médaillon 64) donne
26·0,7/32 = 0,569 R. **Aucune source du dépôt ne donne 0,45.**
`TopBarController.cs:444` `ArcRayonMedianFractionCanon = 0.45f` (→ `ArcDiameterPx` :459-460) vient du commit `ede63949` (06/09, « ① F5 ») : un « canon du juge r3 de ① »
(0,45 R) pour corriger un arc mesuré à 0,59-0,632 R « +43 % » — c'est-à-dire EXACTEMENT la valeur de la maquette. La « correction » a éloigné le jeu du canon réel.
Pas une régression récente : une constante de septembre qui n'a jamais été rapprochée de la maquette.

### ManometreOracle / gardes — à dire
`ManometreProportionsPlayModeTests.cs:207` `RayonArcCanon = 0.45f` (tolérance 0,05 ⇒ 0,40-0,50) FIXE ce rayon : le changer rougit cette garde (catégorie
`HUDv31`) ; `TopBarDoctrineV31PlayModeTests.cs:1290` recopie `5f / 35.6f` (= 5 / (0,45·68 + 5)). `ManometreOraclePlayModeTests` (gelé, hors filtre) ne cite pas 0,45
(grep : aucun hit). Ce sont des gardes à METTRE À JOUR avec la source, pas à contourner : leur propre « canon » est la cause.

### Correctif proposé (diff minimal)
```
- Assets/Scripts/Shell/TopBarController.cs:444
-     private const float ArcRayonMedianFractionCanon = 0.45f;
+     private const float ArcRayonMedianFractionCanon = 15f / 27f;   // `.mano` 54 px, arc A15 (ecrans-brennar-6.html:197-199)
- Assets/Tests/PlayMode/ManometreProportionsPlayModeTests.cs:207
-     const float RayonArcCanon = 0.45f;
+     const float RayonArcCanon = 15f / 27f;
- Assets/Tests/PlayMode/TopBarDoctrineV31PlayModeTests.cs:1290
-     return diametrePx * (5f / 35.6f);
+     return diametrePx * (5f / (15f / 27f * 68f + 5f));    // 5 / 42,8
```
`ArcDiameterPx` passe de 35,6 à ≈ 42,8 ; l'aiguille/pivot (`PivotRayonFractionCanon`) ne bougent pas. Vérifier à l'image que l'arc ne mord pas « Froid » (le texte est sous le pivot).
Décision f2 requise : le « canon 0,45 » est un ruling antérieur. Mesure qui tranche après correction : rejouer `m_f4_ajust.py` sur la nouvelle planche (cible 0,56-0,60).

---

## F7 — le geste principal de ⑤

### Mesure et confrontation
`m_10_juge_copie.py` : maquette E11-c04 remplissage (173,138,60) encre (72,56,19) ; jeu (216,202,167) / (147,64,42). Série 6 `.plaque-laiton`
(`ecrans-brennar-6.html:263-264`) : `linear-gradient(180deg,#e8c87a,#b08d3e 55%,#8a6a22)`, bord 1 px `#6b4a12`, rayon 6, encre `#3a2a0a` (Georgia 700 12,5 px, `.22em`), `small` 8 px
`#3a2a0acc` ⇒ la valeur médiane lue (173,138,60) est le palier `#b08d3e`. La série 4 (`ecrans-brennar-4.html:269-272`) porte `.tampon` : plaque crème, encre `#93402c`, bord rouge, rayon 11 =
EXACTEMENT ce que le jeu rend. Le cadre 4/5 de la série 6 ne contient plus de `.tampon` : seulement `.plaque-laiton` (+ `.ligne-or` au lieu de `.filet`).
Ce n'est PAS un écart assumé (dossier n° 11-12 : carte fabriquée, geste « passer » retiré). Pas de contradiction avec DESIGN §4 / INVENTAIRE ligne ⑤ (qui citent `plaque-laiton`).

### Cause racine
`DecisionDetailScreenController.cs:524-545` : `tf.color = PlaqueDuTampon` (= `PiedDEcran.PlaqueCreme`, `PiedDEcran.cs:51`, « troisième grammaire ⑤ »), `Cerner(… Rouge …)`, `Lib` en `Rouge` :
décision f2 07/10 (« DECISION-F4-F5-2026-10-07.md ») prise sur la référence de la série 4 (zinc) ; la série 6 a depuis donné `plaque-laiton`. Le composant « ④ » n'est pas partagé : ④ pose
`HighestLeverageCardController.Geste` (`:566-613`, pilule `.g.or`, jetons `ficheCtaOr*` #e9c56b → #c99a37, encre #241804) — une autre recette dorée ; ⑤ n'en a jamais pris aucune (il ne réutilise rien de ④).
La recette `PlaqueLaiton` est générée (`DecorsDeSceneFilets.cs:64-65`) et jamais posée (dette `DecorDeScenePosePlayModeTests.cs:62`).

### Correctif proposé
```
// DecisionDetailScreenController.cs ~:524-545 (le Tampon)
- tf.sprite = ProceduralUI.RoundedRectMask((int)Px(11f)); tf.type = Sliced; tf.color = PlaqueDuTampon;
- Cerner(tampon.transform,"BordTampon",…Rouge…); Cerner(tampon.transform,"FiletTampon",…);
+ tf.sprite = ProceduralUI.RoundedRectMask((int)Px(6f)); tf.type = Sliced; tf.color = #8a6a22; + Mask
+ enfant "Degrade" : ProceduralUI.DegradeLineaire(180°, #e8c87a 0 % → #b08d3e 55 % → #8a6a22 100 %)
+ Filets.Poser(tampon, DecorsDeScene.Filets.DecisionDetail.PlaqueLaiton);       // 1 px #6b4a12, rayon 6
- Lib/Sous : Rouge
+ Lib/Sous : #3a2a0a (Sous à 0,8), Lib en hudSerifFont Bold 12,5 css, characterSpacing 22
// tests : PiedDEcranPlayModeTests.P5 (216,202,167 / « tf.color = PlaqueDuTampon; ») à réécrire sur la plaque laiton ; retirer "PlaqueLaiton" de RecettesEnAttente["⑤"].
// PiedDEcran.PlaqueCreme reste pour ⑮ DÉPOSER (retirer « ⑤ » de sa docstring :50).
```
Contraste à mesurer : encre #3a2a0a sur #b08d3e (cible ≥ 4,5:1). Effort M (primitives présentes ; réécriture de P5).

---

## F8 — le liseré d'or du tapis de feutre

### Mesure
`m_10b_juge_copie.py` rejoué : maquette c04 « or sur 28/28 colonnes, 8 px (176,141,62) » ; jeu 2400 1/28, 1920 0/28. Source : `ecrans-brennar-6.html:240`
`.tapis-feutre{… border-top:3px solid #b08d3e; border-radius:26px 26px 0 0 …}`.

### Cause racine
Le décor ⑤ est une famille C (DESIGN §4 ligne ⑤ : « cerne — », `Tools/decor-de-scene-2026-10-07/DESIGN.md:154`) : `DecorsDeScene.cs:65-72` `SpecSupport(couches, rayon 26/26/0/0)` sans `cerne`.
Le trait existe comme recette GÉNÉRÉE `DecorsDeScene.Filets.DecisionDetail.TapisFeutre` (`DecorsDeSceneFilets.cs:68-69` : `Cotes.Haut, 3 css, #b08d3e`), consommable par
`Filets.Poser(RectTransform, SpecFilet[])`, mais AUCUN code ne l'appelle (grep `TapisFeutre` : déclaration + `DecorDeScenePosePlayModeTests.cs:62` seulement) : la garde D6b la tolère
via la dette datée `RecettesEnAttente["⑤"]`. `PileDeDecision` (`:714-790`) ne la supprime pas : elle ne fait que poser `support.offsetMax` (`:786-792`) ; le trait suivrait.
⚠ Piège : `Filets.Poser` met son conteneur en PREMIER enfant (`Filets.cs:52-53` `SetAsFirstSibling`) ; or les couches du support (radial opaque) sont ses enfants
(`DecorDeScene.cs:370-372` `PoserCouches`) ⇒ le trait serait posé SOUS le feutre, invisible. Il faut le remonter en dernier.

### Correctif proposé
```
// DecisionDetailScreenController.cs, juste après :340  DecorPose decor = DecorDeScene.Poser(transform, DecorsDeScene.DecisionDetail);
+ Filets.Poser(decor.Support, DecorsDeScene.Filets.DecisionDetail.TapisFeutre).transform.SetAsLastSibling();   // au-dessus du radial ; le Mask du support (26/26/0/0) arrondit les coins
// DecorDeScenePosePlayModeTests.cs:62 : retirer "TapisFeutre" de RecettesEnAttente["⑤"] (D6b rougit sinon : « branchée, à RETIRER »)
```
Garde d'effet à ajouter (pas de garde de paramètre) : sur planche, ≥ 20/28 colonnes de bord en (176,141,62) sur 3 css × échelle (rejouer `10b`). Effort S.
