# Enquête A — juge d'ensemble du décor r1 (08/10) — F1, F2+F10, F3, F5+F6+F7

Lecture seule : aucun fichier du dépôt modifié, ni Unity ni typecheck. Mesures rejouables : scripts du juge
(`.../ensemble-decor/r1-2026-10-08/mesures/*.py`, `python3 -I`) et mes quatre scripts (`/tmp/masques.py`, `/tmp/gouttiere.py`,
`/tmp/entete.py`, `/tmp/contraste.py` ; copies dans le scratchpad de session). Toutes les images lues sont à 1080 px de large
(captures 1080×2400, références 1080×2102 ; v4-29 = 900×1752, utilisée seulement pour une PART).

## Tableau

| F | verdict | cause racine | correctif | effort |
|---|---|---|---|---|
| F1 | CONFIRMÉ | `Assets/Scripts/Shell/ExceptionQueuePanelController.cs:322` `raison.maxVisibleLines = 2` | retirer le plafond (la 3ᵉ ligne est DÉJÀ réservée) | S |
| F10 | CONFIRMÉ | `Assets/Scripts/ShellContracts/EnteteDEcran.cs:58` `SetAsFirstSibling()` passe le bandeau AVANT `Decor` | `SetSiblingIndex(index de Decor + 1)` | S |
| F2 | CONFIRMÉ (le symptôme), mais pas un « état d'erreur » | phrases : F10 ; kraft nu : `DistributionScreenController.cs:959-971` | F10 + un panneau de liège borné dans l'état vide | M |
| F3 | CONFIRMÉ | `CoreLoops/Compression/CompressionScreenController.cs:349-399` : aucune jauge n'est construite | construire la jauge (ArcCuit + aiguille + onglet) | L |
| F5 | SCINDÉ : E04 RÉFUTÉ, E09 RÉFUTÉ en matière, E08+E11 CONFIRMÉ | E08/E11 : `DecorsDeScene.cs:65-72` et `:94-99` (support de la série 6 sur deux écrans dont la référence est la série 4) | `Support = null` pour ⑤ et ⑭ (ruling f2) | M |
| F6 | PARTIEL | feuille : état vide (pas de défaut de code) ; bande 10 % = cadre 31 | rien côté feuille ; bande à arbitrer | — / L |
| F7 | CONFIRMÉ | `CitySim/Inspection/InspectionScreenController.cs:430-438, 475` : texte clair posé sur le kraft | poser le dépôt sur une fiche crème (cadre 33), encre sombre | M |

---

## F10 — bandeau de titre vide (E03, E05) ou absent (E04) : CONFIRMÉ

