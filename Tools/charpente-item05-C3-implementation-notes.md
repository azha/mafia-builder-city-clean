# Item 0.5 / C3 — le hook de reconstruction des 4 panneaux de l'Accueil

**Mandat** : le fait mesuré par C2 (`Tools/charpente-item05-C2-photo-implementation-notes.md`,
commit `5a6810c`) établit que `AppShell.MonterPanneauxAccueil` cuit la bande de chaque panneau
comme un décalage ABSOLU dérivé de `ContentSlot.rect.height`, lu une seule fois au montage, sans
aucun hook de reconstruction — précédent existant : `DistrictInteriorScreenController.
RebatirPourResolutionCourante()`. Ce n'est **pas** un bug joueur (portrait verrouillé, montage à
l'ouverture de session quand `Screen.width` est déjà fixé — mesuré : 0,00 % de débordement en
montage NATIF) : ça corrompt l'INSTRUMENT DE MESURE (`CapturerA`/`MesurerEtCapturer`, le seul
patron de capture multi-résolution du dépôt). Trois livrables : (1) le hook, (2) le test
délibérément rouge de C2 doit passer au vert PAR LA CAUSE, (3) une garde structurelle + son
contrôle positif.

## 1. Le hook — classe, population balayée, portée

**Classe fermée** : un `RectTransform` positionné par un décalage ABSOLU dérivé de
`ContentSlot.rect.height`, lu au montage, sans jamais être recuit si cette hauteur change
ensuite (ce que la production ne fait jamais subir, mais que `CapturerA`/`MesurerEtCapturer`
FONT systématiquement : montage à 640×480 en batchmode, PUIS bascule vers la cible).

**Population balayée** — sweep Python (jamais `rg`/`grep` nu, piège connu de ce dépôt) sur
`\.rect\.(height|width)` dans tout `Assets/Scripts/**/*.cs` :

```
python3 -c "sweep .rect.height|.rect.width sur Assets/Scripts" → 16 occurrences, 7 fichiers
```

| Fichier:ligne | Grandeur | Baked-once ? | Pourquoi (in)vulnérable |
|---|---|---|---|
| `AppShell.cs:655` (`NouveauPanneauAccueil`) | `ContentSlot.rect.**height**` | OUI — **LE SITE** | hauteur du canvas complet, dépend de l'ASPECT (varie avec `Screen.height/width`, `matchWidthOrHeight=0`) — jamais invariant |
| `AppShell.cs:266-267` (`EnterDistrict`) | `TopBarSlot`/`TabBarRoot.rect.**height**` | non | ces hauteurs sont `Px(constante)` depuis le fix round 15 (`Px()` ne lit plus le Canvas) — INVARIANTES à la résolution, mesuré NO-OP |
| `AppShell.cs:727-728` (`PublierInsetsDuChrome`) | idem | non | même raison — et déjà rejoué à chaque mount ET à chaque `RebatirChromePourResolutionCourante()` |
| `LieutenantScreenController.cs:1841,1846` | `carte.rect.**width**` | non | largeur canvas-locale, `matchWidthOrHeight=0` ⇒ TOUJOURS `ReferenceResolutionWidth` (1280), invariante à l'aspect |
| `DistrictInteriorScreenController.cs:473` | `root.rect.**width**` | non | même raison largeur ; et de toute façon RE-LU à chaque `Render(dto)`, y compris depuis `RebatirPourResolutionCourante()` |
| `DistrictInteriorScreenController.cs:646` | `baseSprite.rect.**width/height**` | non | `Sprite.rect` (pixels source de la texture), aucun rapport avec la géométrie de canvas |
| `EchelleMaquette.cs:114` | `racinePleinEcran.rect.**width**` | non | largeur, jamais cachée en field — relue à chaque appel de `Px()` |
| `TopBarController.cs:102,106,132` | (commentaires seuls) | — | pas de code |

