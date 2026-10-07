# Décor de scène — DESIGN du mécanisme commun (CLIENT-2, 07/10/2026) — v2

**Statut : v2 après revue ⊥ n°1 (4 BLOCKING, 5 MAJOR, 7 MINOR — toutes traitées ci-dessous). Aucun code écrit.** Entrées : `INVENTAIRE.md` (mesures de la maquette série 6), décisions f2 du 07/10 (périmètre = les 26 écrans qui ont une maquette série 6 ; objets de la famille C = contenu d'écran, seuls leurs FONDS entrent ici ; verge nuit en repli temporaire ; le décor se pose par le gabarit, de façon déclarative ; ruling user « le gros, fidèle, les nuances à la fin »).

## 0. Réponses à la revue ⊥ n°1 (chaque point : décision, et la commande ou mesure qui l'établit)
| # | constat | décision v2 |
|---|---|---|
| B1 | `LinearGradient` = 2 arrêts, `DegradeVertical` = 180° seulement, `VoileRadial` = 1 teinte : A (178°, 3 arrêts), ㉒ (158°), ⑤ ⑮ ⑰ (radiaux opaques 3 arrêts) inconstructibles | **Deux primitives NEUVES** dans `ProceduralUI` (§3.3) : `DegradeLineaire(angle, Arret[])` et `DegradeRadial(…, Arret[])`, N arrêts, test de pixels chacune. Le design n'annonce plus de réutilisation de ces trois. |
| B2 | 18 couleurs du catalogue sous le seuil TD-612 (d ≤ 4) | **Tranché valeur par valeur** : `teintes.py` → `teintes.json` (75 jetons lus dans `DesignTokens.asset`) : 18 couleurs PAR JETON (table §4.1), 30 littéraux admis (d > 4). Règle : la garde existante prime, la dérive (≤ 3,6/255) est écrite au catalogue. |
| B3 | 25 lignes pas 26 (⑰ absent) ; D1/D2 rouges par construction | ⑰ ajouté ; colonne **Statut** (Posé 22 · DéjàLivré 3 : ⑨⑩⑯ · NonMonté 1 : ㉑) lue par D1 et D2 (§6). |
| B4 | supprimer le fond plat supprime le bloqueur de raycast (`AppShell.cs:904-912`) | `Poser` crée **`Decor/Capteur`** : Image pleine zone, alpha 0, `raycastTarget = true`, premier enfant ; D4 ajoute une sonde de raycast (§6). |
| M1 | ㉓ ㉘ n'ont pas de fond propre : B = 7 pas 9 ; `Bande` si `Support` null ? | B (fond propre à la racine) = **7** ; ㉓ ㉘ prennent comme support le fond de leur zone DOMINANTE (`vitre`, `planche`, §4) ; `Support == null` n'existe que pour ③ (`Bande = 1`). |
| M2 | `background-position y` : 5 valeurs mesurées, `SpecDecor` n'en a aucune | **Prémisse tranchée par calcul** : `UvCouverture` n'emploie `PositionVerticale` que si `aspectEcran ≥ aspectBoite` ; boîtes : district 0,5625 · bar 0,8 · verge(-jour) 1,176 ; un téléphone portrait ≤ 9:16 (0,5625) est donc toujours dans la branche SANS liberté verticale (aspect égal ⇒ `y0 = b.y`). Une valeur par SCÈNE (constante), pas de champ par écran ; cas paysage/tablette consigné (§9). |
| M3 | « identité algébrique » surévaluée pour `AlphaVoileSurFondQuelconque` | **Abandonné** : la luminosité est une teinte `RawImage.color = (b,b,b,1)` (les couleurs de sommets uGUI sont converties gamma→linéaire : un produit en sRGB, ce que fait `brightness()`). Prémisse falsifiable : **sonde D4** (pixel de scène × b à ±2/255). Repli si la sonde rougit : voile noir `1 − b` + ajustement, mesuré. |
| M4 | convention Y du `Radial`, extinction cosinus vs linéaire | `Radial` se déclare en coordonnées **CSS (y depuis le HAUT)** ; le constructeur convertit en UV (y depuis le bas) ; `DegradeRadial` est LINÉAIRE par arrêts (comme CSS) — le cosinus de `VoileRadial` n'est plus utilisé ici. Test : pixel du foyer. |
| M5 | rayon de coin, tuile px, arrêts en px | `SpecSupport.Rayon` (⑤ 26/26/0/0, ⑯ 3) via `Mask` + `RoundedRectMask` ; `Points/Rayures.Pas` en px CSS (⑭ 26) ; `Arret` accepte `Px` (⑱ 18 px, double arrêt dur). |
| m1 | clé de cache fournie par l'appelant | clé **dérivée du contenu** de la spec (comme `lingrad:` / `voile:`). |
| m2 | D4 sans taille ; canvas de repli paysage | D4 rend à **540×960 portrait** (RenderTexture + Canvas ScreenSpace-Camera propre au test), pas via le repli 1280×720. |
| m3 | D4 « bande visible » sans chrome | dit : D4 juge le DÉCOR seul ; l'effet du bandeau se juge sur planche (§9). |
| m4 | `VERGE_D_NUIT_FINAL.png` hors `Resources` : déplacer ou copier ? | **COPIE** sous `Assets/Art/Scenes/Resources/Scenes/scene_district_nuit.png` (le `.json` d'ancrage voisin et la référence de `DistrictBackgroundSlots` ne bougent pas) ; dette « dédoublonner (+2,8 Mo) ». |
| m5 | md5 du jpeg introuvable | **Commité** : `assets/verge_nuit_provisoire.jpg` (md5 `facdc64c611e3ef415dfbfb29b45226a`). |
| m6 | D3 sans forme de littéral | D3 liste les formes : `"#rrggbb"`, `0xRRGGBB`, `new Color(` à flottants, `"Scenes/…"`, `brightness`. |
| m7 | les fonds C SONT le fond de la racine ; `Peindre` inutile | **`Peindre` supprimé** ; le besoin réel est `Rayon`. |

## 1. Principe
Un écran ne CODE jamais son décor : il le DÉCLARE dans un catalogue unique (`DecorsDeScene`, ShellContracts), et UN constructeur (`DecorDeScene.Poser`) le monte. Retoucher la luminosité de ㉚ ou l'arrêt d'un dégradé = une ligne du catalogue, pas un contrôleur. Le gabarit `Tools/nouvel-ecran.py` émet l'appel ; une garde de classe interdit le fond plat.

## 2. Modèle déclaratif (ShellContracts, `MafiaCleanCity.Shell`)
```csharp
public enum SceneDeFond { District, Bar, Verge, VergeJour }
public enum StatutDecor { Pose, DejaLivre, NonMonte }                 // lu par D1/D2
public sealed class SpecDecor {                                       // immuable, une par écran
  public StatutDecor Statut;  public SceneDeFond Scene;  public float Luminosite;   // CSS brightness(b), 1 = rien
  public float Bande;                                                  // part de la hauteur (CADRE) où la scène reste visible au-dessus du support ; 1 = ③
  public SpecSupport Support;                                          // null SEULEMENT pour ③
}
public sealed class SpecSupport { public SpecCouche[] Couches; public SpecCerne Cerne; public bool Enseigne; public Vector4 Rayon; }
// SpecCouche, de la plus HAUTE à la plus basse (ordre CSS) :
//   Lineaire(angleDeg, Arret[]) | Radial(cx, cy, rx, ry, Arret[])   (cx, cy, rx, ry en fractions, y depuis le HAUT comme en CSS)
//   | Plein(Teinte) | Points(pasPx, rayonPx, Teinte, decalage) | Rayures(angleDeg, pasPx, epaisseurPx, Teinte)
public readonly struct Arret { float Pos; bool EnPx; Teinte Couleur; }        // Pos fraction, ou px CSS si EnPx (⑱)
public readonly struct Teinte { /* jeton NOMMÉ (lambda sur DesignTokens) OU "#rrggbb" + opacité CSS (alpha sRGB) */ }
public static class DecorDeScene { public static DecorPose Poser(Transform racineEcran, SpecDecor spec); }
public sealed class DecorPose : MonoBehaviour { RectTransform Scene, Support, Cerne; IReadOnlyList<RectTransform> Radiaux; }  // poignées stables
public static class DecorsDeScene { public static readonly SpecDecor Reputation = …, Vente = …, … }                // LE catalogue : 26 entrées
```
Le catalogue est la SEULE table de valeurs ; aucun contrôleur ne porte un chiffre de décor.

## 3. Les couches — recettes MESURÉES et traduction

### 3.1 Scène (L1) — 4 images, 4 gabarits de découpe
| scène | ressource client (`Resources`) | boîte source (px image) | `background-position` y (constante de scène) |
|---|---|---|---|
| District | `Scenes/scene_district_nuit` = COPIE de `Art/District/Backgrounds/VERGE_D_NUIT_FINAL.png` (1080×1920) | tout (9:16, comme 720×1280) | 38 % |
| Bar | `Scenes/sprite_environment_bar_nuit` (1080×1350) | tout (0,8 ; déjà ainsi chez ⑨) | 20 % |
| VergeJour | `Scenes/sprite_environment_verge_d_or_jour` (1728×1080) | (300,60)–(1500,1080) = `RevueDuJourDecor.BoiteSource` | 22 % |
| Verge (nuit) | `Scenes/verge_nuit_provisoire` = `assets/verge_nuit_provisoire.jpg` (900×765, md5 `facdc64c61…`, extrait de la maquette) — **PROVISOIRE**, dette « asset pleine résolution à commander à l'atelier » | tout | 30 % |
Découpe « cover » : `DecorAuComptoir.UvCouverture` (public, éprouvée) RÉUTILISÉE ; `PositionVerticale` n'agit que pour un écran plus LARGE que la boîte, jamais sur un téléphone portrait ≤ 9:16 (cf. §0 M2).

### 3.2 Luminosité et voile
- **Luminosité** : `RawImage.color = (b, b, b, 1)` sur la scène (b = 0,18…0,62 ; 1 = aucune). Prémisse (couleurs de sommets uGUI converties gamma→linéaire ⇒ produit sRGB = `brightness()`) vérifiée par la sonde D4 ; repli mesuré = voile noir d'alpha `1 − b` ajusté par `AlphaVoileSurFondQuelconque`.
- **Voile de scène** : `linear-gradient(180deg, #0a0f18cc 0, #0a0f1822 18%, #0a0f1800 40%, #0a0f1866 100%)`, identique partout ; teinte = `lieutenantGlassBottom` (d = 1,41) ; alphas par `AlphaVoileSurFondQuelconque` (fond inconnu : la scène varie) ; sprite `DegradeVertical` (180°, N arrêts : exactement son cas).

### 3.3 Support — trois familles, un vocabulaire
- **A (×7, fond propre à la racine)** : `Radial(0,5 ; 0,22 ; 0,72 ; 0,40 ; or@.15 → or@0 à 66 %)` · `Radial(0,5 ; 0,96 ; 0,90 ; 0,60 ; cyan@.07 → 0 à 70 %)` · `Lineaire(178°, #111823 0 % → #0b1016 54 % → #0d0f10 100 %)` ; teintes par jetons (§4.1). **Cerne** : trait 1 px laiton à 5 px du bord, rayon 3, liseré intérieur `#0b1016`, lueur `0 0 12px laiton@.15`. **Enseigne** : plaque `Lineaire(178°, #0b111b@.91 → #0d131e@.85)`, bordure 1 px `#2a3648`, filet bas 2 px laiton, liseré haut blanc@.06, marges 13/13/0 (le TEXTE reste à l'écran).
- **B (×9)** : 7 à fond propre à la racine (`Lineaire` 3 arrêts : ㉜ ㉚ ㉛ ㉝ ㉞ ㉙ ㉒) ; **㉓ et ㉘** (racine sans fond, enfants opaques) prennent le fond de leur zone DOMINANTE (`vitre`, `planche`) — c'est ce qui couvre tout interstice ou état vide.
- **C (×10)** : le fond de l'objet, qui EST le fond de la racine (⑤ feutre radial opaque, ⑮⑰ liège radial opaque, ⑭ tôle `Points`+`Lineaire` 90°, ㉔ `Lineaire` 3 arrêts, ⑱ bureau à arrêt en px, ⑨ ⑩ ardoise `Plein`, ⑯ feuille `Plein`, ③ aucun) ; l'objet lui-même (punaises, vis, cadrans, abat-jour) reste dans le contrôleur.
- **Primitives (NEUVES, `ProceduralUI`)** : `DegradeLineaire(angleDeg, Arret[], texture à l'aspect du cadre de référence 300×583)` — convention CSS (0° monte, 180° descend, sens horaire), N arrêts, arrêts en px convertis à la taille de la texture ; `DegradeRadial(cx, cy, rx, ry, Arret[])` — N arrêts opaques OU transparents, interpolation LINÉAIRE par arrêt (comme CSS), centre en coordonnées CSS ; `Points`/`Rayures` = tuile en `Image.Type.Tiled`. Cache unique, clé dérivée du contenu de la spec. `Rayon` : `Mask` + `ProceduralUI.RoundedRectMask`. Toute opacité CSS passe par `AlphaVoileSurFondQuelconque`.

## 4. Catalogue (26 entrées ; ⑰ = ⑮, même cadre)
| sym | écran | statut | scène | lum. | bande | racine mesurée | cerne | fond |
|---|---|---|---|---|---|---|---|---|
| ③ | CityMap | Posé | district | 0.4 | 100 % | barre | — | — (scène seule, Bande = 100 %) |
| ⑤ | DecisionDetail | Posé | verge | 1 | 34 % | tapis-feutre | — | `radial-gradient(90% 60% at 50% 30%, #2f6e4c, #17402d 60%, #0a2318)` |
| ⑯ | DailyReview | DéjàLivré | verge-jour | 1 | 19 % | feuille | — | `couleur #efe4c6` |
| ㊲ | Reputation | Posé | district | 0.24 | 21 % | rep6 | oui | **A** (§3.3) |
| ㉟ | Selling | Posé | district | 0.24 | 21 % | vnt6 | oui | **A** (§3.3) |
| ㉓ | Shop | Posé | district | 0.24 | 21 % | vitr6 | — | `linear-gradient(168deg, #151b23 0%, #0f141a 46%, #0c1015 100%)` (la `vitre`, zone dominante ; racine sans fond) |
| ⑮ | Inspection | Posé | district | 0.45 | 10 % | corkboard | — | `radial-gradient(circle at 30% 20%, #8a6a3a, #6b4f28 60%, #513a1c)` |
| ⑰ | Precinct (même cadre que ⑮) | Posé | district | 0.45 | 10 % | corkboard | — | `radial-gradient(circle at 30% 20%, #8a6a3a, #6b4f28 60%, #513a1c)` |
| ⑭ | Compression | Posé | district | 0.62 | 35 % | tole | — | `radial-gradient(circle, #4a5057 1.4px, #000000@0 1.9px), linear-gradient(90deg, #2a2e33 0px, #23272b 50%, #2a2e33 100%)` |
| ㊴ | Forensic | Posé | district | 0.24 | 21 % | dos6 | oui | **A** (§3.3) |
| ㊳ | Journal | Posé | district | 0.24 | 21 % | jrn6 | oui | **A** (§3.3) |
| ㊵ | Filiere | Posé | district | 0.24 | 21 % | bln6 | oui | **A** (§3.3) |
| ㉒ | Profile | Posé | district | 0.24 | 21 % | cofr6 | — | `linear-gradient(158deg, #333c46 0%, #232a32 42%, #1a2027 100%)` |
| ㊱ | Horizon | Posé | district | 0.24 | 21 % | hrz6 | oui | **A** (§3.3) |
| ㉜ | Delegation | Posé | district | 0.18 | 21 % | serv6 | — | `linear-gradient(#1d2229, #161a20 58%, #121519)` |
| ㉚ | ChaineDAppro | Posé | district | 0.2 | 21 % | appr6 | — | `linear-gradient(#1c1a17, #151310 60%, #111014)` |
| ㉘ | Distribution | Posé | district | 0.24 | 21 % | lieg6 | — | `dots(9px,#00000022)+dots(13px,#ffffff14)+linear-gradient(158deg,#9a774b,#7b5c37 62%,#654a2c)` (la `planche`, zone dominante ; racine sans fond) |
| ㉛ | Loi | Posé | district | 0.18 | 21 % | parl6 | — | `linear-gradient(#1b1f24, #14181d 58%, #101317)` |
| ㉝ | Demolition | Posé | district | 0.18 | 21 % | demo6 | — | `linear-gradient(#20211d, #191a17 58%, #141513)` |
| ㉞ | Carnet | Posé | district | 0.18 | 21 % | carn6 | — | `linear-gradient(#1e1c19, #181614 58%, #131211)` |
| ㉙ | Conflit | Posé | district | 0.2 | 21 % | cfl6 | — | `linear-gradient(#2a1e14, #1d1610 46%, #141014)` |
| ⑨ | ExceptionQueue | DéjàLivré | bar | 1 | 29 % | ardoise-p | — | `couleur #1d2124` |
| ⑩ | ExceptionDetail | DéjàLivré | bar | 1 | 11 % | ardoise-p | — | `couleur #1d2124` |
| ㉔ | AutonomyInbox | Posé | district | 0.45 | 10 % | burner | — | `linear-gradient(#3a3f47, #22262b 40%, #15181c)` |
| ㉑ | Market (non monté) | NonMonté | district | 0.24 | 21 % | mar6 | oui | **A** (§3.3) |
| ⑱ | AppShell.MonterMenuPlus | Posé | bar | 0.55 | 12 % | bureau | — | `linear-gradient(#5a2e16, #3a1c0e 18px, #2b120c 18px)` |

Comptes : 26 entrées — **Posé 22 · DéjàLivré 3 (⑨ ⑩ ⑯ : zinc de `DecorAuComptoir`, non migrés ici) · NonMonté 1 (㉑)**. Hors catalogue (décision f2) : ④ ⑥ ⑪ ㉕ ⑲ ① ② ⑬ ⑳.

### 4.1 Teintes — la garde TD-612 tranchée (`teintes.py` → `teintes.json`, 75 jetons de `DesignTokens.asset`)
18 couleurs du catalogue sont à d ≤ 4 d'un jeton et passent donc PAR le jeton (la teinte dérive d'au plus 3,6/255 — « le prix de la règle », précédent `DecorAuComptoir`) ; 30 sont des littéraux admis (d > 4) : `#0a2318, #101317, #111014, #131211, #141014, #141513, #151310, #161a20, #17402d, #181614, #1d1610, #1d2124, #1d2229, #1e1c19, #20211d, #22262b, #2a1e14, #2a2e33, #2a3648, #2b120c, #2f6e4c, #333c46, #3a1c0e, #3a3f47, #4a5057, #513a1c, #5a2e16, #6b4f28, #8a6a3a, #efe4c6`.
| couleur | jeton | d |
|---|---|---|
| `#0a0f18` | `lieutenantGlassBottom` | 1.45 |
| `#0b1016` | `hudGaugeFaceOuter` | 2.24 |
| `#0b111b` | `hudBarGlassTop` | 0.1 |
| `#0d0f10` | `surfaceBase` | 0.08 |
| `#0d131e` | `hudBarGlassBottom` | 0.15 |
| `#111823` | `lieutenantMedallionOuter` | 3.05 |
| `#121519` | `mapDialogBg` | 3.11 |
| `#14181d` | `surfaceCard` | 2.93 |
| `#15181c` | `surfaceCard` | 1.67 |
| `#191a17` | `readableTextDark` | 2.6 |
| `#1a2027` | `lieutenantMutedDeep` | 3.62 |
| `#1b1f24` | `lieutenantMutedDeep` | 1.58 |
| `#1c1a17` | `readableTextDark` | 3.57 |
| `#23272b` | `surfaceRow` | 3.6 |
| `#232a32` | `nightOutOfDistrictMuted` | 3.08 |
| `#7fd4d9` | `hudGaugeArcCold` | 0.1 |
| `#b08d3e` | `hudHairlineGold` | 0.06 |
| `#d9ab4e` | `hudMoneyUnderlineGold` | 0.11 |

## 5. Pose par le gabarit
1. `DecorDeScene.Poser(racine, DecorsDeScene.X)` : `Decor` = PREMIER enfant de la racine d'écran, `ignoreLayout`, étiré (contrat de `DecorAuComptoir.Construire`). Plein ÉCRAN : `ContentSlot` est plein canvas SOUS les barres (`AppShell.cs:2011-2016`), donc les fractions de `Bande` mesurées sur le cadre valent telles quelles.
2. **`Decor/Capteur`** (Image alpha 0, `raycastTarget = true`, pleine zone) est le PREMIER enfant du décor : il garde le bloqueur de raycast que portait le fond plat opaque (`AppShell.cs:904-912`) ; toutes les autres couches sont `raycastTarget = false`.
3. Le contrôleur SUPPRIME son fond plat (`AjouterFond(racine, surfaceBase|FondBas|Encre)`, `voile.color = surfaceBase`).
4. Hors shell (tests isolés), `Poser` fonctionne sous un canvas quelconque (`CanvasRacine`) ; sans ressource de scène la scène reste NOIRE, jamais blanche (règle de `DecorAuComptoir`).
5. `Tools/nouvel-ecran.py` émet `DecorDeScene.Poser(racine, DecorsDeScene.<Pascal>)` ; un écran neuf ajoute UNE entrée au catalogue (ou un statut nommé).

## 6. Gardes
- **D1 catalogue = périmètre** : exactement les écrans de `Tools/juge-visuel/INDEX.md` qui ont des cadres de `ecrans-brennar-6.html` (26) ; chacun a une entrée avec son Statut ; contrôle positif (écran retiré ⇒ rouge).
- **D2 pose** : pour chaque entrée `Statut = Pose`, le contrôleur appelle `DecorDeScene.Poser` et ne garde aucun fond plat à la racine (balayage de code chaînes/commentaires, comme `ClientHttpPlayModeTests` G1) ; `DejaLivre`/`NonMonte` : aucune exigence ; contrôle positif.
- **D3 valeurs** : aucune de ces FORMES dans un contrôleur : `"Scenes/…"`, `brightness`, `"#rrggbb"`, `0xRRGGBB`, `new Color(` à flottants dans un appel de décor ; le catalogue lui-même : aucun littéral à d ≤ 4 (la garde TD-612 le voit déjà ; D3 le dit à voix haute avec `teintes.json`).
- **D4 comportement (PlayMode, hors réseau, 540×960 portrait, RenderTexture + Canvas ScreenSpace-Camera du test)** : `Poser` crée les couches déclarées sous leurs noms ; **luminosité** : pixel de scène × b à ±2/255 ; **A** : haut-centre plus chaud que le bord (halo or), bas-centre plus froid (halo cyan), centre ≠ `surfaceBase` plat, cerne à 5 px du bord ; **radial** : pixel du foyer à la bonne hauteur (convention Y) ; **B** : arrêts attendus ; **raycast** : `RaycastAll` au centre rend `Capteur` (ou un élément au-dessus) ; verge nuit : repli chargé. Juge le décor SEUL (le bandeau se juge sur planche).
- **D5 assets** : chaque `SceneDeFond` a sa ressource (verge nuit marquée PROVISOIRE : dette datée).
- Primitives : un test de pixels chacune (`DegradeLineaire` 178°/158°/90° à 3 arrêts ; `DegradeRadial` opaque à 3 arrêts, foyer et rayon).

## 7. Animation (CLIENT-3) — contrat
Ce lot est STATIQUE. Mesure de CLIENT-3 (Chromium, `inventaire-animations.md` @ed46eb92) : AUCUN halo des supports A/B/C n'est animé en maquette ; le seul `.halo` animé est le pin de ③ (absent du client). Contrat adopté : noms figés `Decor/Capteur`, `Decor/Scene`, `Decor/Voile`, `Decor/Support`, `Decor/Support/Radial0..n`, `Decor/Cerne` ; **`Decor/Support` = RectTransform stable aux bornes du panneau** (course de la ligne `*6-scan`, que CLIENT-3 crée dans le contrôleur) ; **AUCUN `CanvasGroup` ni `Canvas` sur ces couches** (sa régie ajoute le sien) ; `Cerne` et chaque `Radial` **hors de tout LayoutGroup**, chacun dans son RectTransform ; les lampes ⑨ ⑩ ⑱ restent chez `DecorAuComptoir`/le contrôleur (attachées par nom).

## 8. Coordination et propriété de fichiers (règle f2 : un propriétaire par contrôleur)
CLIENT-1 tient liste, pied et défilement des mêmes contrôleurs (`ListeDefilante`, `PiedDEcran`). Le décor ne touche que la RACINE (une ligne d'appel + suppression du fond plat) : je fusionne après lui, contrôleur par contrôleur, en l'annonçant avant ; aucun fichier n'est écrit sans son feu vert.

## 9. Hors de ce lot (consigné, pas traité — ruling « nuances à la fin »)
`blur(1px)` de ③ et `sepia(.18)` de ⑭ ; inclinaison de la feuille ⑯ (−0,6°) ; `perspective/rotateX` du plateau ; ombres portées et `inset` ; liseré/ombre interne de `planche` ; textures bitmap de `Tools/fal` (non utilisées par la série 6) ; états vides/erreur non mesurés un par un ; écran paysage/tablette (`PositionVerticale` y agirait) ; effet du bandeau sur la bande (la barre du haut mange 10,3 % du cadre : ⑮ ⑰ ㉔ ne laissent que ≈ 0,2 pt de scène libre) — à juger sur la première planche ; dédoublonnage de la copie `scene_district_nuit` (+2,8 Mo).

## 10. Questions ouvertes
Q1 catalogue statique C# (garde TD-612 et tests lisent le code) plutôt que `ScriptableObject` : retenu. Q3 coût mémoire (~40 sprites générés, textures 128×256 pour les dégradés angulaires) : à mesurer au code, borne à fixer.
