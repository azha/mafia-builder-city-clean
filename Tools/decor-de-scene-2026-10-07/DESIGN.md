# Décor de scène — DESIGN du mécanisme commun (CLIENT-2, 07/10/2026) — v1

**Statut : design pour revue ⊥ (0 BLOCKING visé). Aucun code écrit.** Entrées : `INVENTAIRE.md` (mesures de la maquette série 6), décisions f2 du 07/10 (périmètre = les 26 écrans qui ont une maquette série 6 ; objets de la famille C = contenu d'écran, seuls leurs FONDS entrent ici ; verge nuit en repli temporaire ; le décor se pose par le gabarit, de façon déclarative ; ruling user « le gros, fidèle, les nuances à la fin »).

## 1. Principe
Un écran ne CODE jamais son décor : il le DÉCLARE dans un catalogue unique (`DecorsDeScene`, ShellContracts), et UN constructeur (`DecorDeScene.Poser`) le monte. Retoucher la luminosité de ㉚ ou l'arrêt d'un dégradé = une ligne du catalogue, pas un contrôleur. Le gabarit `Tools/nouvel-ecran.py` émet l'appel ; une garde de classe interdit le fond plat.

## 2. Modèle déclaratif (ShellContracts, `MafiaCleanCity.Shell`)
```csharp
public enum SceneDeFond { District, Bar, Verge, VergeJour }          // les 4 images de la maquette
public sealed class SpecDecor {                                       // immuable, un par écran
  public SceneDeFond Scene;  public float Luminosite;               // CSS brightness(b), 1 = rien
  public float Bande;                                                // part de la hauteur où la scène reste visible AU-DESSUS du support (CADRE : 0,21…1)
  public SpecSupport Support;                                        // le fond du panneau (null = scène seule, cas ③)
}
public sealed class SpecSupport { public SpecCouche[] Couches; public SpecCerne Cerne; public bool Enseigne; }
public abstract class SpecCouche            // une couche CSS de fond, de la plus HAUTE à la plus basse (ordre CSS)
{ Lineaire(angleDeg, Arret[]) | Radial(cx, cy, rx, ry, Arret[]) | Plein(Teinte) | Points(pas, rayon, Teinte) | Rayures(angleDeg, pas, epaisseur, Teinte) }
public readonly struct Arret { float Pos; Teinte Couleur; }          // Teinte = jeton NOMMÉ ou #rrggbb + opacité CSS (alpha sRGB)
public static class DecorDeScene {
  public static DecorPose Poser(Transform racineEcran, SpecDecor spec);        // décor plein écran (scène, luminosité, voile, support)
  public static void Peindre(RectTransform zone, SpecSupport support);          // le MÊME constructeur de support sur une zone (fonds d'objets : liège, feutre, tôle, vitre…)
}
public sealed class DecorPose : MonoBehaviour { RectTransform Scene, Luminosite, Voile, Support; IReadOnlyList<RectTransform> Halos; … }  // poignées stables
public static class DecorsDeScene { public static readonly SpecDecor Reputation = …, Vente = …, … }   // LE catalogue : 26 entrées nommées par écran
```
Le catalogue est la SEULE table des valeurs ; aucun contrôleur ne porte un chiffre de décor.

## 3. Les couches — recettes MESURÉES (maquette) et traduction

### 3.1 Scène (L1) — 4 images, 4 gabarits de découpe
| scène | fichier client (`Resources`) | boîte source (px image, haut-gauche) | `background-position` y |
|---|---|---|---|
| District | `Art/District/Backgrounds/VERGE_D_NUIT_FINAL` (1080×1920) — à rendre chargeable par `Resources` (aujourd'hui lu par `DistrictBackgroundSlots`) | tout (9:16, comme les 720×1280 de la maquette) | 38 % |
| Bar | `Scenes/sprite_environment_bar_nuit` (1080×1350) | tout (0,8, comme 720×900 ; déjà ainsi chez ⑨) | 20 % |
| VergeJour | `Scenes/sprite_environment_verge_d_or_jour` (1728×1080) | (300,60)–(1500,1080), retrouvée par les pixels pour ⑯ | 22 % |
| Verge (nuit) | **ABSENT** : repli TEMPORAIRE `Scenes/verge_nuit_provisoire` = le jpeg 900×765 extrait de la maquette (md5 facdc64c61, `scene-verge.jpeg`) ; dette « asset verge-nuit pleine résolution à commander à l'atelier » | tout | 30 % |
Découpe « cover » : `DecorAuComptoir.UvCouverture` (public, éprouvée) est RÉUTILISÉE telle quelle ; le mécanisme n'en réécrit pas une deuxième.

### 3.2 Luminosité et voile (L1 bis, L2)
- **Luminosité** : `filter: brightness(b)` du CSS est un produit en sRGB. Le projet mélange en LINÉAIRE : plutôt que multiplier la couleur d'un `RawImage` (facteur linéaire ≠ facteur sRGB, erreur énorme à b = 0,18), on pose un voile NOIR d'opacité `1 − b` dont l'alpha passe par `ProceduralUI.AlphaVoileSurFondQuelconque` — le même ajustement déclaré que tous les voiles du dépôt (identité algébrique : noir à α sur c = (1−α)·c).
- **Voile de scène** : `linear-gradient(180deg, #0a0f18cc 0, #0a0f1822 18%, #0a0f1800 40%, #0a0f1866 100%)`, identique partout ; teinte = `lieutenantGlassBottom` (jeton, d = 1,4, règle TD-612) ; alphas par `AlphaVoileSurFondQuelconque` ; sprite via `DecorAuComptoir.DegradeVertical`.

### 3.3 Support (L3) — trois familles, un seul vocabulaire de couches
- **A (standard, ×7)** : couches HAUT→BAS : `Radial(0,5 ; 0,22 ; 0,72/0,40 ; or@.15 → 0 à 66 %)`, `Radial(0,5 ; 0,96 ; 0,90/0,60 ; cyan@.07 → 0 à 70 %)`, `Lineaire(178°, #111823 0 % → #0b1016 54 % → #0d0f10 100 %)` ; or = `hudMoneyUnderlineGold`, cyan = `hudGaugeArcCold`, `#0d0f10` = `surfaceBase` ; `#111823`/`#0b1016` : jetons si d ≤ 4, sinon littéraux déclarés dans le catalogue. **Cerne** : trait 1 px laiton (`hudHairlineGold`) à 5 px du bord, rayon 3, + liseré intérieur `#0b1016` + lueur `0 0 12px laiton@.15`. **Enseigne** : plaque `Lineaire(178°, #0b111b@.91 → #0d131e@.85)`, bordure 1 px `#2a3648`, filet bas 2 px laiton, liseré haut blanc@.06, marges 13/13/0 px (le TEXTE de l'enseigne reste à l'écran).
- **B (fond propre, ×9)** : une pile de couches du même vocabulaire (le plus souvent UN `Lineaire` à 3 arrêts, ex. ㉚ `#1c1a17 → #151310 60 % → #111014`) ; les valeurs exactes sont au catalogue (§4), mesurées dans Chromium.
- **C (fond d'objet, ×10)** : le fond de l'objet de l'écran, même vocabulaire (feutre ⑤ = `Radial` 90/60 en 50/30 `#2f6e4c → #17402d 60 % → #0a2318` ; liège ⑮⑰ = `Radial` 30/20 `#8a6a3a → #6b4f28 60 % → #513a1c` ; bureau ⑱ = `Lineaire` `#5a2e16 → #3a1c0e` à 18 px puis `#2b120c` ; tôle ⑭ = `Points` + `Lineaire` 90° ; téléphone ㉔ = `Lineaire` `#3a3f47 → #22262b 40 % → #15181c` ; ardoise ⑨ ⑩ = `Plein #1d2124` ; feuille ⑯ = `Plein #efe4c6`). Posé par `Peindre(zone, support)` sur la zone que l'écran désigne ; **l'objet lui-même (punaises, vis, cadrans, abat-jour) reste dans le contrôleur**.
- Traduction des couches : `Lineaire` = `ProceduralUI.LinearGradient` (angle) ou `DegradeVertical` (180° à N arrêts, cache) ; `Radial` = `ProceduralUI.VoileRadial` (déjà extinction en cosinus, `centreUV`, rayons en fraction) ; `Rayures`/`Points` = tuile 32–64 px en `Image.Type.Tiled` ; toute opacité CSS passe par `AlphaVoileSurFondQuelconque`. Un cache unique de sprites par clé de spec (comme `DegradeVertical`).

## 4. Catalogue (26 écrans, mesuré — cadre nominal ; ⑰ = ⑮ même cadre)
| sym | écran | scène | lum. | bande | support (racine mesurée) | cerne | fond |
|---|---|---|---|---|---|---|---|
| ③ | CityMap | district | 0.4 | 100 % | barre | — | `—` |
| ⑤ | DecisionDetail | verge | 1 | 34 % | tapis-feutre | — | `radial-gradient(90% 60% at 50% 30%, #2f6e4c, #17402d 60%, #0a2318)` |
| ⑯ | DailyReview | verge-jour | 1 | 19 % | feuille | — | `couleur #efe4c6` |
| ㊲ | Reputation | district | 0.24 | 21 % | rep6 | oui | **A** (§3.3) |
| ㉟ | Selling | district | 0.24 | 21 % | vnt6 | oui | **A** (§3.3) |
| ㉓ | Shop | district | 0.24 | 21 % | vitr6 | — | `—` |
| ⑮ | Inspection | district | 0.45 | 10 % | corkboard | — | `radial-gradient(circle at 30% 20%, #8a6a3a, #6b4f28 60%, #513a1c)` |
| ⑭ | Compression | district | 0.62 | 35 % | tole | — | `radial-gradient(circle, #4a5057 1.4px, #000000@0 1.9px), linear-gradient(90deg, #2a2e33 0px, #23272b 50%, #2a2e33 100%)` |
| ㊴ | Forensic | district | 0.24 | 21 % | dos6 | oui | **A** (§3.3) |
| ㊳ | Journal | district | 0.24 | 21 % | jrn6 | oui | **A** (§3.3) |
| ㊵ | Filiere | district | 0.24 | 21 % | bln6 | oui | **A** (§3.3) |
| ㉒ | Profile | district | 0.24 | 21 % | cofr6 | — | `linear-gradient(158deg, #333c46 0%, #232a32 42%, #1a2027 100%)` |
| ㊱ | Horizon | district | 0.24 | 21 % | hrz6 | oui | **A** (§3.3) |
| ㉜ | Delegation | district | 0.18 | 21 % | serv6 | — | `linear-gradient(#1d2229, #161a20 58%, #121519)` |
| ㉚ | ChaineDAppro | district | 0.2 | 21 % | appr6 | — | `linear-gradient(#1c1a17, #151310 60%, #111014)` |
| ㉘ | Distribution | district | 0.24 | 21 % | lieg6 | — | `—` |
| ㉛ | Loi | district | 0.18 | 21 % | parl6 | — | `linear-gradient(#1b1f24, #14181d 58%, #101317)` |
| ㉝ | Demolition | district | 0.18 | 21 % | demo6 | — | `linear-gradient(#20211d, #191a17 58%, #141513)` |
| ㉞ | Carnet | district | 0.18 | 21 % | carn6 | — | `linear-gradient(#1e1c19, #181614 58%, #131211)` |
| ㉙ | Conflit | district | 0.2 | 21 % | cfl6 | — | `linear-gradient(#2a1e14, #1d1610 46%, #141014)` |
| ⑨ | ExceptionQueue | bar | 1 | 29 % | ardoise-p | — | `couleur #1d2124` |
| ⑩ | ExceptionDetail | bar | 1 | 11 % | ardoise-p | — | `couleur #1d2124` |
| ㉔ | AutonomyInbox | district | 0.45 | 10 % | burner | — | `linear-gradient(#3a3f47, #22262b 40%, #15181c)` |
| ㉑ | Market (non monté) | district | 0.24 | 21 % | mar6 | oui | **A** (§3.3) |
| ⑱ | AppShell.MonterMenuPlus | bar | 0.55 | 12 % | bureau | — | `linear-gradient(#5a2e16, #3a1c0e 18px, #2b120c 18px)` |

**Hors catalogue** (décision f2) : ④ ⑥ ⑪ ㉕ ⑲ ① ② ⑬ ⑳. **Déjà livrés, NON migrés dans ce lot** : ⑨ ⑩ (`DecorAuComptoir`), ⑯ (`RevueDuJourDecor`) — ils gardent leur zinc ; leurs entrées du catalogue servent de référence et seront rebranchées plus tard, jamais en même temps qu'un autre changement.

## 5. Pose par le gabarit
1. `DecorDeScene.Poser(racine, DecorsDeScene.X)` : `Decor` = PREMIER enfant de la racine d'écran, `LayoutElement.ignoreLayout`, étiré (même contrat que `DecorAuComptoir.Construire`) ; le décor est plein ÉCRAN : `ContentSlot` est plein canvas SOUS les barres (`AppShell:44-46`), donc les fractions de `Bande` mesurées sur le cadre valent telles quelles (la barre du haut et le médaillon passent par-dessus, comme dans la maquette).
2. Le contrôleur SUPPRIME son fond plat (`AjouterFond(racine, surfaceBase|FondBas|Encre)`) : le support le remplace. Les panneaux/cartes qu'il pose par-dessus gardent leurs propres fonds.
3. Hors shell (tests isolés), `Poser` fonctionne sous un canvas quelconque (`CanvasRacine` résout la racine) ; sans la ressource de scène, la scène reste NOIRE (même règle que `DecorAuComptoir` : « noir = rien n'est monté »), jamais blanche.
4. `Tools/nouvel-ecran.py` : le gabarit émet `DecorDeScene.Poser(racine, DecorsDeScene.<Pascal>)` et le fond plat disparaît du squelette ; un écran neuf ajoute UNE entrée au catalogue (ou déclare « hors décor » nommément).

## 6. Gardes (statiques + comportement)
- **D1 catalogue = périmètre** : le catalogue contient exactement les 26 écrans de l'INDEX qui ont des cadres série 6 (lus dans `Tools/juge-visuel/INDEX.md`) ; un écran de l'index avec cadres mais sans entrée rougit, avec contrôle positif.
- **D2 pas de fond plat** : aucun contrôleur du catalogue ne garde `AjouterFond(racine, …)` à la racine, et tout contrôleur du catalogue appelle `DecorDeScene.Poser` (balayage de code comme G1 de ClientHttp : chaînes/commentaires lus pour de vrai) ; contrôle positif.
- **D3 pas de valeur de décor hors catalogue** : aucun littéral de scène/luminosité/halo dans un contrôleur (`"Scenes/"`, `brightness`) ; palette TD-612 : tout littéral couleur du catalogue à d ≤ 4 d'un jeton nommé est rejeté.
- **D4 comportement hors réseau** (PlayMode) : `Poser` crée exactement les couches déclarées (noms stables) ; la luminosité est un voile noir d'alpha ajusté ; **sondes de pixels** sur un rendu hors écran : A haut-centre plus chaud que le bord (halo or), bas-centre plus froid (halo cyan), centre = dégradé 178° (pas `surfaceBase` plat), cerne présent à 5 px du bord, bande de scène visible au-dessus du support ; B : 3 arrêts attendus ; verge : repli provisoire chargé.
- **D5 assets** : chaque `SceneDeFond` a sa ressource (sinon rouge), la verge nuit étant marquée PROVISOIRE (dette datée, comme `NonInscritesConnues`).

## 7. Animation (CLIENT-3) — contrat, pas de code ici
Ce lot est STATIQUE. `DecorPose` expose des poignées STABLES (`Halos[]` = les couches `Radial` du support A et le halo de ③ ; `Scene`) et des noms de GameObjects figés (`Decor/Scene`, `Decor/Luminosite`, `Decor/Voile`, `Decor/Support/Radial0…`, `Decor/Cerne`). La maquette anime 9 halos (`@keyframes` mesurés par CLIENT-3 : `oracle-css-*.json`) et les lampes ⑨ ⑩ ⑱ : ils s'attachent à ces poignées sans que le décor connaisse l'animation. **À valider avec CLIENT-3 avant le code** : liste des couches animables et leurs noms.

## 8. Coordination et propriété de fichiers (règle f2 : un propriétaire par contrôleur à la fois)
CLIENT-1 tient la liste, le pied d'écran et le défilement des mêmes contrôleurs (Journal, Démolition, Boutique, Filière, Carnet… ; `ListeDefilante`, `PiedDEcran`). Le décor ne touche que la RACINE (une ligne d'appel + la suppression du fond plat) : je fusionne après lui, écran par écran, en l'annonçant avant chaque contrôleur ; aucun fichier n'est écrit sans son feu vert.

## 9. Ce qui est volontairement hors de ce lot (consigné, pas traité — ruling « nuances à la fin »)
`blur(1px)` de la scène ③ et `sepia(.18)` de ⑭ ; l'inclinaison de la feuille ⑯ (−0,6°) ; `perspective/rotateX` du plateau ; ombres portées ; textures bitmap de `Tools/fal` (non utilisées par la série 6) ; états vides/erreur non mesurés un par un ; calage fin de la bande sur planche (première planche après le code).

## 10. Questions ouvertes pour la revue
Q1 le catalogue unique en C# (statique) est-il la bonne place, ou un `ScriptableObject` (retouche sans recompiler) ? — choix : statique, car la garde TD-612 et les tests lisent le code, et DesignTokens est lui-même chargé par `Resources`. Q2 `Peindre` pour les fonds d'objets : suffisant sans API de « zone nommée » ? Q3 coût mémoire : ~40 sprites générés (A ×1 partagé, B ×9, C ×10, voile ×1, radiaux) — mesure à faire au code.
