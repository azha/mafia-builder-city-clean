# Enquête A — juge d'ensemble r2 (08/10) — F1, F3, F5, F6

Lecture seule : aucun fichier du dépôt modifié, ni Unity ni typecheck. Scripts rejouables (`python3 -I`) : `enquete-A-mesures/m1_grain.py`,
`m2_grain_hp.py`, `m3_vignette.py`, `m4_trou_css.py` ; scripts du juge rejoués : `.../ensemble-decor/r2-2026-10-08/mesures/04_trous_encre.py`, `05b_matiere_brune.py`.
Toutes les images lues : captures 1080×2400 / 1080×1920, références 1080×2102 (×3,6 des deux côtés : 1 px CSS = 3,6 px image).

## Tableau

| F | verdict | cause racine | correctif | effort |
|---|---|---|---|---|
| F1 | CONFIRMÉ | `DecorsDeScene.cs:90` `Bande` = 0,10 (fraction, valeur du cadre 31) : le `Support` opaque couvre 90 % de la page, alors que les cadres 33/34 (états à fiche) posent un corkboard de `min-height:400px` sous 32 % de scène ; rien ne couvre le reste (`InspectionScreenController.cs:376-499`, pile `UpperCenter`) | `Bande` par ÉTAT, en px CSS : Support = 400 px CSS bornés en bas dans l'état vide | M |
| F3 | PARTIEL : ⑮ CONFIRMÉ ; ㉘ « cadre perdu » CONFIRMÉ, « grain perdu » RÉFUTÉ | ⑮ : `DecorsDeScene.cs:84-88` `Liege()` ne déclare que le `RadialCercle` ; le `.grain` (ref :476) est inventorié « objet » (`INVENTAIRE.md:36`) et personne ne le construit. ㉘ : `DistributionScreenController.cs:463,975,1184` peint la plaque en aplat opaque `#7a5230` par-dessus le `Support`, et `Filets.Distribution.CadreB` est en dette (`DecorDeScenePosePlayModeTests.cs:58`) | ⑮ : 2 couches `Points` dans `Liege()` ; ㉘ : plaque sans fond + `Filets.Poser(…, CadreB)` | S (⑮), S (㉘) ; vignette : classe C (DESIGN §9), M si f2 la veut |
| F5 | CONFIRMÉ (et le juge sous-estime : à 1920 le trou reste 27,9 % avec le geste) | (a) vrai défaut : même cause que F1 pour ㉘, `RendreAucunRelais` `:959-983`, Support plein-corps sous une plaque de 120 px CSS ; (b) l'état « avec/sans geste » n'est PAS un bloc libre mais une COURSE de la capture : `PlanchesParEcranCapturePlayModeTests.cs:448-460` | (a) `decor.SuivreLeCadre(vide)` ; (b) drapeau `ProposeAchatTermine` attendu par `Charger` | M / S |
| F6 | CONFIRMÉ | `DistributionScreenController.cs:982` passe `titreTexte.text` comme ligne 1 de l'étiquette ; le test `DistributionScreenPlayModeTests.cs:122` EXIGE la répétition | ligne 1 = `Libelle.De("distribution","bloc","Aucune route tendue pour l’instant.")` (clé servie, string_table.ts:730) ; inverser le test | S |

Causes communes : F1, F3 (matière), F5 = le `Support` est un lit pleine page, opaque, posé en fraction ; tout ce qui manque (objet, matière, bande) devient un trou de couleur. F3-㉘ et F5(a) partagent la plaque aplat du contrôleur. F6 est indépendant.

---

## F1 — E09 ⑮ : la moitié basse est du liège nu — CONFIRMÉ

**Confrontation aux assumés et à la doctrine.** Assumé n° 8 : l'état vide EST assumé ; l'avertissement n° 2 du dossier : « un écart assumé rendu SALEMENT reste un défaut ». Aucun assumé ne couvre un rendu du vide. Doctrine (design §9) : `Bande` ancrée en haut, « consigné » : cela concerne 18 px, pas 22 points de page.

