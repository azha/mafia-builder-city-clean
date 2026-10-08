# Décor de scène — DESIGN du mécanisme commun (CLIENT-2, 07/10/2026) — v5

**Statut : v5 = v4 corrigée de la revue n°4 (§0 quinquies) ; v4 = v3 + « filets et bords d'état » (§3.4, demande de f2 du 07/10 : classe mesurée par un juge groupé) ; v3 = revue n°3 traitée (§0 ter) ; historique : v2 après revue ⊥ n°1 (4 BLOCKING, 5 MAJOR, 7 MINOR — toutes traitées ci-dessous). Aucun code écrit.** Entrées : `INVENTAIRE.md` (mesures de la maquette série 6), décisions f2 du 07/10 (périmètre = les 26 écrans qui ont une maquette série 6 ; objets de la famille C = contenu d'écran, seuls leurs FONDS entrent ici ; verge nuit en repli temporaire ; le décor se pose par le gabarit, de façon déclarative ; ruling user « le gros, fidèle, les nuances à la fin »).

## 0. Réponses à la revue ⊥ n°1 (puis n°2 : voir §0 bis) (chaque point : décision, et la commande ou mesure qui l'établit)
| # | constat | décision v2 |
|---|---|---|
| B1 | `LinearGradient` = 2 arrêts, `DegradeVertical` = 180° seulement, `VoileRadial` = 1 teinte : A (178°, 3 arrêts), ㉒ (158°), ⑤ ⑮ ⑰ (radiaux opaques 3 arrêts) inconstructibles | **Deux primitives NEUVES** dans `ProceduralUI` (§3.3) : `DegradeLineaire(angle, Arret[])` et `DegradeRadial(…, Arret[])`, N arrêts, test de pixels chacune. Le design n'annonce plus de réutilisation de ces trois. |
| B2 | 18 couleurs du catalogue sous le seuil TD-612 (d ≤ 4) | **Tranché valeur par valeur** : `teintes.py` → `teintes.json` (75 jetons lus dans `DesignTokens.asset` ; revue n°2 : le script lit aussi les zones dominantes ㉓ ㉘, pas seulement les racines) : 20 couleurs PAR JETON (table §4.1), 34 littéraux admis (d > 4). Règle : la garde existante prime, la dérive (≤ 3,6/255) est écrite au catalogue. |
| B3 | 25 lignes pas 26 (⑰ absent) ; D1/D2 rouges par construction | ⑰ ajouté ; colonne **Statut** (Posé 22 · DéjàLivré 3 : ⑨⑩⑯ · NonMonté 1 : ㉑) lue par D1 et D2 (§6). |
| B4 | supprimer le fond plat supprime le bloqueur de raycast (`AppShell.cs:904-912`) | `Poser` crée **`Decor/Capteur`** : Image pleine zone, alpha 0, `raycastTarget = true`, premier enfant ; D4 ajoute une sonde de raycast (§6). |
| M1 | ㉓ ㉘ n'ont pas de fond propre : B = 7 pas 9 ; `Bande` si `Support` null ? | B (fond propre à la racine) = **7** ; ㉓ ㉘ prennent comme support le fond de leur zone DOMINANTE (`vitre`, `planche`, §4) ; `Support == null` n'existe que pour ③ (`Bande = 1`). |
| M2 | `background-position y` : 8 valeurs mesurées par cadre, `SpecDecor` n'en a aucune | **Prémisse tranchée par calcul** : `UvCouverture` n'emploie `PositionVerticale` que si `aspectEcran ≥ aspectBoite` ; boîtes : district 0,5625 · bar 0,8 · verge(-jour) 1,176 ; un téléphone portrait ≤ 9:16 (0,5625) est donc toujours dans la branche SANS liberté verticale (aspect égal ⇒ `y0 = b.y`). Une valeur par SCÈNE (constante), pas de champ par écran ; cas paysage/tablette consigné (§9). |
| M3 | « identité algébrique » surévaluée pour `AlphaVoileSurFondQuelconque` | **Abandonné** : la luminosité est une teinte `RawImage.color = (b,b,b,1)` (les couleurs de sommets uGUI sont converties gamma→linéaire : un produit en sRGB, ce que fait `brightness()`). Prémisse falsifiable : **sonde D4** (pixel de scène × b à ±2/255). Repli si la sonde rougit : voile noir `1 − b` + ajustement, mesuré. |
| M4 | convention Y du `Radial`, extinction cosinus vs linéaire | `Radial` se déclare en coordonnées **CSS (y depuis le HAUT)** ; le constructeur convertit en UV (y depuis le bas) ; `DegradeRadial` est LINÉAIRE par arrêts (comme CSS) — le cosinus de `VoileRadial` n'est plus utilisé ici. Test : pixel du foyer. |
| M5 | rayon de coin, tuile px, arrêts en px | `SpecSupport.Rayon` (⑤ 26/26/0/0, ⑯ 3) via `Mask` + `RoundedRectMask(tl,tr,br,bl)` NEUVE (revue n°3 B2) ; `Points/Rayures.Pas` en px CSS (⑭ 26) ; `Arret` accepte `Px` (⑱ 18 px, double arrêt dur). |
| m1 | clé de cache fournie par l'appelant | clé **dérivée du contenu** de la spec (comme `lingrad:` / `voile:`). |
| m2 | D4 sans taille ; canvas de repli paysage | D4 rend à **540×960 portrait** (RenderTexture + Canvas ScreenSpace-Camera propre au test), pas via le repli 1280×720. |
| m3 | D4 « bande visible » sans chrome | dit : D4 juge le DÉCOR seul ; l'effet du bandeau se juge sur planche (§9). |
| m4 | `VERGE_D_NUIT_FINAL.png` hors `Resources` : déplacer ou copier ? | **COPIE** sous `Assets/Art/Scenes/Resources/Scenes/scene_district_nuit.png` (le `.json` d'ancrage voisin et la référence de `DistrictBackgroundSlots` ne bougent pas) ; dette « dédoublonner (+2,8 Mo) ». |
| m5 | md5 du jpeg introuvable | **Commité** : `assets/verge_nuit_provisoire.jpg` (md5 `facdc64c611e3ef415dfbfb29b45226a`). |
| m6 | D3 sans forme de littéral | D3 liste les formes : `"#rrggbb"`, `0xRRGGBB`, `new Color(` à flottants, `"Scenes/…"`, `brightness`. |
| m7 | les fonds C SONT le fond de la racine ; `Peindre` inutile | **`Peindre` supprimé** ; le besoin réel est `Rayon`. |

### 0 bis. Revue ⊥ n°2 (3 BLOCKING, 4 MAJOR, 4 MINOR) — réponses
| # | constat | décision |
|---|---|---|
| B-a | `teintes.py` ne lisait que les racines : 2 littéraux de ㉓ sous le seuil (`#0c1015` d 3,00 ; `#0f141a` d 3,53) et 4 manquants | le script lit maintenant toutes les couleurs écrites au catalogue : **20 jetons, 34 littéraux** (§4.1) |
| B-b | ③ n'a pas de voile (mesuré : 1 cadre sans voile) | `SpecDecor.Voile` (faux pour ③), « identique partout » corrigé en 25/26 |
| B-c | ⑮ ⑰ `circle farthest-corner` inexprimable | `Radial` en fractions de la boîte du SUPPORT (le `%` CSS se résout sur l'élément qui porte le dégradé : mesuré `corkboard` 298×504,05, pas 300×583) : `rx 1,523 ; ry 0,901` recalculés (revue n°3 B1) — **remplacé en v5 par `RadialCercle` (§0 quinquies B1)** |
| M-a | y de `background-position` : 8 valeurs, pas une constante | table corrigée : valeur de la règle de scène + les 8 mesures, inertes en portrait |
| M-b | ⑱ n'est pas plein écran (inset ShellChrome) et n'avait aucun fond | §5 : exception ⑱ nommée ; Capteur = ajout assumé pour ⑱ ; §9 complété |
| M-c | citations `AppShell.cs:904-912` / 1572 | reformulé : précédent documenté + D2 balaie contrôleur par contrôleur |
| M-d | « zone dominante » non mesurée | aires mesurées (74,3 % / 48,9 %), claim « couvre tout interstice » retiré |
| m1-m4 | d = 1,45 ; « 8 valeurs » ; `Points` à bord doux ; `Scene.color` noir vs luminosité | corrigés (§3.2, §2, §3.1) |

### 0 ter. Revue ⊥ n°3 (3 BLOCKING, 4 MAJOR, 5 MINOR) — réponses
| # | constat | décision |
|---|---|---|
| B1 | les `%` CSS se résolvent sur la boîte du SUPPORT (298×504 pour `corkboard`), pas sur 300×583 : rayon de ⑮ ⑰ faux de +12,7 % | `Radial` en fractions de la boîte du support ; `%` mesurés recopiés tels quels ; ⑮ ⑰ recalculés : **rx 1,523 · ry 0,901** (454,0 px) ; la texture est générée à l'aspect du support, donc un `%` reste exact à l'étirement — **remplacé en v5 par `RadialCercle` (§0 quinquies B1)** |
| B2 | `RoundedRectMask(int)` : un seul rayon ; ⑤ 26/26/0/0 | **`RoundedRectMask(tl,tr,br,bl)` NEUVE**, 9-slice (§3.3) |
| B3 | ㉘ : les 5 nombres des `Points` absents | écrits : pas 9, r 1,1→1,2, noir@.133, décalage 0,0 ; pas 13, r 0,9→1,0, blanc@.08, décalage 4,6 ; base `#8a6a42` |
| M1 | hex à d ≤ 4 dans §4 contredit D3 | chaque hex à d ≤ 4 porte son `{jeton}` en ligne dans §4 |
| M2 | district 50 %, pas 38 | 50 % (16/20), les 4 autres valeurs listées |
| M3 | regex de `teintes.py` rejette les formes à 8 chiffres | corrigé (`#rrggbb` + alpha optionnel) + `#ffffff` : **20 jetons · 35 littéraux** |
| M4 | `AlphaVoileSurFondQuelconque` optimisé sur d'autres fonds | voile de scène : oui ; halos/enseigne/cerne : fonds du support (`FondsDeReferenceSupport`), sonde D4 ±6/255 |
| min | v2/v3 ; `Bande` bas du cadre (corkboard −18 px, burner +12 px) ; colonne Enseigne ; ⑭ pas 26 ; clé de `DegradeVertical` | en-tête v3 ; §9 `Bande` ±18 px consigné ; colonne cerne = cerne+enseigne ; ⑭ pas 26 en §4 ; clé dérivée passée à `DegradeVertical` |

### 0 sexies. Revue ⊥ n°5 (delta B1 : 1 BLOCKING, 3 MAJOR, 3 MINOR) — réponses
| # | constat | décision |
|---|---|---|
| B1-a | aucun clip nommé pour l'Image carrée (908×908 sous un support 298×504) | **`RectMask2D` sur `Decor/Support`, toujours** ; `Mask`+`RoundedRectMask` si `Rayon > 0` ; D0 l'exige, D4 sonde « zéro pixel hors rect » |
| A | « au montage » vs « à chaque changement » ; pas de garde de la primitive | une formulation : **à chaque changement de rect** ; tests `RayonCoinLePlusLoin` (454,0 / 382,0 / 4 coins) et `DegradeRadialCercle` ; D4 « après resize, coin le plus loin = dernier arrêt » |
| B | `RadialCercle` nommé deux fois (CS0101) | composant renommé **`CercleDeSupport`** |
| C | quel rect, quel porteur | porté par `Decor/Support`, lit son rect, redimensionne ses enfants |
| min | texte v3 périmé ; résolution du sprite ; coquille | annoté ; 128×128 ; corrigé |

### 0 quinquies. Revue ⊥ n°4 (3 BLOCKING, 2 MAJOR, 4 MINOR) — réponses (07-08/10 ; comptes AVANT → APRÈS collés)
| # | constat | décision et preuve |
|---|---|---|
| B1 | `circle farthest-corner` de ⑮ ⑰ : rayon différent selon le cadre ; pas un (rx, ry) | **`RadialCercle(cx, cy, Arret[])`** : rayon calculé sur le rect réel, Image carrée (§2, §3.3). Mesuré (`mesurer-cercle.cjs`) : cadre 31 corkboard 298×504,05 → r 454,0 ; cadres 33-35 298×400 → r 382,0 ; cadre 32 = `listing` (autre objet, §9). UNE revue n°5 limitée à ce delta. |
| B2 | 6 couleurs de bord à d ≤ 4 en littéral | `teintes.py` lit désormais `mesure-filets.json` : **56 → 138 couleurs ; jetons 20 → 30 ; littéraux 36 → 108** ; les six (`#0a0d10` scrimBackdrop 2,85 · `#14171a` surfaceCard 2,96 · `#2b2f3a` surfaceRaised 3,11 · `#b9ac92` hudCremeSecondary 0,91 · `#f2c96b` hudMoneyGold 0,12 · `#ff5a4d` accentDanger 0,02) sont PAR JETON |
| B3 | états de ㉛ hors mesure (cadres 68/71) | mesure étendue à **tous les cadres des 26 écrans : 25 → 128 cadres ; 312 → 1560 éléments ; 1083 → 5403 côtés ; 85 → 137 recettes ; 55 → 87 couleurs de bord** ; `#4f7f3f` : 0 → présent (cadre 68) ; `#8a6a22` : 80 côtés ; D6(a) porte sur ces 128 cadres |
| M1 | `K = 1280/300` inventé | supprimé : `EchelleMaquette.PxTrait(valeurCss, racine, LargeurEcransBrennar6)` (§3.4, D6c) |
| M2 | `teintes.json` périmé, comptes divergents | régénéré ; §4.1 entre marqueurs, **`verifier-design.py` compare §4.1/§3.4/§4 aux JSON (exit 1 sinon)** |
| min | 34+6 inversé ; `.cerne` 1 px ; nom des nœuds ; 50 % non établi pour `Tirete` | corrigés (§3.4, D6c) : tireté 140, pointillé 45 ; `.cerne` 1 px rayon 3 ; `Filets/Haut|Droite|Bas|Gauche` ; remplissage 50 % = mesure du juge pour `#c3b79e` seulement |

### 0 quater. Demande de f2 (07/10) : « filets et bords d'état » (couche L5) — intégrée §3.4 et D6
| point | décision |
|---|---|
| classe mesurée | 312 éléments bordés / 1083 côtés / 85 recettes sur les 25 cadres nominaux (`mesurer-filets.cjs`) |
| mécanisme | `Filets.Poser` + `Filets.Etat` (fond ET bord ensemble), recettes générées de la mesure, cerne = cas de `SpecFilet` |
| garde de classe | D6 (a) données (b) statique, aucun bord hors `Filets` (c) pixel de bord ≠ fond, épaisseur, pointillé > 0 transitions |
| propriété | `PiedDEcran.Cerner` reste à CLIENT-1 ; proposition de délégation après sa fusion |

## 1. Principe
Un écran ne CODE jamais son décor : il le DÉCLARE dans un catalogue unique (`DecorsDeScene`, ShellContracts), et UN constructeur (`DecorDeScene.Poser`) le monte. Retoucher la luminosité de ㉚ ou l'arrêt d'un dégradé = une ligne du catalogue, pas un contrôleur. Le gabarit `Tools/nouvel-ecran.py` émet l'appel ; une garde de classe interdit le fond plat.

## 2. Modèle déclaratif (ShellContracts, `MafiaCleanCity.Shell`)
```csharp
public enum SceneDeFond { District, Bar, Verge, VergeJour }
public enum StatutDecor { Pose, DejaLivre, NonMonte }                 // lu par D1/D2
public sealed class SpecDecor {                                       // immuable, une par écran
  public StatutDecor Statut;  public SceneDeFond Scene;  public float Luminosite;   // CSS brightness(b), 1 = rien
  public bool Voile;                                                   // le voile de scène (§3.2) : vrai pour 25 écrans, FAUX pour ③
  public float Bande;                                                  // part de la hauteur (CADRE) où la scène reste visible au-dessus du support ; 1 = ③
  public SpecSupport Support;                                          // null SEULEMENT pour ③
}
public sealed class SpecSupport { public SpecCouche[] Couches; public SpecFilet Cerne; public bool Enseigne; public Vector4 Rayon; }
public sealed class SpecFilet {                                         // L5 (§3.4) : un filet ou bord d'un bloc ; le CERNE de la famille A en est un cas (Inset, Lueur)
  public Cotes Cotes;  public float EpaisseurCss;  public StyleFilet Style;  public Teinte Couleur;  public float Rayon;  public float Inset;  public Teinte? Lueur;
}
public enum StyleFilet { Plein, Pointille, Tirete, Double }  [Flags] public enum Cotes { Haut=1, Droite=2, Bas=4, Gauche=8, Tous=15 }
public sealed class EtatDeBloc { public Teinte Fond; public SpecFilet Bord; }   // « bord d'état » : vert / or / neutre … (㉛ : pris, risque, neutre)
public static class Filets { public static GameObject Poser(RectTransform bloc, SpecFilet spec); public static void Etat(RectTransform bloc, Image fond, EtatDeBloc e); }
// SpecCouche, de la plus HAUTE à la plus basse (ordre CSS) :
//   Lineaire(angleDeg, Arret[]) | Radial(cx, cy, rx, ry, Arret[]) | RadialCercle(cx, cy, Arret[])   (RadialCercle = `circle farthest-corner` : le rayon est recalculé à CHAQUE changement de rect)
//   Radial : (cx, cy, rx, ry en fractions de la boîte du SUPPORT — celle qui PORTE le dégradé, comme les `%` de CSS —,
//     y depuis le HAUT ; les `%` mesurés se recopient tels quels ; un `circle farthest-corner` n'est PAS un (rx, ry) constant : voir `RadialCercle`, ⑮ ⑰)
//   `RadialCercle(cx, cy, Arret[])` : rayon r = √(max(cx·W, (1−cx)·W)² + max(cy·H, (1−cy)·H)²) sur le rect RÉEL (W×H) du support, recalculé à CHAQUE changement de rect (jamais seulement au montage : sous `ContentSlot`/LayoutGroup le rect n'est pas résolu à ce moment) ; rendu = UNE Image CARRÉE 2r×2r centrée en (cx·W, cy·H), clippée par le `RectMask2D` de `Decor/Support` (§3.3) — un vrai cercle, sans étirement)
//   | Plein(Teinte) | Points(pasPx, rayonPlein, rayonFin, Teinte, decalage)   (bord doux : plein → transparent) | Rayures(angleDeg, pasPx, epaisseurPx, Teinte)
public readonly struct Arret { float Pos; bool EnPx; Teinte Couleur; }        // Pos fraction, ou px CSS si EnPx (⑱)
public readonly struct Teinte { /* jeton NOMMÉ (lambda sur DesignTokens) OU "#rrggbb" + opacité CSS (alpha sRGB) */ }
public static class DecorDeScene { public static DecorPose Poser(Transform racineEcran, SpecDecor spec); }
public sealed class DecorPose : MonoBehaviour { RectTransform Scene, Support, Cerne; IReadOnlyList<RectTransform> Radiaux; }  // poignées stables
public static class DecorsDeScene { public static readonly SpecDecor Reputation = …, Vente = …, … }                // LE catalogue : 26 entrées
```
Le catalogue est la SEULE table de valeurs ; aucun contrôleur ne porte un chiffre de décor.

## 3. Les couches — recettes MESURÉES et traduction

### 3.1 Scène (L1) — 4 images, 4 gabarits de découpe
| scène | ressource client (`Resources`) | boîte source (px image) | `background-position` y (valeur MAJORITAIRE mesurée ; 8 valeurs au total : district 38/40/50/55/62, bar 12/30, verge 30, verge-jour 22 — toutes inertes en portrait) |
|---|---|---|---|
| District | `Scenes/scene_district_nuit` = COPIE de `Art/District/Backgrounds/VERGE_D_NUIT_FINAL.png` (1080×1920) | tout (9:16, comme 720×1280) | 50 % (16 des 20 cadres district mesurés ; 38 en ⑭, 40 en ③, 55 en ⑮ ⑰, 62 en ㉔) |
| Bar | `Scenes/sprite_environment_bar_nuit` (1080×1350) | tout (0,8 ; déjà ainsi chez ⑨) | 20 % |
| VergeJour | `Scenes/sprite_environment_verge_d_or_jour` (1728×1080) | (300,60)–(1500,1080) = `RevueDuJourDecor.BoiteSource` | 22 % |
| Verge (nuit) | `Scenes/verge_nuit_provisoire` = `assets/verge_nuit_provisoire.jpg` (900×765, md5 `facdc64c61…`, extrait de la maquette) — **PROVISOIRE**, dette « asset pleine résolution à commander à l'atelier » | tout | 30 % |
Découpe « cover » : `DecorAuComptoir.UvCouverture` (public, éprouvée) RÉUTILISÉE ; `PositionVerticale` n'agit que pour un écran plus LARGE que la boîte, jamais sur un téléphone portrait ≤ 9:16 (cf. §0 M2).

### 3.2 Luminosité et voile
- **Luminosité** : `RawImage.color = (b, b, b, 1)` sur la scène (b = 0,18…0,62 ; 1 = aucune) ; ressource de scène ABSENTE ⇒ `Color.black` (la règle « noir = rien n'est monté » de `DecorAuComptoir` gagne sur la luminosité). Prémisse (couleurs de sommets uGUI converties gamma→linéaire ⇒ produit sRGB = `brightness()`) vérifiée par la sonde D4 ; repli mesuré = voile noir d'alpha `1 − b` ajusté par `AlphaVoileSurFondQuelconque`.
- **Voile de scène** : `linear-gradient(180deg, #0a0f18cc 0, #0a0f1822 18%, #0a0f1800 40%, #0a0f1866 100%)`, identique sur **25 des 26 écrans — ③ n'en a pas** (mesuré : un seul cadre sans voile, le cadre 22 ; `SpecDecor.Voile = false` pour ③, `Decor/Voile` absent) ; teinte = `lieutenantGlassBottom` (d = 1,45) ; alphas par `AlphaVoileSurFondQuelconque` (fond inconnu : la scène varie) ; sprite `DegradeVertical` (180°, N arrêts : exactement son cas).

- **Amendement du 08/10 (CLIENT-2, mesuré au créneau) — prémisse M3 RÉFUTÉE.** La sonde D4a a mesuré **7,40/255** (pas ±2/255) entre la teinte `(b,b,b)` et `brightness(0,4)`. Cause établie par calcul : Unity compose en linéaire (pixel = γ(lin(b)·lin(c))), `brightness()` multiplie en sRGB, et avec la courbe sRGB par morceaux AUCUN facteur unique ne tient ±2/255 — résiduel minimal calculé 4,1 à 6,7/255 selon b (0,62 … 0,18) ; le repli « voile noir 1 − b » est le MÊME produit linéaire et ne fait pas mieux. Décision : la teinte reste ; D4a garde (1) le MÉCANISME à ±2/255 et (2) l'écart à `brightness()` borné à 8/255 — classe **C** (nuance de pixel), dette **TD-880** (seul un shader UI qui multiplie en sRGB le fermerait).

### 3.3 Support — trois familles, un vocabulaire
- **A (×7, fond propre à la racine)** : `Radial(0,5 ; 0,22 ; 0,72 ; 0,40 ; or@.15 → or@0 à 66 %)` · `Radial(0,5 ; 0,96 ; 0,90 ; 0,60 ; cyan@.07 → 0 à 70 %)` · `Lineaire(178°, #111823 0 % → #0b1016 54 % → #0d0f10 100 %)` ; teintes par jetons (§4.1). **Cerne** : trait 1 px laiton à 5 px du bord, rayon 3, liseré intérieur `#0b1016`, lueur `0 0 12px laiton@.15`. **Enseigne** : plaque `Lineaire(178°, #0b111b@.91 → #0d131e@.85)`, bordure 1 px `#2a3648`, filet bas 2 px laiton, liseré haut blanc@.06, marges 13/13/0 (le TEXTE reste à l'écran).
- **B (×9)** : 7 à fond propre à la racine (`Lineaire` 3 arrêts : ㉜ ㉚ ㉛ ㉝ ㉞ ㉙ ㉒) ; **㉓ et ㉘** (racine sans fond, enfants opaques) prennent le fond de leur zone la plus GRANDE (mesuré : `vitre` = 74,3 % de l'aire de ㉓, `planche` = 48,9 % de ㉘) : la meilleure approximation « au gros » ; les zones sœurs (`entete`, `lecture`, `bas`, `compt`, `voix`) restent du contenu d'écran avec leurs propres fonds, et un interstice montre ce support.
- **C (×10)** : le fond de l'objet, qui EST le fond de la racine (⑤ feutre radial opaque, ⑮⑰ liège radial opaque, ⑭ tôle `Points`+`Lineaire` 90°, ㉔ `Lineaire` 3 arrêts, ⑱ bureau à arrêt en px, ⑨ ⑩ ardoise `Plein`, ⑯ feuille `Plein`, ③ aucun) ; l'objet lui-même (punaises, vis, cadrans, abat-jour) reste dans le contrôleur.
- **Primitives (NEUVES, `ProceduralUI` / `ShellContracts`)** — pure `RayonCoinLePlusLoin(W, H, cx, cy)` ; `DegradeRadialCercle(Arret[])` (sprite carré, r = 1 au bord) ; composant **`CercleDeSupport`** (distinct du type de spec `RadialCercle` : même namespace `MafiaCleanCity.Shell`, deux types de même nom = CS0101), PORTÉ PAR `Decor/Support` : il lit SON rect (W×H du support), recalcule position et taille de chaque Image carrée enfant `Decor/Support/RadialCercle<n>` dans `OnRectTransformDimensionsChange` (même mécanisme que `DecorAuComptoir.cs:154-160`, avec le rect du support) ; `DegradeLineaire(angleDeg, Arret[], texture à l'aspect du cadre de référence 300×583)` — convention CSS (0° monte, 180° descend, sens horaire), N arrêts, arrêts en px convertis à la taille de la texture ; `DegradeRadial(cx, cy, rx, ry, Arret[])` — N arrêts opaques OU transparents, interpolation LINÉAIRE par arrêt (comme CSS), centre en coordonnées CSS ; `Points`/`Rayures` = tuile en `Image.Type.Tiled`. Cache unique, clé dérivée du contenu de la spec. **CLIP (obligatoire)** : `Decor/Support` porte TOUJOURS un `RectMask2D` (clip rectangulaire, sans `Graphic`) — toute couche plus grande que le support (l'Image carrée de `RadialCercle` mesure jusqu'à 908×908 pour un support 298×504) y est coupée ; si `Rayon > 0` : `Mask` + **`ProceduralUI.RoundedRectMask(tl, tr, br, bl)` — primitive NEUVE** (l'existante, `RoundedRectMask(int)`, `ProceduralUI.cs:1100`, n'a qu'UN rayon : ⑤ a 26/26/0/0, sa base touche le bas du cadre) ; 9-slice, bordure = le plus grand rayon. **Opacités** : le VOILE de scène (fond inconnu : la scène) passe par `AlphaVoileSurFondQuelconque` ; les halos de A, la plaque d'enseigne et la lueur du cerne se mélangent sur un fond CONNU (les arrêts du support lui-même) : leur alpha est ajusté pour ces fonds-là (`FondsDeReferenceSupport` = `#111823`, `#0b1016`, `#0d0f10`, via `CouleurPourMelangeLineaire`), et la sonde D4 mesure le pixel du foyer à ±6/255 du mélange CSS attendu (calculé en sRGB dans le test). Revue n°3 M4 : la docstring de `AlphaVoileSurFondQuelconque` l'optimise sur les fonds de l'écran principal, pas sur les supports.

### 3.4 L5 — Filets et bords d'état (classe mesurée par un juge groupé, 07/10)
**Le constat (juge, rapports `screen_c1`, `ecran_loi`, `ecran_appro` / `r-groupe-2026-10-07`)** : les FILETS du canon ne sont pas tracés — ㊳ : 0 bord `#2a3648` sur 9 blocs (référence ×3) ; ㉛ : les bords d'état vert `#4f7f3f` et or `#8a6a22` sont égaux au fond ; ㉚ : 4 filets pointillés du bon → 0. Les CTA et gestes, eux, portent leur bord à 1/255 (`PiedDEcran.Cerner`) : le client SAIT tracer un bord, il ne le fait pas sur les blocs.
**La mesure (Chromium, `mesurer-filets.cjs` → `mesure-filets.json`, TOUS les cadres des 26 écrans de l'INDEX — nominaux ET d'état —, 130 cadres)** : **1587 éléments bordés, 5511 côtés** (plein 5298 · tireté 144 · pointillé 45 · double 24), **137 recettes distinctes** (côtés, style, couleur, épaisseur), **87 couleurs de bord** distinctes. (08/10, ㊴ : cadres 150-151 ajoutés à l'index — 128 → 130 cadres, 1560 → 1587 éléments, 5403 → 5511 côtés ; chiffres antérieurs dans l'historique git. Sur les seuls 25 cadres nominaux : 312 / 1083 / 85 — chiffres de la v4, remplacés parce que les bords d'ÉTAT, p. ex. `#4f7f3f` de ㉛, ne sont que sur les cadres d'état.) Les plus fréquentes :
| côtés | style | couleur | épaisseur | éléments |
|---|---|---|---|---|
| 4 côté(s) | solid | `#2a3648` | 1 px | 377 |
| 4 côté(s) | solid | `#b08d3e` | 2 px | 145 |
| 4 côté(s) | solid | `#14171a` | 1 px | 99 |
| 4 côté(s) | solid | `#b08d3e` | 1 px | 81 |
| 1 côté(s) | solid | `#2c3640` | 2 px | 44 |
| 4 côté(s) | solid | `#5a4a2a` | 1 px | 44 |
| 4 côté(s) | solid | `#1f2a3a` | 1 px | 27 |
| 4 côté(s) | solid | `#1f2a3a@0.4` | 1 px | 27 |
(la couleur `#2a3648` à elle seule porte 1485 côtés ; les filets pointillés de ㉚ = `#c3b79e` 1 px haut ×4 ; `.cerne` laiton = 4 côtés, 1 px, rayon 3 : mesuré sur les 7 `.cerne`). Les bords d'ÉTAT de ㉛ : `.pris` fond `#22301f` bord `#4f7f3f`, `.risque` fond `#2e2114` bord `#8a6a22`, neutre bord `#303a44`.
**Mécanisme** : `Filets.Poser(bloc, SpecFilet)` ajoute au bloc un conteneur `Filets` (nom figé, distinct du `Cerne` de `PiedDEcran.Cerner`) portant 1 à 4 `Image` de côté `Filets/Haut|Droite|Bas|Gauche` (`ignoreLayout`, `raycastTarget = false`, **ni `CanvasGroup` ni `Canvas`**, `CanvasRenderer` ajouté EXPLICITEMENT), épaisseur = `EchelleMaquette.PxTrait(EpaisseurCss, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6)` (l'échelle EXISTANTE du dépôt : largeur du canvas / 300 ; 1280 n'en est que le repli — plus de constante K), couleur par `Teinte` (jeton si d ≤ 4, §4.1) ; `Pointille`/`Tirete` = tuile `Tiled` (50 % de remplissage mesuré par le juge) ; `Rayon > 0` sur 4 côtés = `ProceduralUI.RoundedRectOutline` / `RoundedRectDashedOutline` (existants) ; `Double` = deux traits ; `Inset`/`Lueur` = le cerne (A). `Filets.Etat(bloc, fond, EtatDeBloc)` pose fond ET bord ENSEMBLE (c'est ce qui rend « bord = fond » impossible : un état sans bord distinct est refusé à la construction). `PiedDEcran.Cerner` (CLIENT-1) reste son propriétaire ; on lui proposera de DÉLÉGUER à `Filets` après sa fusion (une seule implémentation du trait).
**Déclaration** : les recettes de chaque écran sont GÉNÉRÉES de la mesure (`generer-filets.py` → `DecorsDeSceneFilets.cs`, partie du catalogue, régénérable) sous des noms par écran ; un contrôleur ne porte ni couleur ni épaisseur de bord, il appelle `Filets.Poser(bloc, DecorsDeScene.Filets.<Ecran>.<Nom>)`.

## 4. Catalogue (26 entrées ; ⑰ = ⑮, même cadre) — `#hex{jeton}` = la couleur est écrite PAR LE JETON nommé (d ≤ 4, §4.1) ; les autres hex sont des littéraux admis ; colonne cerne = cerne + enseigne (A)
| sym | écran | statut | scène | lum. | bande | racine mesurée | cerne | fond |
|---|---|---|---|---|---|---|---|---|
| ③ | CityMap | DéjàLivré | district | 0.4 | 100 % | barre | — | — (scène seule, Bande = 100 %, **sans voile** : `Voile = false`) |
| ⑤ | DecisionDetail | Posé | verge | 1 | 34 % | tapis-feutre | — | `radial-gradient(90% 60% at 50% 30%, #2f6e4c, #17402d 60%, #0a2318)` |
| ⑯ | DailyReview | DéjàLivré | verge-jour | 1 | 19 % | feuille | — | `couleur #efe4c6` |
| ㊲ | Reputation | Posé | district | 0.24 | 21 % | rep6 | oui | **A** (§3.3) |
| ㉟ | Selling | Posé | district | 0.24 | 21 % | vnt6 | oui | **A** (§3.3) |
| ㉓ | Shop | Posé | district | 0.24 | 21 % | vitr6 | — | `linear-gradient(168deg, #151b23 0%, #0f141a{mapDialogBg} 46%, #0c1015{hudGaugeFaceOuter} 100%)` (la `vitre`, zone dominante ; racine sans fond) |
| ⑮ | Inspection | Posé | district | 0.45 | 10 % | corkboard | — | `RadialCercle(0,30 ; 0,20 ; #8a6a3a 0 → #6b4f28 60 % → #513a1c 100 %)` (`circle farthest-corner`, rayon recalculé à chaque changement de rect : mesuré 454,0 px au cadre 31 [298×504,05], 382,0 px aux cadres 33-35 [298×400]) |
| ⑰ | Precinct (même cadre que ⑮) | Posé | district | 0.45 | 10 % | corkboard | — | `RadialCercle(0,30 ; 0,20 ; mêmes arrêts que ⑮)` |
| ⑭ | Compression | Posé | district | 0.62 | 35 % | tole | — | `radial-gradient(circle, #4a5057 1.4px, #000000@0 1.9px), linear-gradient(90deg, #2a2e33 0px, #23272b{surfaceRow} 50%, #2a2e33 100%)` — `Points` : pas 26 px, décalage 0 (mesuré `background-size: 26px 26px`) |
| ㊴ | Forensic | Posé | district | 0.24 | 21 % | dos6 | oui | **A** (§3.3) |
| ㊳ | Journal | Posé | district | 0.24 | 21 % | jrn6 | oui | **A** (§3.3) |
| ㊵ | Filiere | Posé | district | 0.24 | 21 % | bln6 | oui | **A** (§3.3) |
| ㉒ | Profile | Posé | district | 0.24 | 21 % | cofr6 | — | `linear-gradient(158deg, #333c46 0%, #232a32{nightOutOfDistrictMuted} 42%, #1a2027{lieutenantMutedDeep} 100%)` |
| ㊱ | Horizon | Posé | district | 0.24 | 21 % | hrz6 | oui | **A** (§3.3) |
| ㉜ | Delegation | Posé | district | 0.18 | 21 % | serv6 | — | `linear-gradient(#1d2229, #161a20 58%, #121519{mapDialogBg})` |
| ㉚ | ChaineDAppro | Posé | district | 0.2 | 21 % | appr6 | — | `linear-gradient(#1c1a17{readableTextDark}, #151310 60%, #111014)` |
| ㉘ | Distribution | Posé | district | 0.24 | 21 % | lieg6 | — | `Points(pas 9 ; plein r 1,1 → fin r 1,2 ; #000000@.133 ; décalage 0,0)` + `Points(pas 13 ; plein r 0,9 → fin r 1,0 ; #ffffff@.08 ; décalage 4,6)` + `Lineaire(158°, #9a774b 0 → #7b5c37 62 % → #654a2c 100 %)` sur `Plein #8a6a42` (la `planche`, zone dominante ; racine sans fond) |
| ㉛ | Loi | Posé | district | 0.18 | 21 % | parl6 | — | `linear-gradient(#1b1f24{lieutenantMutedDeep}, #14181d{surfaceCard} 58%, #101317)` |
| ㉝ | Demolition | Posé | district | 0.18 | 21 % | demo6 | — | `linear-gradient(#20211d, #191a17{readableTextDark} 58%, #141513)` |
| ㉞ | Carnet | Posé | district | 0.18 | 21 % | carn6 | — | `linear-gradient(#1e1c19, #181614 58%, #131211)` |
| ㉙ | Conflit | Posé | district | 0.2 | 21 % | cfl6 | — | `linear-gradient(#2a1e14, #1d1610 46%, #141014)` |
| ⑨ | ExceptionQueue | DéjàLivré | bar | 1 | 29 % | ardoise-p | — | `couleur #1d2124` |
| ⑩ | ExceptionDetail | DéjàLivré | bar | 1 | 11 % | ardoise-p | — | `couleur #1d2124` |
| ㉔ | AutonomyInbox | Posé | district | 0.45 | 10 % | burner | — | `linear-gradient(#3a3f47, #22262b 40%, #15181c{surfaceCard})` |
| ㉑ | Market (non monté) | NonMonté | district | 0.24 | 21 % | mar6 | oui | **A** (§3.3) |
| ⑱ | AppShell.MonterMenuPlus | Posé | bar | 0.55 | 12 % | bureau | — | `linear-gradient(#5a2e16, #3a1c0e 18px, #2b120c 18px)` |

Comptes : 26 entrées — **Posé 21 · DéjàLivré 4 (⑨ ⑩ ⑯ : zinc de `DecorAuComptoir`, non migrés ici ; ③ : la ville peinte) · NonMonté 1 (㉑)**.

**Amendement du 08/10 (CLIENT-2, VALIDÉ par f2 le 08/10) — ③ passe de Posé à DéjàLivré.** Mesuré dans `CityMapController` (l. 104-110, 420-435) : ③ monte déjà sa VILLE PEINTE (`Resources/CityMap/carte_ville_nuit`, texture plein cadre EXTRAITE du cadre ③·22, 18 ancres de districts, gardée par `CarteVillePlayModeTests`). Poser le décor y aurait chargé `scene_district_nuit` SOUS la ville peinte — une autre image, invisible, 2,8 Mo, deux vérités pour une même scène. La ligne ③ reste au catalogue (périmètre D1) avec ses valeurs mesurées. Comptes AVANT → APRÈS : Posé 22 → 21 · DéjàLivré 3 → 4 · NonMonté 1 → 1. Hors catalogue (décision f2) : ④ ⑥ ⑪ ㉕ ⑲ ① ② ⑬ ⑳.

### 4.1 Teintes — la garde TD-612 tranchée (`teintes.py` → `teintes.json` ; lit les 75 jetons de `DesignTokens.asset`, TOUTES les couleurs écrites au catalogue (§3.2-§4) et TOUTES les couleurs de bord mesurées)
<!-- 4.1:DEBUT (régénéré par maj-design.py ; vérifié par verifier-design.py) -->
**138 couleurs : 31 à d ≤ 4 d'un jeton (écrites PAR le jeton ; dérive ≤ 3,62/255, « le prix de la règle », précédent `DecorAuComptoir`) · 107 littéraux admis (d > 4)** — la liste complète des littéraux est dans `teintes.json` (`regle = littéral`).
| couleur | jeton | d |
|---|---|---|
| `#0a0d10` | `scrimBackdrop` | 3.16 |
| `#0a0f18` | `lieutenantGlassBottom` | 1.41 |
| `#0b1016` | `hudGaugeFaceOuter` | 2.24 |
| `#0b111b` | `hudBarGlassTop` | 0.0 |
| `#0c1015` | `hudGaugeFaceOuter` | 3.0 |
| `#0d0f10` | `surfaceBase` | 0.0 |
| `#0d131e` | `hudBarGlassBottom` | 0.0 |
| `#0f141a` | `mapDialogBg` | 3.61 |
| `#111823` | `lieutenantMedallionOuter` | 3.0 |
| `#121519` | `mapDialogBg` | 3.16 |
| `#14171a` | `surfaceCard` | 3.0 |
| `#14181d` | `surfaceCard` | 3.0 |
| `#15181c` | `surfaceCard` | 1.73 |
| `#191a17` | `readableTextDark` | 3.16 |
| `#1a2027` | `lieutenantMutedDeep` | 3.16 |
| `#1b1f24` | `lieutenantMutedDeep` | 1.0 |
| `#1c1a17` | `readableTextDark` | 3.61 |
| `#1d2124` | `lieutenantMutedDeep` | 3.61 |
| `#23272b` | `surfaceRow` | 3.61 |
| `#232a2d` | `surfaceRow` | 0.0 |
| `#232a32` | `nightOutOfDistrictMuted` | 3.0 |
| `#2b2f3a` | `surfaceRaised` | 3.0 |
| `#7db36a` | `accentCalm` | 0.0 |
| `#7fd4d9` | `hudGaugeArcCold` | 0.0 |
| `#b08d3e` | `hudHairlineGold` | 0.0 |
| `#b9ac92` | `hudCremeSecondary` | 1.0 |
| `#d9ab4e` | `hudMoneyUnderlineGold` | 0.0 |
| `#e0664a` | `hudGaugeArcHot` | 0.0 |
| `#f2c96b` | `hudMoneyGold` | 0.0 |
| `#ff5a4d` | `accentDanger` | 0.0 |
| `#ff9e3d` | `accentWarning` | 0.0 |
<!-- 4.1:FIN -->

## 5. Pose par le gabarit
1. `DecorDeScene.Poser(racine, DecorsDeScene.X)` : `Decor` = PREMIER enfant de la racine d'écran, `ignoreLayout`, étiré (contrat de `DecorAuComptoir.Construire`). Le décor s'étire sur la RACINE qu'il reçoit. Pour 21 des 22 écrans `Posé` c'est `ContentSlot`, plein canvas SOUS les barres (`AppShell.cs:2011-2016`) : les fractions de `Bande` mesurées sur le cadre valent telles quelles. **Exception ⑱** : `MonterMenuPlus` inset `MenuPlus` de `ShellChrome.BottomInsetPx`/`TopInsetPx` (`AppShell.cs:1337-1344`) : la `Bande` de ⑱ s'applique à CE rect (consigné §9).
2. **`Decor/Capteur`** (Image alpha 0, `raycastTarget = true`, pleine zone) est le PREMIER enfant du décor : il garde le bloqueur de raycast que portait le fond plat opaque (précédent documenté : `AppShell.cs:904-912`, garde de raycast « rouge à sa première version » pour `DashboardBackdrop`) ; **pour ⑱, qui n'avait AUCUN fond (`MonterMenuPlus` n'ajoute pas d'`Image`), le Capteur est un AJOUT : un menu plein cadre ne laisse plus cliquer à travers (changement assumé, sonde D4)** ; toutes les autres couches sont `raycastTarget = false`.
3. Le contrôleur SUPPRIME son fond plat (`AjouterFond(racine, surfaceBase|FondBas|Encre)` ; `voile.color = surfaceBase` aux contrôleurs qui le posent à la racine) — cette liste est celle que D2 balaie, contrôleur par contrôleur, pas un fait supposé pour les 22.
4. Hors shell (tests isolés), `Poser` fonctionne sous un canvas quelconque (`CanvasRacine`) ; sans ressource de scène la scène reste NOIRE, jamais blanche (règle de `DecorAuComptoir`).
5. `Tools/nouvel-ecran.py` émet `DecorDeScene.Poser(racine, DecorsDeScene.<Pascal>)` ; un écran neuf ajoute UNE entrée au catalogue (ou un statut nommé).

6. **Amendement du 08/10 (CLIENT-2, VALIDÉ par f2 le 08/10) — le CONTENU sous la bande.** Le §5 posait le décor sur la racine sans placer le contenu : les piles des contrôleurs commencent sous la barre du haut (≈ 10 % de l'écran) alors que la maquette pose le panneau sous une bande de scène de `Bande` (21 % pour A/B, 10 % pour ⑮ ⑰ ㉔…) ; l'enseigne et les premiers blocs flottaient sur la scène (un A). **`DecorDeScene.ReserverLaBande(pile, decor, marge)`** (composant `ReserveDeBande` sur la pile racine) : `padding.top = max(ShellChrome.TopInsetPx, Bande × hauteur réelle) + marge` (la marge que le contrôleur posait), recalculé à CHAQUE changement de rect. Coût : ≈ 11 % de hauteur de contenu pour A/B, fidèlement à la maquette. **Garde** (D4i) : la pile commence sous max(barre, bande) aux DEUX résolutions du dépôt (9:16 ≈ 1080×1920 et 9:20 ≈ 1080×2400) et après un redimensionnement. **Conditions de f2 à la pose** : (a) aucun contenu coupé sans défilement après la perte de hauteur (les listes longues passent par `ListeDefilante`, CLIENT-1) ; (b) un geste principal repoussé sous la ligne de flottaison est un A, signalé à f2.

## 6. Gardes (structurelles AVANT les gardes de valeur — socle CLIENT)
- **D0 structurelle** : `Decor/Support` porte un `RectMask2D` (ou `Mask` si `Rayon > 0`) ; tout `Graphic` du décor porte son `CanvasRenderer` (ajouté EXPLICITEMENT : `AddComponent` à l'exécution n'honore pas `[RequireComponent]` ; sans lui rien ne dessine et la console est muette) ; tout `Graphic` sous un `Mask`/`RectMask2D` est un `MaskableGraphic` (`Image`, `RawImage`) ; l'ordre de fratrie `Capteur` → `Scene` → `Voile` → `Support` est celui déclaré. Rendre et COMPTER les pixels (une garde de paramètres n'est pas une garde d'effet).
- **D1 catalogue = périmètre** : exactement les écrans de `Tools/juge-visuel/INDEX.md` qui ont des cadres de `ecrans-brennar-6.html` (26) ; chacun a une entrée avec son Statut ; contrôle positif (écran retiré ⇒ rouge).
- **D2 pose** : pour chaque entrée `Statut = Pose`, le contrôleur appelle `DecorDeScene.Poser` et ne garde aucun fond plat à la racine (balayage de code chaînes/commentaires, comme `ClientHttpPlayModeTests` G1) ; `DejaLivre`/`NonMonte` : aucune exigence ; contrôle positif.
- **D3 valeurs** : aucune de ces FORMES dans un contrôleur : `"Scenes/…"`, `brightness`, `"#rrggbb"`, `0xRRGGBB`, `new Color(` à flottants dans un appel de décor ; le catalogue lui-même : aucun littéral à d ≤ 4 (la garde TD-612 le voit déjà ; D3 le dit à voix haute avec `teintes.json`).
- **D4 comportement (PlayMode, hors réseau, 540×960 portrait, RenderTexture + Canvas ScreenSpace-Camera du test)** : `Poser` crée les couches déclarées sous leurs noms ; **luminosité** : pixel de scène × b à ±2/255 ; **A** : haut-centre plus chaud que le bord (halo or), bas-centre plus froid (halo cyan), centre ≠ `surfaceBase` plat, cerne à 5 px du bord ; **radial** : pixel du foyer à la bonne hauteur (convention Y) ; **B** : arrêts attendus ; **clip** : zéro pixel de support hors du rect du support (sonde sur une ligne juste hors rect, avec un `RadialCercle` dont l'Image dépasse) ; **cercle** : après un redimensionnement du support, pixel du coin le plus loin = dernier arrêt ; **raycast** : `RaycastAll` au centre rend `Capteur` (ou un élément au-dessus) ; verge nuit : repli chargé. Juge le décor SEUL (le bandeau se juge sur planche).
- **D6 filets (classe)** : (a) *données* : les recettes de `DecorsDeSceneFilets` par écran = les recettes distinctes de `mesure-filets.json`, mesurées sur TOUS les cadres de l'écran dans l'INDEX (nominal + états : ㉛ `.pris` cadre 68, `.risque` cadres 68/71…), régénération sans écart ; (b) *statique* : tout contrôleur `Posé` référence CHAQUE recette de son écran (aucun orphelin) et ne dessine aucun bord de bloc hors de `Filets` (balayage de code comme G1 : pas d'`AjouterFond` de couleur de bord, pas de `RoundedRectOutline` direct pour un bloc du catalogue) ; contrôle positif ; (c) *comportement* : `Filets.Poser` sur un rect de test : pixel de bord = couleur déclarée **et ≠ fond** (la mesure du juge : « bord = fond »), épaisseur = `PxTrait(EpaisseurCss, …)` ± 1 px sur la racine de test, pointillé : > 0 transition sur le bord (juge : 4 → 0) ; remplissage 50 % ± 10 % mesuré pour `#c3b79e` (le juge), PAS supposé pour `Tirete`, `Etat` refuse un bord égal au fond.
- **D5 assets** : chaque `SceneDeFond` a sa ressource (verge nuit marquée PROVISOIRE : dette datée).
- Primitives : un test de pixels chacune (`DegradeLineaire` 178°/158°/90° à 3 arrêts ; `DegradeRadial` opaque à 3 arrêts, foyer et rayon ; **`RayonCoinLePlusLoin`** : 298×504,05 → 454,0 et 298×400 → 382,0 (cx 0,30 ; cy 0,20), et r ≥ la distance du foyer à chacun des 4 coins ; **`DegradeRadialCercle`** : 128×128, r = 1 au bord, t > 1 = dernier arrêt).

## 7. Animation (CLIENT-3) — contrat
Ce lot est STATIQUE. Mesure de CLIENT-3 (Chromium, `inventaire-animations.md` @ed46eb92) : AUCUN halo des supports A/B/C n'est animé en maquette ; le seul `.halo` animé est le pin de ③ (absent du client). Contrat adopté : noms figés `Decor/Capteur`, `Decor/Scene`, `Decor/Voile`, `Decor/Support`, `Decor/Support/Radial0..n`, `Decor/Cerne` ; **`Decor/Support` = RectTransform stable aux bornes du panneau** (course de la ligne `*6-scan`, que CLIENT-3 crée dans le contrôleur) ; **AUCUN `CanvasGroup` ni `Canvas` sur ces couches** (sa régie ajoute le sien) ; `Cerne` et chaque `Radial` **hors de tout LayoutGroup**, chacun dans son RectTransform ; les lampes ⑨ ⑩ ⑱ restent chez `DecorAuComptoir`/le contrôleur (attachées par nom).

## 8. Coordination et propriété de fichiers (règle f2 : un propriétaire par contrôleur)
CLIENT-1 tient liste, pied et défilement des mêmes contrôleurs (`ListeDefilante`, `PiedDEcran`). Le décor ne touche que la RACINE (une ligne d'appel + suppression du fond plat) : je fusionne après lui, contrôleur par contrôleur, en l'annonçant avant ; aucun fichier n'est écrit sans son feu vert.

## 9. Hors de ce lot (consigné, pas traité — ruling « nuances à la fin »)
`blur(1px)` de ③ et `sepia(.18)` de ⑭ ; inclinaison de la feuille ⑯ (−0,6°) ; `perspective/rotateX` du plateau ; ombres portées et `inset` ; liseré/ombre interne de `planche` ; textures bitmap de `Tools/fal` (non utilisées par la série 6) ; états : 103 cadres d'état comparés au nominal (`inv3`), support IDENTIQUE sur 99 ; 4 DIFFÈRENT — ⑮ cadre 32 (`listing`, papier), ㉒ cadre 97 (`cofr6.dense`), ㉙ cadres 65-66 (`tabl6`, cadres « v1 ») : consignés, non traités (classe C) ; écran paysage/tablette (`PositionVerticale` y agirait) ; `Bande` ancrée au HAUT du support : `corkboard` finit 18 px avant le bas du cadre, `burner` 12 px après (consigné) ; effet du bandeau sur la bande (la barre du haut mange 10,3 % du cadre : ⑮ ⑰ ㉔ ne laissent que ≈ 0,2 pt de scène libre, ⑩ 0,6 pt, ⑱ 2,1 pt (et ⑱ sur un rect inset)) — à juger sur la première planche ; dédoublonnage de la copie `scene_district_nuit` (+2,8 Mo).

## 10. Questions ouvertes
Q1 catalogue statique C# (garde TD-612 et tests lisent le code) plutôt que `ScriptableObject` : retenu. Q3 coût mémoire (~40 sprites générés, textures 128×256 pour les dégradés angulaires) : à mesurer au code, borne à fixer.