**Cause (code).** `DecorDeScene.Poser` pose `Decor` en PREMIER enfant de la racine (`DecorDeScene.cs:318`, contrat « Decor = premier
enfant »). Puis les trois contrôleurs appellent `EnteteDEcran.Construire(racine.transform, …)` APRÈS le décor
(`ChaineDApproScreenController.cs:715→729`, `LoiScreenController.cs:677→696`, `DistributionScreenController.cs:1073→1083`), et
`Construire` fait `plaque.transform.SetAsFirstSibling()` (`EnteteDEcran.cs:58`). Le bandeau devient donc le frère n° 0, AVANT `Decor` ;
uGUI dessine les frères dans l'ordre : `Decor/Voile` puis `Decor/Support` (opaque, plein cadre sous la bande) sont dessinés PAR-DESSUS
le bandeau. Le bandeau est mis en page (il prend sa hauteur : c'est le « bande vide » du juge) mais n'est jamais vu. Le gabarit
`EnteteDEcran` (commit 22e6e63b) est antérieur au décor : `SetAsFirstSibling` y était juste jusqu'à ce que `Decor` devienne premier enfant.
La liste est exacte : ces trois écrans sont les SEULS appelants de `Construire` (grep), et ce sont exactement les trois du finding.
`EnteteDEcran.Habiller` (㉞ Carnet) est un enfant de l'enseigne : non touché ; `ConflitScreenController.cs:1270` pose son fond dans `contenuGo` : non touché.

**Mesures.** `/tmp/entete.py` (captures 1080×2400, bande y 504..760 = début du Support à 21 %) :
```
E04 plaque Entete attendue #20180f=(32,24,15) dans y504..760 : (0, 69120)   <- 0 pixel de plaque
E04 temoin positif : bande basse (20,26,33) y1860..2000      : (32940, 37800)
E04 kraft dans y504..760                                      : (68082, 69120)   <- 98,5 % kraft, la plaque est dessous
E03 / E05 / E04 pixels clairs (encre de titre) y504..760      : 0 / 0 / 0   (sur 69 120)
```
Cohérence de hauteur : E03, la fiche commence à y=794 ; Support à y=504 ; 290 px = 80 px CSS ≈ bandeau (≈ 65) + padding du corps (14).
Le bandeau est donc bien présent dans la mise en page.

**Correctif proposé (diff minimal).**
```diff
--- a/Assets/Scripts/ShellContracts/EnteteDEcran.cs
@@ public static (TextMeshProUGUI titre, TextMeshProUGUI sousTitre) Construire(...)
-            plaque.transform.SetAsFirstSibling();
+            // JAMAIS avant `Decor` : `DecorDeScene.Poser` le pose premier enfant (contrat §5), et un frère placé avant lui est dessiné SOUS son Support opaque.
+            Transform decor = racine.Find("Decor");
+            plaque.transform.SetSiblingIndex(decor != null ? decor.GetSiblingIndex() + 1 : 0);
```
(`Decor` est `ignoreLayout` : l'ordre de mise en page est inchangé, le bandeau reste le premier élément de la pile.)
**Garde à ajouter** (structurelle, avant toute garde de valeur) : dans `DecorDeScenePosePlayModeTests` ou `EnteteDEcranPlayModeTests`,
après la construction COMPLÈTE de chacun des écrans qui posent un décor, `racine.GetChild(0).name == "Decor"` ; et un compte de pixels :
encre de titre > 0 dans la bande d'en-tête (une garde de paramètres n'est pas une garde d'effet).

## F2 — E04 « état d'erreur non décoré, trou de 87 % » : CONFIRMÉ (symptôme), l'étiquette « erreur » est fausse

**L'état n'est pas une erreur.** Le journal écrit `DerniereErreur=«aucun distribution_hub…»`, mais l'écran capturé porte la bande basse
« Coûte de l'argent… / ACHETER UN RELAIS » : c'est `RendreGesteAchatDeRelais` (`DistributionScreenController.cs:866`), donc la branche
« aucun relais » (`Charger`, l. 291-300 : « ÉTAT VIDE FAUX… ce n'est pas une panne »). `DerniereErreur` n'y est que le diagnostic, non affiché.
Les deux phrases qui manquent sont donc le TITRE « Pas encore de relais. » et le SOUS-TITRE `SousTitreDuVide` (`:959-968`), qui vivent dans
`EnteteDEcran` : **leur absence est F10, pas un défaut propre à E04**. Les trois lignes d'info (LE CHEMIN…) et le bloc Lt. Rin n'existent que
pour une route, ce qu'un compte neuf n'a pas : absences légitimes (« rien d'inventé »).

**Ce qui reste après F10.** `RendreAucunRelais` (`:959`) fait `ViderEnfants(corkboardRoot/couriersRoot/piedRoot)` et `MontrerLesZones(false,false)` :
plus aucune zone ne recouvre le `Support`, qui est kraft opaque plein cadre. Estimation (non rendue) : bandeau ≈ 250 px, bande basse y≈1840 ⇒ ≈ 1 080 px
de kraft nu sur un corps de ≈ 1 670 px (≈ 65 %), contre 86,8 % aujourd'hui. Un compte neuf est un état LÉGITIME, mais « un état vide qui ne se lit pas comme
voulu reste un défaut » : un tapis de liège sans rien ne dit pas « pas encore de relais ». Aucune maquette de cet état (dossier, assumé n° 1).

**Correctif proposé (esquisse).** Après F10 : poser dans l'état vide un panneau de liège BORNÉ (inséré par le padding de 16 CSS px du corps, donc lu comme un
objet et non comme un fond) portant une étiquette crème. Dans `RendreAucunRelais` et `RendreEtatIndisponible`, après `ViderEnfants` :
```diff
+            GameObject panneau = NouveauUI("PanneauVide", corkboardRoot);
+            AjouterFond(panneau, Liege);
+            AddLayoutElement(panneau, minHeight: Px(120f), flexibleHeight: 1);
+            // + une étiquette crème « D'OÙ ÇA PART — aucun relais » (même grammaire que ConstruireEtiquette), centrée
+            corkboardRoot.GetComponent<LayoutElement>().flexibleHeight = 1;   // sinon le panneau garde 120 CSS px ; à remettre à 0 dans RendreCorkboard
```
À valider par f2/atelier (c'est du contenu d'écran sans cadre). Effort M.

## F1 — A01, raison coupée en pleine phrase : CONFIRMÉ

**Cause.** `ExceptionQueuePanelController.cs:318-324` : la raison est un `TextMeshProUGUI` avec `enableWordWrapping = true`, `maxVisibleLines = 2`,
`overflowMode = Ellipsis`. La raison longue fait 3 lignes (journal : « sur 3 ligne(s) ») : TMP en masque la 3ᵉ, SANS dessiner « … » (le mode Ellipsis ne
s'applique pas à `maxVisibleLines` : sur la capture la 2ᵉ ligne finit « …il me faut » sans points ni guillemet fermant), alors que la mise en page, elle,
réserve les 3 lignes (la hauteur voulue de la ligne est mesurée par `HauteurVoulueDeLaLigne` / préféré de la rangée) : d'où ces 34 px vides.
La maquette (cadre 5) montre une raison de 2 lignes, ce qui est probablement l'origine du plafond.

**Mesure** (`python3 -I mesures/14-a01-raison-coupee.py`, rejoué) :
```
VARIANTE COURTE  : ligne 3 (citation) y 1896..1925 + ligne 4 y 1932..1960  -> bloc 65 px
VARIANTE LONGUE  : ligne 3 (citation) y 1879..1943  (h=65), puis « Plusieurs attendent » y 1988..2008 ; vide restant 82 px
```
Même hauteur de citation (65 px) pour 2 et 3 lignes de texte, et +34 px entre citation et « Plusieurs » : la ligne réservée est vide.

**Correctif.**
```diff
--- a/Assets/Scripts/Shell/ExceptionQueuePanelController.cs
@@ AddLigneDeLAccueil
                 raison.enableWordWrapping = true;
-                raison.maxVisibleLines = 2;
                 raison.overflowMode = TextOverflowModes.Ellipsis;
```
La hauteur voulue de la rangée (déjà mesurée à 3 lignes, `tient` au journal : 459,6 u pour 423,6 u disponibles, la bande `BandeFileHaute` s'en accommode)
est consommée par la 3ᵉ ligne. Si l'on veut garder un plafond (texte serveur non borné), le mettre à 3 ET tronquer soi-même
(`Tronquer(texte, n)` + « … » avant la mise en page), jamais `maxVisibleLines` seul. Test : garde A01 « dernier glyphe de la raison rendu » ou compte de lignes de
`TMP_Text.textInfo.lineCount` == lignes voulues. Effort S.

## F3 — E08, jauge de TENSION absente : CONFIRMÉ

**Cause.** `CompressionScreenController.Construire` (`:349-399`) ne construit que : titre « LA SEMAINE » centré, ligne de pression, jetons de budget, plaque
(« Où en est la tension »), lignes, vide. Aucune jauge, onglet, aiguille ni légende. Le commentaire `:354` dit « CLIENT-3 y construira le manomètre » et il n'a jamais été
construit ; `grep -ril "jauge|cadran"` ne trouve aucun composant de jauge de tension. La jauge est dans TOUS les cadres du ⑭ (série 4 cadres 25-30 : demi-cadran or, 3 arcs, aiguille,
onglet « TENSION », légende « Calme — vos affaires respirent » ; série 6 cadres 14-19 : `.cadran-fer`, `.etiquette-fer` « TENSION »), donc l'état vide n'a pas d'excuse. Les mots existent
(`MotsDesEnumeres.Tension` : Calme / Montante / Écrasante / sous compression ; légende « vos affaires respirent » = cadre 29).
Le titre « LA SEMAINE » et la ligne « TENSION CALME · AUCUNE SEMAINE » n'existent dans aucun cadre de la série 4 (le juge note le titre centré).

**Mesure** (juge, `mesures/13-e08-jauge-e10-panneau.py`) : part d'or du corps 5,41 % (v4-29) / 5,93 % (cadre 25) contre 1,12 % en jeu ; lecture directe des PNG : la jauge est le premier
objet du cadre (y≈210-650 sur 1752).

**Correctif (esquisse).** Un `ConstruireJauge(Transform parent)` sous le chrome, en tête de la pile :
`ProceduralUI.ArcCuit(d, ép, couleur, début°, fin°)` (`ProceduralUI.cs:102` ; 0° à DROITE, sens trigonométrique, 90° en haut) ×3 (froid 180→120°, or 120→60°, chaud 60→0°) sur un
`RoundedRect` or de demi-cadran, aiguille = `Image` pivotée selon `stress_bucket` (calm ≈ −50°, mounting ≈ +10°, crushing ≈ +50°, compression_active ≈ +80° : à mesurer sur v4-25..30
avec `mesurer-maquette.py`), moyeu `RadialDisc`, onglet « TENSION » (plaque or), légende sous la jauge = `MotsDesEnumeres.Dire(Tension, bucket)` + phrase du cadre. Retirer alors
le titre « LA SEMAINE » centré et la ligne de pression (absents des cadres). Effort L (primitives existantes, géométrie et mesures à faire). A/B (élément héros absent) : à traiter fidèlement.

## F5 — matière de fond à fond perdu : SCINDÉ

Cause racine commune du MÉCANISME : le `Support` est toujours posé plein largeur, opaque, ancré en bas (`DecorDeScene.AncrerSousLaBande`, `DecorDeScene.cs:664-670` : x 0..1) et
`SpecSupport` n'a aucun champ de retrait. Mais ce mécanisme n'est un DÉFAUT que sur deux des quatre écrans.

### E04 ㉘ kraft — RÉFUTÉ (matière et gouttière)
Le kraft EST la matière de ㉘ (`.lieg6 .planche`, catalogue `DecorsDeScene.cs:117-124`) : présente dans les cinq cadres de série 6 (54-58), et ㉘ n'a pas de maquette en série 4.
```
$ python3 -I /tmp/masques.py        (masque kraft du juge)
ecran_distribution/reference (nominal)  1080x2102  KRAFT 26,2 %
cadre-54..58                                        KRAFT 26,2 / 26,5 / 25,0 / 26,3 / 26,4 %
E04_Distribution 1080x2400                          KRAFT 57,4 %   (état vide : rien ne recouvre le Support, voir F2)
$ python3 -I mesures/11-gouttiere-kraft.py          (script du juge, sa propre sortie)
REFERENCE (cadre 54)  y=1000  kraft de x=3 a x=1076 (largeur 1074 px)  px[2]=(58,67,86)
CAPTURE 2400          y=1000  kraft de x=0 a x=1079 (largeur 1080 px)
```
La « gouttière 42/43 px » du rapport est FAUSSE : la propre sortie du juge donne 3/3 px à la référence (le liseré 3 px du cadre de l'appareil, `px[2]=(58,67,86)`, présent sur toutes les
références) contre 0/0 au jeu. Profil de la ligne y=1000 de la référence : liège (116,89,54) x=3..16, anneau de bois sombre (74,55,34) x=17..42, liège intérieur x=43..1039, anneau,
liège x=1064..1076 : les 42 px sont l'îlot INTÉRIEUR d'un cadre de bois, pas une marge. Le liège va à fond perdu aussi dans la maquette. Reste le cadre de bois (ombre interne / liseré de
`planche`) : consigné au design §9, classe C.

### E09 ⑮ kraft — RÉFUTÉ comme matière étrangère
Le liège EST le fond de ⑮ (`.corkboard`, cadres 31, 33, 34, 35 de série 6 ; ⑮ n'a pas de série 4). Le juge a comparé au cadre 32 (listing, 1,3 % de kraft), que le design range
explicitement en « support DIFFÉRENT, consigné » (§9).
```
cadre 32 (nominal, listing)  KRAFT  1,3 %
cadre 31 (liège)             KRAFT 58,4 %   cadre 33 (signalement) 49,7 %   cadre 34 45,7 %
E09_Inspections 2400         KRAFT 62,1 %
```
Première matière claire sous le chrome, x=8 : cadre 31 y=244 (11,6 %) ; cadre 32 y=401 (19,1 %) ; cadres 33/34 y=678 (32,3 %) ; jeu y=240 (10,0 %).
La bande du jeu (10 %) = cadre 31 ; les trois états de l'écran ont trois bandes (11,6 / 19,1 / 32,3 %) et le catalogue n'en a qu'une (`Bande` constante) : voir F6.

### E08 ⑭ voile à points et E11 ⑤ feutrine — CONFIRMÉ
Ce sont deux écrans à DEUX séries de maquette, et le catalogue a pris la série 6 alors que la référence ratifiée / du dossier est la série 4 :
* ⑤ : `DecisionDetailScreenController.cs:11-12` « Référence RATIFIÉE par l'user (2026-08-26) : série 4, `ecrans-brennar-4.html` cadres 4-8 » ;
  `INDEX.md` : cadres série 4 ET série 6. Le catalogue (`DecorsDeScene.cs:65-72`) pose le `.tapis-feutre` de la série 6 (`ecrans-brennar-6.html:240`, radial vert, coins 26/26/0/0).
* ⑭ : `CompressionScreenController.cs:37` et la doc de `MotsDesEnumeres` : série 4 cadres 25-30 ; catalogue (`DecorsDeScene.cs:94-99`) = `.tole` de la série 6 (`ecrans-brennar-6.html:286`).
```
decision-du-jour/reference (série 4, cadre 4)  FEUTR 0,0 %     E11_DecisionDetail 2400  FEUTR 35,8 %
compression/reference (série 4, cadre 25)      VOILE 1,2 %     E08_Lasemaine 2400       VOILE 54,4 %
compression/v4-29 (900x1752)                   VOILE 1,8 %
```
Dans la série 4 la scène de ville traverse tout le cadre, sous des plaques de verre sombre ; pas de tôle ni de tapis. La tôle de la série 6 est fidèle À SA série
(`.panneau{margin-top:auto}` pleine largeur, bordure haute or 4 px) mais, vide faute de jauge (F3) et de boutons, elle se lit comme une dalle.
Le jeu n'est donc pas faux contre la série 6 : il est faux contre la référence du dossier ET celle que le code déclare ratifiée. **Il faut un ruling f2 : quelle série fait foi pour ⑤ et ⑭.**

**Correctif (si la série 4 fait foi).** `Support = null` (comme ③, `SpecDecor.Support` doc « ③ seulement » à amender, garde D1/D4 à adapter), `Poser` le gère déjà (`DecorDeScene.cs:355`).
```diff
--- a/Assets/Scripts/ShellContracts/DecorsDeScene.cs
-        public static readonly SpecDecor DecisionDetail = new SpecDecor("⑤", "DecisionDetailScreenController", StatutDecor.Pose,
-            SceneDeFond.Verge, 1f, 0.34f, new SpecSupport(new[] { SpecCouche.Radial(…) }, rayon: new Vector4(26f, 26f, 0f, 0f)));
+        public static readonly SpecDecor DecisionDetail = new SpecDecor("⑤", "DecisionDetailScreenController", StatutDecor.Pose,
+            SceneDeFond.Verge, <lum mesurée sur v4-4>, <bande = barre, ≈ 0,10>, null);
-        public static readonly SpecDecor Compression = District("⑭", …, 0.62f, 0.35f, new SpecSupport(new[] { Points…, Lineaire… }));
+        public static readonly SpecDecor Compression = District("⑭", …, <lum mesurée sur v4-29>, <bande ≈ 0,10>, null);
```
⚠️ `Bande` ne doit PAS valoir 1 : `ReserverLaBande` (utilisé par ⑤ et ⑭) pousserait le contenu hors de l'écran ; avec `Support == null`, `Bande` n'ancre rien et ne sert qu'à la réserve du haut.
La luminosité est à MESURER (ne pas reprendre 0,62 / 1,0 de la série 6). Effort M (catalogue + docs du design + gardes D1/D4/`teintes`).

## F6 — E09, feuille de listing et décor : PARTIEL

* **Feuille 13,5 % contre 74,6 %.** Compare un état VIDE (aucune ligne, assumé n° 7) à la référence nominale à 18 lignes. `Papier` (`InspectionScreenController.cs:406`) est un `VerticalLayoutGroup`
  sans `flexibleHeight` : sa hauteur est celle de son contenu, donc 18 `Ligne` la rempliraient (non rendu ici : je ne peux pas le MESURER, aucune planche chargée). Pas de défaut de code établi ;
  le vide sous la feuille est du kraft nu comme sous la fiche du cadre 33 (≈ 24 % du cadre). Le trou de 68,2 % est surtout l'espace sous le dépôt.
* **Décor qui disparaît.** Mesuré ci-dessus : 10,0 % au jeu = cadre 31 (11,6 %) ; les cadres qui montrent le dépôt (33/34) laissent la scène jusqu'à 32,3 %. L'écart de 22 points est
  celui d'un `Bande` unique pour trois états ; le corriger demande un `Bande` dynamique par état (`DecorPose.Rafraichir`) : effort L, à arbitrer (le design §9 le consigne).

## F7 — E09, quatre textes sous le seuil : CONFIRMÉ

**Cause.** `InspectionScreenController.cs:430` (`DepotTitre`, `Or`), `:433` (`Cible`, `Creme2`), `:436` (`Effet`, `Creme2`), `:475` (`Avert`, `Creme2`) : des encres CLAIRES posées
directement sur le kraft du `Support`. Elles étaient justes sur l'aplat sombre `surfaceBase` qu'a remplacé le décor (commentaire `:378-380`) ; le décor a changé le fond sans réencrer
le contenu. La maquette (cadre 33) met ce bloc sur une FICHE CRÈME à encre sombre (titre noir, SUR/PRIX/EFFET en encre, DÉPOSER rouge sur crème), pas sur le liège.

**Mesures.** Replay `python3 -I mesures/06-contraste.py` : 2,81 / 2,61 / 2,66 / 2,64:1 (témoin haut 11,90:1). Recalcul indépendant (`/tmp/contraste.py`, jetons du code sur le kraft médian mesuré (117,88,46)) :
```
DepotTitre Or d9ab4e = 3,10   Cible/Effet/Avert Creme2 b9ac92 = 2,94   (seuil 4,5 petit texte ; 3 grand)
proposé sur PlaqueCreme (216,202,167) : EncreDuRegistre 2b2a26 = 8,84 ; EncreFaibleDuRegistre 6b695e = 3,39 (insuffisant) ; RougeDuRegistre 93402c = 4,29 (insuffisant)
```
(l'écart avec les chiffres du juge vient du fond de la fenêtre et de l'anti-crénelage ; les deux sont < 4,5.)

**Correctif (esquisse).** Dans `Construire`, entre le papier et le bouton, un conteneur `Fiche` (VerticalLayoutGroup, `Image` `PiedDEcran.PlaqueCreme`, padding 10 CSS) qui reçoit `DepotTitre`, `Cible`,
`Effet`, `Prix`, `Deposer`, `Avert` à la place de `transform` ; encre `EncreDuRegistre` (8,84:1) pour tous les textes (ne PAS prendre `EncreFaibleDuRegistre` ni le rouge pour du petit texte : < 4,5).
Garde : contraste mesuré sur le rendu de l'état vide aux 2 résolutions ≥ 4,5:1 (grand texte ≥ 3). Effort M.

## Causes communes (réponse à la question du juge)
* **F5 et F10 : cause commune INFIRMÉE par le code.** F10 est un ordre d'enfants (`EnteteDEcran.cs:58`) qui touche exactement les trois écrans qui appellent `Construire` (E03, E04, E05) ; E08 et E11 n'en
  utilisent pas. F5 (E08/E11) est une valeur de catalogue venue d'une autre série de maquette ; F5 (E04/E09) est RÉFUTÉ.
* **Ce qui est partagé** est un AMPLIFICATEUR : le `Support` opaque, plein largeur, ancré en bas. Il transforme tout élément manquant ou caché en trou de couleur. F2 en est le cas : F10 cache les phrases, et l'état
  vide ne recouvre pas le kraft. F7 en est un autre : le décor a changé le fond de E09 sans réencrer le contenu.
* **F2 ⊃ F10** : les « deux phrases absentes » de E04 sont la cause F10, pas un défaut propre.
* **Gardes à ajouter (structurelles avant valeurs)** : ordre de fratrie `Decor` = enfant 0 sur chaque écran décoré construit en entier ; encre de titre > 0 dans la bande d'en-tête ; contraste rendu ≥ 4,5:1 sur les fenêtres de texte.