**Mesure** (`m4_trou_css.py`, qui prend un CONTRÔLE SYNTHÉTIQUE : 3 blocs d'encre sur grain ±7, plus grand vide attendu 600 px, rendu 600 px → OK ; le contrôle « E10 » du script 04 du juge ne séparait pas — il imprime `NON — ne rien conclure` — mais ses témoins négatifs/positifs 31/33/34 se séparent) :
```
REF c31 (tableau)        1080x2102  trou =   74 px =  21 px CSS =  3.5 % de H
REF c33 (signalement)    1080x2102  trou =  521 px = 145 px CSS = 24.8 % de H
REF c34 (retour de baton)1080x2102  trou =  286 px =  79 px CSS = 13.6 % de H
JEU E09 2400             1080x2400  trou = 1180 px = 328 px CSS = 49.2 % de H   (y=1001..2181)
JEU E09 1920             1080x1920  trou =  709 px = 197 px CSS = 36.9 % de H   (y=992..1701)
```
Correction du rapport : « idem à 1920 » est inexact (36,9 %, pas 49,2 %), mais tient : 197 px CSS contre 145 au plus grand trou voulu. Le comparateur « ≤ 24,5 % » est le bon pour ⑮ (31/33/34) ; les trous plus grands d'autres écrans de référence (E06 c79 : 40 %, E03 c48 : 28 %) sont des panneaux sombres sans matière, pas du liège.

**Cause racine (pas le symptôme).**
- `DecorsDeScene.cs:90` `District("⑮", …, 0.45f, 0.10f, Liege())` : `Bande` est une FRACTION recopiée du cadre 31 (11,6 %, tableau de fiches). Le DESIGN (§4 l.159, B1) mesure le `corkboard` à **298×504 px CSS (c31) et 298×400 (c33-35)** : la maquette borne le liège en PX CSS et laisse le reste à la scène (c33/34 : scène 32,3 % de 2102). Sur 20:9 (667 px CSS), une fraction de 0,90 donne 600 px CSS de liège pour une pile de 203 px CSS.
- `InspectionScreenController.cs:376-399` : racine `VerticalLayoutGroup` `UpperCenter`, `childForceExpandHeight=false`, aucun élément flexible ; `ReserverLaBande(v, decor, Px(8f))` pousse la pile sous la bande, rien ne la remplit. Registre (cadre 32) + fiche (cadre 33) = 203 px CSS (726 px image mesurés : registre y≈275, fiche finit y=1001).

**Option unique, fidèle à 33/34, sans aucun texte.** Reproduire leur composition : liège de 400 px CSS en bas (la cote du DESIGN), scène au-dessus, pile sous la bande. Calcul sur les mesures : 2400 → bande 0,40, trou ≈ 495 px = 138 px CSS (20,6 %) ; 1920 → bande 0,25, trou ≈ 495 px = 137 px CSS (25,8 %) ; la réf. fait 145 px CSS. Le même trou en px CSS aux deux résolutions, ce qu'aucune fraction ne donne. Il faut que ce soit PAR ÉTAT : l'état peuplé (18 lignes, cadre 32) tient aujourd'hui avec 0,10 ; avec 0,32 il déborde de ≈ 50 px CSS à 2400 (calcul : 667−213−60−110 = 284 disponibles pour ≈ 334 de registre) — ne PAS changer la constante du catalogue.

```diff
--- a/Assets/Scripts/ShellContracts/DecorPose.cs
+        /// <summary>Hauteur du support en px CSS (`min-height` de la maquette : ⑮ cadres 33-35 = 400). null = `Spec.Bande` (fraction).</summary>
+        public float? HauteurSupportCss { get; private set; }
+        public float Bande => HauteurSupportCss.HasValue
+            ? Mathf.Clamp01(1f - HauteurSupportCss.Value * Echelle / Mathf.Max(1f, ((RectTransform)transform).rect.height))
+            : (Spec != null ? Spec.Bande : 0f);
+        public void FixerLaHauteurDuSupport(float? px) { HauteurSupportCss = px; Rafraichir(); }
@@ public void Rafraichir()
+            if (HauteurSupportCss.HasValue && suivi == null)
+            { float b = Bande; if (Support != null) Support.anchorMax = new Vector2(1f, 1f - b); if (Cerne != null) Cerne.anchorMax = new Vector2(1f, 1f - b); }
--- a/Assets/Scripts/ShellContracts/ReserveDeBande.cs
-            float bande = h * Mathf.Clamp01(pose.Spec.Bande);
+            float bande = h * pose.Bande;
--- a/Assets/Scripts/CitySim/Inspection/InspectionScreenController.cs      (dans Rendre(), après EtatVide = …)
+            decor.FixerLaHauteurDuSupport(EtatVide ? 400f : (float?)null);   // cadres 33/34 : corkboard min-height 400 ; l'état peuplé garde la fraction du catalogue
```
(`decor` : garder le `DecorPose` renvoyé par `Poser` en champ, `:383`. `ReserveDeBande.Maj` doit aussi se relancer : `GetComponentInChildren`/référence mémorisée, ou l'appeler depuis `FixerLaHauteurDuSupport`.) Gardes : D4i (la pile commence sous max(barre, bande)) à rejouer aux deux résolutions ; garde de pixels « trou ≤ 25 % de H » sur l'état vide. Non vérifié ici : le rendu (Unity non lancé) ; le calcul ci-dessus est arithmétique sur les mesures.

## F3 — la matière brune est un aplat

**Confrontation.** DESIGN §9 consigne « ombres portées et `inset` ; liseré/ombre interne de `planche` » en classe C : cela couvre la VIGNETTE et l'ombre interne, pas le grain ni un cadre de 5 px (matière = A/B, ruling 07/10).

### ⑮ — CONFIRMÉ
```
m2_grain_hp.py  (filtre passe-haut 15×15, patchs SANS contenu ; contrôle : aplat synthétique → 0)
REF c33 liège nu            (1080,2102) p99=11 max=13
JEU E09 2400 liège nu       (1080,2400) p99=0  max=0
JEU E09 1920 liège nu       (1080,1920) p99=0  max=0
m3_vignette.py  (moyenne locale 9×9, bord x=12 → centre x=540)
REF c33 y=1900  x12:79 … x540:99   bord->centre = +20     JEU E09 2400  x12:113 … x540:114  = +1
REF c33 y=1700  x12:87 … x540:109  bord->centre = +22     JEU E09 1920  x12:117 … x540:118  = +1
```
Le juge a raison : grain absent (p99 0 contre 11) et vignette absente (+1 contre +20/22).

**Cause.** `DecorsDeScene.cs:84-88` : `Liege()` = un seul `SpecCouche.RadialCercle`. La maquette (`ecrans-brennar-6.html:476`) pose le grain comme enfant `.grain` de `.corkboard` : `radial-gradient(circle,#00000022 .8px,transparent 1.1px) 0 0/6px 6px` + `radial-gradient(circle,#ffffff10 .6px,transparent .9px) 3px 3px/9px 9px`. Il est AU-DESSUS du dégradé et SOUS les fiches (premier enfant) : c'est exactement une couche de `Support`. L'inventaire l'a rangé en « objet » (`INVENTAIRE.md:36`, `grain`) donc « reste dans le contrôleur » (DESIGN :130), et `InspectionScreenController` n'en construit aucun (`grep -i grain` : zéro). La primitive existe (`SpecCouche.Points`, `ProceduralUI.TuilePoints`, déjà employée par ㉘ et ⑭). Recette `Filets.Inspection.Corkboard` (bord haut 6 px `#3a2a12`) : en dette déclarée (`DecorDeScenePosePlayModeTests.cs:84`).

**Linéaire contre sRGB.** Le grain de ㉘, déjà posé par la même voie, rend p99 = 10 contre 15 à la maquette (`m2`) : `Ajuster`/`CouleurPourMelangeLineaire` ne peut pas assombrir davantage (il faudrait une encre négative pour `#000` à 13 %). Attendre ≈ 2/3 de l'amplitude, soit p99 ≈ 7 sur ⑮ (réf. 11) : visible, pas égal ; classe C pour le reste.

```diff
--- a/Assets/Scripts/ShellContracts/DecorsDeScene.cs
         private static SpecSupport Liege() => new SpecSupport(new[]
         {
+            // `.corkboard .grain` (ecrans-brennar-6.html:476) : au-dessus du dégradé, sous les fiches — même mécanisme que la planche de ㉘
+            SpecCouche.Points(6f, 0.8f, 1.1f, Teinte.Nommee("noir", Color.black, 0x22 / 255f), Vector2.zero),
+            SpecCouche.Points(9f, 0.6f, 0.9f, Teinte.Nommee("blanc", Color.white, 0x10 / 255f), new Vector2(3f, 3f)),
             SpecCouche.RadialCercle(0.30f, 0.20f, …),
         });
```
⑰ (`Precinct`, `:91`) partage `Liege()` : même maquette, même gain. Tests à adapter : `DecorDeScenePlayModeTests.cs:428` D4f `Arret(s, 0, 2)` → `Arret(s, 2, 2)` (la couche 0 devient un `Points`, sans `Arrets`) et la tolérance du pixel d'angle (un point de grain peut tomber dessus) ; `Radiaux[0]` inchangé (seuls les radiaux s'y inscrivent) ; D4e inchangé. Garde d'effet à ajouter (« rendre et compter les pixels ») : p99 du passe-haut du liège nu > 4/255 sur banc.
Vignette (`inset 0 0 60px #00000055`) : aucune primitive d'ombre INTERNE n'existe (`Lueur` du cerne est extérieure) ⇒ M ; classe C par le design §9 ; à ne faire que sur ruling de f2.

### ㉘ — le grain : RÉFUTÉ ; le cadre et la plaque : CONFIRMÉS
Le « 73 → 1 » du juge (`05b`) compare deux grandeurs différentes : à la maquette le profil x=0..80 de la ligne y=950 TRAVERSE le `cadre-b` (`58,67,86 · 118,90,55 · 42,30,18 · 74,55,34 · 91,69,42` : le pas de 73 est le bord du cadre, 5 px `#4a3722`) ; au jeu la ligne y=1500 est lue sur le `Support` nu, par pas de 4 px, quand le grain est en points de 8 px tous les 32 px (rate la plupart des points). Mesure sur patchs 2D (`m1`, `m2`) :
```
REF c54 kraft (champ)       p99=15        JEU E04 2400 Support nu (sous le panneau)  p99=10 max=12
JEU E04 1920 Support nu     p99=7 max=19  JEU E04 2400 DANS le panneau vide           p99=0  max=0   px=(122,83,49)
```
Le grain du `Support` est là (crop `grain.png` : points clairs et sombres visibles) ; il est **absent de la plaque** : `DistributionScreenController.cs:463` (`Panneau`, état nominal) et `:975` (`PanneauVide`) font `AjouterFond(…, Liege)` avec `Liege = Hex("#7a5230")` (`:1184`), un aplat OPAQUE qui recouvre la planche déclarée au catalogue (et qui est plus sombre/rouge que le kraft autour : (122,83,49) contre (133,101,62)). Le `.cadre-b` (inset 5, bordure 5 `#4a3722`, rayon 3) : recette `Filets.Distribution.CadreB` MESURÉE (`DecorsDeSceneFilets.cs:570`) mais jamais posée : `DecorDeScenePosePlayModeTests.cs:58` la garde en `RecettesEnAttente["㉘"]`.
```diff
--- a/Assets/Scripts/Operational/Distribution/DistributionScreenController.cs
@@ RendreCorkboard (:463)   et   RendreAucunRelais (:975)
-            AjouterFond(panneau, Liege);
+            // la planche (grain + dégradé) est le Support du décor : la plaque n'a PLUS de fond ; `.cadre-b` posé (recette mesurée)
+            Filets.Poser((RectTransform)panneau.transform, DecorsDeScene.Filets.Distribution.CadreB);
@@ idem pour vide (:975)
-            AjouterFond(vide, Liege);
+            Filets.Poser((RectTransform)vide.transform, DecorsDeScene.Filets.Distribution.CadreB);
```
+ retirer `"CadreB"` de `RecettesEnAttente["㉘"]`. ⚠ à vérifier au rendu : le contraste de l'étiquette crème sur le kraft du Support (133,101,62) au lieu de (122,83,49) ; `Liege` (`:1184`) peut devenir inutilisé.

## F5 — E04 ㉘ : pas de bande de pied, 43,8 % de liège nu — CONFIRMÉ

**Confrontation.** Assumé n° 1 : « son absence [du geste] n'est pas un finding » ; il ne couvre ni la bande ni le rendu du vide (avertissement n° 2).
```
m4_trou_css.py
REF c54                    1080x2102  trou =   86 px =  24 px CSS =  4.1 % de H
JEU E04 2400 (sans geste)  1080x2400  trou = 1050 px = 292 px CSS = 43.8 % de H   (y=1131..2181)
JEU E04 1920 (avec geste)  1080x1920  trou =  535 px = 149 px CSS = 27.9 % de H   (y=863..1398)
```
**Le trou subsiste avec le geste** (27,9 % contre 4,1 % à 1920) : ajouter la bande ne guérit rien.

**Cause (a), le vrai défaut.** `RendreAucunRelais` (`DistributionScreenController.cs:959-983`) : le `Support` (kraft + grain, de la bande 0,21 au bas) est plein-corps ; la seule chose posée dessus est une plaque de 120 px CSS (`:976`). Même cause que F1 : un lit pleine page, aucun objet à sa taille.

**Cause (b), « présence selon la pile » : c'est une COURSE de la capture, pas un bloc libre.** `Charger` (`PlanchesParEcranCapturePlayModeTests.cs:421-461`) rend son verdict dès qu'une propriété d'erreur est non vide : `DerniereErreur` est posée à `DistributionScreenController.cs:299`, AVANT `RendreAucunRelais`, donc `Verdict()` = « erreur DerniereErreur=… » (c'est la ligne du `journal.tsv`) ; la 2ᵉ attente (`tousRequis`) est sautée (`!v.StartsWith("erreur")`), restent 20 images. Or le geste vient de `ProposerAchatDeRelais` (`:838-865` : `GetDistricts` puis un `Interior` par quartier, réseau). Les deux résolutions partent d'UN SEUL chargement (`:354-356`, même compte, même état) : si le geste manquait « parce qu'il n'y a pas de bloc libre », il manquerait aux deux. Il manque à 2400 (prise en premier) et il est là à 1920 (prise après) ⇒ le réseau a répondu entre les deux prises.
```diff
--- a/Assets/Scripts/Operational/Distribution/DistributionScreenController.cs
+        public bool ProposeAchatTermine { get; private set; }     // vrai quand ProposerAchatDeRelais a fini (geste posé OU pas de bloc)
@@ private IEnumerator ProposerAchatDeRelais()   : ProposeAchatTermine = false; en tête ; = true avant CHAQUE sortie (try/finally)
--- a/Assets/Tests/PlayMode/PlanchesParEcranCapturePlayModeTests.cs
-            string[] tousRequis = { "RenduTermine", "DernierChargementCouriers", "DernierChargementProjection" };
+            string[] tousRequis = { "RenduTermine", "DernierChargementCouriers", "DernierChargementProjection", "ProposeAchatTermine" };
+  et lever la sortie « erreur » : DerniereErreur n'est qu'un diagnostic pour ㉘ (journal : la ligne E04 le dit déjà)
```
**Correctif (a), option unique** (mécanisme existant, précédent ㊲) : sans geste comme avec, la planche EST la plaque, et le reste de la page redevient scène, comme ㊲ (`ReputationScreenController.cs:748`) :
```diff
--- a/Assets/Scripts/Operational/Distribution/DistributionScreenController.cs
@@ RendreAucunRelais, après la construction de `vide`
+            decorPose.SuivreLeCadre((RectTransform)vide.transform);   // Support + (futur) cerne = le rect de la plaque ; `decorPose` = le retour de DecorDeScene.Poser (:1087) à garder en champ
@@ RendreCorkboard / chargement nominal
+            decorPose.LacherLeCadre();   // NEUF dans DecorPose : suivi = null, Support re-ancré par AncrerSousLaBande (sans cela le retour à l'état nominal garde un support rétréci)
```
Réserves : (1) la zone sous la plaque devient la scène à 0,24 (sombre, quelques fenêtres) : l'instrument `04` (lignes sans encre) la comptera encore comme « trou » faute de contraste — juger À L'ŒIL ; (2) c'est un parti pris d'état sans cadre (assumé n° 1) : à valider par f2 ; (3) la plaque devrait avoir la cote nominale de la planche (≈ 224 px CSS mesurés au cadre 54) et non 120 si l'on veut qu'elle se lise comme la planche, et non comme un cartel — c'est le choix de f2 (r1 avait essayé la plaque pleine-corps : « grand carré brun »).