⇒ **1 site sur 16 hits / 7 fichiers.** La distinction qui sépare le seul site vulnérable des 15
autres : LARGEUR canvas-locale = invariante à la résolution (`matchWidthOrHeight=0` ⇒ toujours
1280) ; HAUTEUR canvas-locale = **dépend de l'aspect ratio**, donc de `Screen.height/Screen.
width` — c'est la seule grandeur qui peut légitimement changer entre deux résolutions same-width
(1080×1920 vs 1080×2400, déjà le cas natif) ou entre le montage batchmode (640×480) et la cible.

**Ce qui a été livré** (`Assets/Scripts/Shell/AppShell.cs`) :
- `PoserBandeAccueil(RectTransform, yMin, yMax)` — la formule extraite, UNE fois, partagée entre
  montage et reconstruction (même patron que `DockRatifie`, items 0.2/0.3 — deux copies qui
  doivent rester parallèles sont une dette).
- `panneauxAccueilBandes` (`List<(RectTransform, float, float)>`) — registre alimenté par
  `NouveauPanneauAccueil<T>` à chaque panneau créé, vidé défensivement en tête de
  `MonterPanneauxAccueil` (jamais exercé en production : la méthode ne tourne qu'une fois par vie
  de shell).
- `RebatirPanneauxAccueilPourResolutionCourante()` — repositionne (jamais ne détruit/recrée) les
  panneaux trackés, en rejouant `PoserBandeAccueil` avec `ContentSlot.rect.height` COURANT.
  Repositionnement SEUL, option conservatrice : le CONTENU des 4 panneaux vient de setters qui ne
  dépendent d'aucune géométrie de canvas ; détruire/recréer rejouerait
  `OrgVitalsPanelController.FetchHeatAndCohesion` (un vrai aller-retour réseau) pour un correctif
  qui n'a besoin de toucher que la position.

**Qui appelle ce hook en PRODUCTION : PERSONNE — et c'est le statut ATTENDU, pas un oubli.**
Même statut que son précédent direct, `DistrictInteriorScreenController.
RebatirPourResolutionCourante()` (zéro appelant de production, lui aussi) : la production ne
change JAMAIS de résolution après montage (portrait verrouillé, montage à l'ouverture de
session). Un hook sans appelant de production n'est décoratif QUE s'il PRÉTEND fermer un défaut
qui mord en production — ce dépôt l'a payé une fois avec `RebatirChromePourResolutionCourante()`
(zéro appelant de prod à l'époque, ne vivait QUE dans le helper de capture, et le juge visuel a
photographié une géométrie RÉPARÉE que le joueur n'avait jamais vue). Ici c'est l'inverse : le
docstring du hook dit explicitement « ceci répare l'instrument, pas la production » — et son seul
consommateur légitime EST le chemin qui refait la mesure :
`AccueilPanneauxGeometriePhotoPlayModeTests.MesurerEtCapturer`, câblé au point 2 ci-dessous.
`VuePrincipaleCapturePlayModeTests.CapturerA` n'a PAS reçu cet appel (voir § Déviations) — il
n'a, à ce jour, jamais mesuré l'Accueil (`EnterDistrict`/`ActivateTab` détruisent ces panneaux
avant toute capture de ce fichier).

## 2. Le test délibérément rouge — passé au vert PAR LA CAUSE

`MesurerEtCapturer` (`AccueilPanneauxGeometriePhotoPlayModeTests.cs`) appelle désormais
`shell.RebatirPanneauxAccueilPourResolutionCourante()` juste après
`RebatirChromePourResolutionCourante()` (ordre imposé : le second republie
`ShellChrome.Top/BottomInsetPx`, dont dépend `PoserBandeAccueil`).

**Avant/après, par panneau, débord BAS (la seule dimension qui débordait)** — « avant » = mesure
figée dans `Tools/charpente-item05-C2-photo-implementation-notes.md` (scénario A, commit
`5a6810c`) ; « après » = Run A/C de ce chunk (`scratchpad/runA-1820.log`,
`scratchpad/runC-restored.log`, identiques à la mesure près) :

| Panneau | AVANT (débord bas) | APRÈS 1080×1920 | APRÈS 1080×2400 |
|---|---|---|---|
| HighestLeverageCardController | **+15,5px (+18,8 %)** | −8,4px (−2,21 %, dans la bande) | −8,4px (−1,68 %) |
| ExceptionQueuePanelController | **+60,2px (+73,1 %)** | +0,8px (0,22 %) | +0,8px (0,17 %) |
| OrgVitalsPanelController | −17,3px (sous-rempli, jamais hors tolérance) | −316,8px (sous-rempli) | −436,8px (sous-rempli) |
| HomeChromeController | +5,6px (+6,8 %) | 0,0px (0,00 %) | 0,0px (0,00 %) |

Verdict : **0 constat(s) hors tolérance**, aux deux résolutions (log : `MafiaCI: RunPlayModeTests
finished — passed=221 failed=1`, seul échec `NavD12`, intermittent et antérieur). C'est bien la
CAUSE qui a été atteinte : aucune tolérance n'a été assouplie (`ToleranceDebordPx=2.0f`,
`TolerancePct=1.0f`, INCHANGÉS), et la classe fermée est prouvée par le fait que les DEUX
scénarios (A, bascule ; B, montage natif) convergent maintenant vers le même 0,00 % — avant ce
chunk ils divergeaient (960 unités de canvas figées contre 2275,56/2844,44 réelles).

Captures gardées comme preuve (`Assets/Screenshots/`, régénérées par Run C, ci-jointes au
commit) : `accueil_panneaux_geometrie_1080x1920.png`, `accueil_panneaux_geometrie_1080x2400.png`
(scénario A, maintenant PROPRES — 4 panneaux empilés, aucun chevauchement visible),
`accueil_panneaux_geometrie_1080x1920_montage_natif.png` (scénario B, contrôle, inchangé en
substance).

## 3. La garde structurelle + son contrôle positif

`CharpenteAccueilPanneauxPlayModeTests.cs`, 2 tests ajoutés (35 `[Charpente] SetUp` au lieu de
33 — +2, un par `[UnityTest]` neuf) :

- `C3_RebatirPanneauxAccueil_ReprendLaMemeFractionDeZoneSure_ApresUnVraiChangementDeHauteur` —
  garde de PROPORTION (jamais de pixel absolu à une résolution donnée) : la fraction de la zone
  sûre qu'occupe chaque panneau (mesurée par `GetWorldCorners`/`InverseTransformPoint`, même
  idiome que la garde B2 voisine — jamais un recalcul de `yMin*safeHeight` à la main) doit être
  IDENTIQUE avant et après un changement RÉEL de `ContentSlot.rect.height` (anti-vacuité : le
  test EXIGE un écart de hauteur > 50 unités, sinon il ne prouverait rien) suivi de la
  reconstruction.
- `C3_RebatirPanneauxAccueil_PositiveControl_MethodeDoitReellementEcrire` — sabote
  `HomeChromeController`'s `offsetMin/offsetMax` à une valeur arbitraire AVANT l'appel, assure
  qu'elle ne survit PAS (même patron que
  `CharpenteBootScenePlayModeTests.MAJEUR3_..._PositiveControl_MethodeDoitReellementEcrire`,
  round 15).

**Contrôle positif RÉEL, sur la cause elle-même — pas seulement sur un composant synthétique** :

1. Sauvegarde de `AppShell.cs` (fixé) → `scratchpad/AppShell.cs.fixed.bak`, vérifiée par hash
   SHA-256 Python (`d2900cb…5745d2` des deux côtés).
2. Sabotage délibéré : `RebatirPanneauxAccueilPourResolutionCourante()` réduite à un `return;`
   immédiat (re-arme EXACTEMENT la classe fermée par ce chunk).
3. **Run B** (foreground, `scratchpad/runB-sabotage.log`) : `passed=218 failed=4`. Les 4 rouges :
   `NavD12` (référence, inchangé) + **les 3 tests qui dépendent de la cause, simultanément** :
   `MesureGeometrie_AccueilPanneaux_1080x1920_et_1080x2400_...` (« 6 écart(s) hors tolérance »,
   redevenu rouge), `C3_..._PositiveControl_...` (offset sabotée SURVIT), `C3_..._
   ReprendLaMemeFraction...` (« 7 panneau(x) » sur 8 mesures dont la fraction a changé — hauteur
   960,0 → 2844,4, exactement le confound de C2). Arithmétique : 221 − 3 = 218 ✓, 1 + 3 = 4 ✓.
4. Restauration : `cp scratchpad/AppShell.cs.fixed.bak Assets/Scripts/Shell/AppShell.cs`, vérifiée
   OCTET À OCTET par hash SHA-256 Python (identique à l'étape 1 — `diff` NU n'a pas été utilisé,
   piège connu de ce dépôt).
5. **Run C** (foreground, `scratchpad/runC-restored.log`) : `passed=221 failed=1`, **byte-for-byte
   identique au verdict de Run A** (même seul échec `NavD12`, même `0 constat(s) hors
   tolérance`, mêmes 35 `[Charpente] SetUp`).

Trois runs, TOUS au premier plan (`Tools/run-unity-check.sh`, `LOG_FILE` explicite, jamais de
pipe sur la sortie), aucun autre run/Unity concurrent (`/proc/*/exe` vérifié avant chacun) :

| Run | État de `AppShell.cs` | passed | failed | FAIL(s) |
|---|---|---|---|---|
| A | fixé (ce chunk) | 221 | 1 | NavD12 |
| B | SABOTÉ (`return;` immédiat) | 218 | 4 | NavD12 + photo test + 2 gardes C3 |
| C | restauré (byte-exact vs A) | 221 | 1 | NavD12 |

## Déviations (option conservatrice, consignées)

1. **`VuePrincipaleCapturePlayModeTests.CapturerA` n'a PAS reçu l'appel au hook** — bien que ce
   soit LE patron canonique de capture multi-résolution du dépôt. Mesuré avant de décider :
   ses 4 usages (`Capture_VuePrincipale_...`) appellent `shell.EnterDistrict(16)` AVANT toute
   `CapturerA`, et `EnterDistrict`/`ActivateTab` appellent `UnmountCurrentTenant()` qui détruit
   TOUT `ContentSlot` (donc les 4 panneaux de l'Accueil, s'ils existaient) avant que `CapturerA`
   ne tourne. Ajouter l'appel y serait un no-op garanti (liste vide) — option qui change le MOINS
   de surface : ne pas toucher un fichier de test partagé par des captures déjà vertes, pour un
   appel qui n'y ferait jamais rien. Si un futur test fait co-exister Accueil + `CapturerA`,
   ce point est à rouvrir.
2. **Repositionnement seul, jamais destruction/reconstruction complète** (contrairement au
   précédent district) — voir § 1 : le contenu ne dépend d'aucune géométrie de canvas, et détruire
   redéclencherait un aller-retour réseau (`FetchHeatAndCohesion`) sans raison. Option qui ferme la
   cause exacte mesurée, sans toucher aux 4 setters ni à leurs effets de bord.
3. **2 tests structurels ajoutés plutôt qu'un seul** — mêmes deux angles que le précédent Chrome
   (round 15) : un test de PROPRIÉTÉ (la proportion survit un vrai changement de résolution) et un
   test de MÉCANISME (la méthode écrit réellement). Aucun des deux ne suffit seul (une méthode qui
   ne fait rien satisferait trivialement « rien n'a changé » si comparée à elle-même sans anti-
   vacuité — d'où le garde-fou de +50 unités dans le premier test).

## Ce qui n'est PAS fermé

- **Aucune garde n'empêche un 5ᵉ panneau futur d'être posé SOUS `ContentSlot` par un chemin qui
  contourne `NouveauPanneauAccueil`/`PoserBandeAccueil`** (donc sans jamais s'enregistrer dans
  `panneauxAccueilBandes`) — un tel panneau reproduirait la classe fermée ici, invisible à la
  garde C3 (qui ne peut mesurer que ce qu'elle trouve dans `ContentSlot`, jamais « est-ce que
  TOUT ce qui devrait être tracké l'est »). Hors périmètre de ce chunk (aucun 5ᵉ panneau n'existe
  aujourd'hui) — à rouvrir si l'Accueil grandit.
- Les déviations DÉJÀ ouvertes par C2 (m1, m7, I6 — machine à 5 états indiscriminante, sonde heat
  potentiellement dupliquée) restent OUVERTES, non touchées par ce chunk (hors périmètre C3 :
  géométrie uniquement, aucun contenu).
- Les deux `Assert.LessOrEqual`/collecte de C2 restent le SEUL juge de tolérance — ce chunk ne les
  a ni resserrées ni desserrées (`ToleranceDebordPx=2.0f`, `TolerancePct=1.0f`, byte-identiques
  au diff).