## F6 — la fiche crème répète le titre — CONFIRMÉ
`DistributionScreenController.cs:982` : `ConstruireEtiquette(vide.transform, "EtiquetteVide", titreTexte.text, "D'OÙ ÇA PART", …)` passe le titre de l'état en ligne 1. Le test `DistributionScreenPlayModeTests.cs:122` l'EXIGE (`Assert.AreEqual(Entete/Titre.text, chip/Titre.text, "le titre de l'état, sans mot nouveau")`) : la répétition est de l'intention écrite, pas un accident. Le juge a raison sur le fond : la ligne 1 d'une fiche est la SOURCE (c54 : « Atelier Vesk — Hautes-Marches, îlot 412 ») ; il n'y en a pas, et le titre est déjà au bandeau, juste au-dessus.
Clés déjà servies (string_table.ts) utilisables sans mot nouveau : `distribution.bloc.aucune_route_tendue_pour_l_instant` (:730 ; déjà employée par ce contrôleur `:539` pour « Lignes » dans l'état sans route, donc absente de l'écran dans l'état vide : aucune répétition), `distribution.bloc.destination_a_determiner` (:731, mauvais sens : « destination »), `distribution.bloc.pas_encore_tendue` (:1141, trop elliptique). Retenue : la première.
```diff
--- a/Assets/Scripts/Operational/Distribution/DistributionScreenController.cs
-            ConstruireEtiquette(vide.transform, "EtiquetteVide", titreTexte.text, "D'OÙ ÇA PART", TextAlignmentOptions.Center);
+            ConstruireEtiquette(vide.transform, "EtiquetteVide", Libelle.De("distribution", "bloc", "Aucune route tendue pour l’instant."),
+                                "D'OÙ ÇA PART", TextAlignmentOptions.Center);
--- a/Assets/Tests/PlayMode/DistributionScreenPlayModeTests.cs
-            Assert.AreEqual(racine.Find("Entete/Titre")….text, chip.Find("Titre")….text, "le titre de l'état, sans mot nouveau");
+            Assert.AreNotEqual(racine.Find("Entete/Titre")….text, chip.Find("Titre")….text, "la fiche ne répète pas le titre (juge r2 F6)");
+            Assert.AreEqual(Libelle.De("distribution", "bloc", "Aucune route tendue pour l’instant."), chip.Find("Titre")….text);
```
Alternative sans mot du tout : ne rien mettre en ligne 1 (fiche réduite à son libellé « D'OÙ ÇA PART », une case vide qui attend sa source) — plus sobre, mais une fiche à une ligne s'éloigne de la grammaire du cadre.
Attention : `ConstruireEtiquette` traite `titreBrut` comme DONNÉE DÉCOUVERTE (« jamais passée par `Libelle.De` ») : appeler `Libelle.De` ici est correct (c'est une phrase d'interface), mais `TrackText` l'enregistre au même titre ; vérifier la garde de classe « mots servis » (le texte est dans `string_table.ts`, donc servi).

## Non vérifié
- Aucun rendu : Unity non lancé ; les chiffres « après » de F1 sont de l'arithmétique sur les mesures, ceux du grain ⑮ une extrapolation du grain de ㉘ (p99 ≈ 2/3 de la réf.).
- Course de capture (F5-b) : établie par les lignes de code et par « un chargement, deux prises » ; pas rejouée.
- La vignette n'est pas proposée (aucune primitive ; classe C).
