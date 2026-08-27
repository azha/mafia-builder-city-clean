# Item 0.5 / C2 — MESURE photographique des 4 panneaux de l'Accueil (post-B2)

**Mandat** : mesure, pas correctif. Trancher par l'image (pas par calcul, pas par maquette — aucune
n'existe pour l'écran ④) deux questions laissées ouvertes après le correctif B2 (revue ⊥ item05-C2,
commit `51680b3`) :

1. les 4 panneaux de l'Accueil sont-ils recouverts par le bandeau (`TopBarSlot`) ou le dock
   (`TabBarRoot`) ?
2. le CONTENU de chaque panneau (`HighestLeverageCardController` en particulier — doute consigné par
   l'auteur de B2 : « déborde probablement de sa bande à 25 % ») déborde-t-il de sa propre bande ?

## Ce qui a été livré

- `Assets/Tests/PlayMode/AccueilPanneauxGeometriePhotoPlayModeTests.cs` — `[Category("Charpente")]`,
  3 test cases :
  - `MesureGeometrie_AccueilPanneaux_1080x1920_et_1080x2400_SEEDE_OperationalDemo` — patron
    `VuePrincipaleCapturePlayModeTests.CapturerA` (scène de démarrage du build + basculement du
    canvas en `ScreenSpaceCamera` vers une `RenderTexture`), aux DEUX résolutions demandées.
  - `MesureGeometrie_AccueilPanneaux_MontageNatif1080x1920_SEEDE_OperationalDemo` — **ajouté**, hors
    périmètre littéral du mandat, pour contrôler un confound découvert en cours de mesure (voir
    § Déviation).
  - Compte SEEDÉ (`operational_demo@example.test`, `SeederSupport.OperationalSeeder`) — MÊME
    identité que le défaut compilé d'`AppShell.demoIdentifier` — MONDE RÉEL (carte de décision +
    file de 3 exceptions), pas un compte frais vidé de contenu qui sous-estimerait tout débordement.
- 3 captures dans `Assets/Screenshots/` :
  `accueil_panneaux_geometrie_1080x1920.png`, `accueil_panneaux_geometrie_1080x2400.png`,
  `accueil_panneaux_geometrie_1080x1920_montage_natif.png`.

## Preuve que `RebatirChromePourResolutionCourante()` est un no-op géométrique ICI

Mesuré (pas supposé) : `TopBarSlot`/`TabBarRoot` AVANT et APRÈS l'appel, aux deux résolutions —
identiques au pixel près (`noOp=True` dans les deux cas, log `[NO-OP]`) :

```
[NO-OP 1080x1920] TopBarSlot avant=[0.0,1776.7..1080.0,1920.0] après=IDEM noOp=True
                   TabBarRoot avant=[0.0,0.0..1080.0,248.4]   après=IDEM noOp=True
[NO-OP 1080x2400] TopBarSlot avant=[0.0,2256.7..1080.0,2400.0] après=IDEM noOp=True
                   TabBarRoot avant=[0.0,0.0..1080.0,248.4]   après=IDEM noOp=True
```

Le docstring du round 15 tient : les captures qui suivent mesurent bien le monde que la photo montre.

## Table complète — scénario A (montage à 640×480 puis bascule vers la cible — patron `CapturerA`)

`ContentSlot.rect.height` AVANT bascule (au montage des panneaux) = **960** unités de canvas
(Screen=640×480, `canvas.scaleFactor=0.5`). Après bascule : **2275,56** (1080×1920) / **2844,44**
(1080×2400) — `canvas.scaleFactor=0,8438` dans les deux cas (même LARGEUR cible). Les 4 panneaux
sont donc IDENTIQUES en pixels entre 1080×1920 et 1080×2400 (leur bande a été figée AVANT la
bascule, en unités de canvas, jamais recalculée depuis).

| Panneau | Rect (px, 1080×1920 = 1080×2400) | Recouvr. TopBar | Recouvr. TabBar | Débord HAUT | Débord BAS |
|---|---|---|---|---|---|
| HighestLeverageCardController | [0,495.6 .. 1080,578.0] (82.4 h) | 0,00 % | 0,00 % | −8,4px (encre plus petite) | **+15,5px (18,8 %)** |
| ExceptionQueuePanelController | [0,413.2 .. 1080,495.6] (82.4 h) | 0,00 % | 0,00 % | −6,7px | **+60,2px (73,1 %)** |
| OrgVitalsPanelController | [0,330.8 .. 1080,413.2] (82.4 h) | 0,00 % | 0,00 % | 0,0px | −17,3px (sous-rempli) |
| HomeChromeController | [0,248.4 .. 1080,330.8] (82.4 h) | 0,00 % | 0,10 % (négligeable) | 0,0px | +5,6px (6,8 %) |

Verdict Q1 (recouvrement par les barres) : **NON, jamais mesuré** — 0,00 % partout (le 0,10 % de
HomeChrome/TabBar est un résidu d'anti-crénelage sous la tolérance de 1 %).
Verdict Q2 (débordement de contenu) : **OUI, confirmé par la photo** pour HighestLeverageCard
(+18,8 %, correspond au doute consigné par B2) et bien pire pour ExceptionQueue (+73,1 % — 3
rangées de la file débordent largement sous leur bande, chevauchant visuellement le panneau
OrgVitals en dessous — voir la capture, texte illisible/superposé).

Le test **rougit** sur ces deux points — délibérément (voir CLAUDE.md, « au moindre doute,
corriger... » et « une déviation consignée est le fonctionnement normal ») : c'est la mesure
demandée, pas une régression du test.

## Table complète — scénario B (montage NATIF à 1080×1920 dès la 1ère frame, canvas pré-posé)

Contrôle ajouté pour trancher si le scénario A mesure un vrai défaut de contenu ou un artefact de
méthode (aucun appareil réel ne démarre à 640×480 puis se redimensionne).
`ContentSlot.rect.height` = **2275,56** dès le premier calcul de `MonterPanneauxAccueil` (le canvas
est pré-posé en `ScreenSpaceCamera`/RenderTexture 1080×1920 AVANT l'instanciation de l'`AppShell` —
`BuildLayout()` le RÉUTILISE, `Assert.AreSame` vérifié).

| Panneau | Rect (px) | Recouvr. TopBar | Recouvr. TabBar | Débord HAUT | Débord BAS |
|---|---|---|---|---|---|
| HighestLeverageCardController | [0,1394.3 .. 1080,1776.3] (382.0 h) | 0,00 % | 0,00 % | −8,4px | −8,4px |
| ExceptionQueuePanelController | [0,1012.4 .. 1080,1394.3] (382.0 h) | 0,00 % | 0,00 % | −6,8px | +0,8px (sous tolérance 2px) |
| OrgVitalsPanelController | [0,630.4 .. 1080,1012.4] (382.0 h) | 0,00 % | 0,00 % | 0,0px | −316,8px (très sous-rempli) |
| HomeChromeController | [0,248.4 .. 1080,630.4] (382.0 h) | 0,00 % | 0,10 % | 0,0px | 0,0px |

**AUCUN débordement** (toutes les valeurs sont dans la tolérance ±2px, la plupart négatives —
l'encre est plus PETITE que sa bande). Le doute de l'auteur de B2 est donc **RÉFUTÉ pour le cas
courant** (un joueur qui lance l'app sur son téléphone, sans redimensionnement en cours de
session) : `ContentSlot` mesure directement 2275,56 unités de canvas dès la première frame,
chaque panneau reçoit ~382px (au lieu des 82,4px figés du scénario A), et le MÊME contenu y tient
confortablement.

⚠️ Note non résolue : `ShellChrome.TopInsetPx` diffère entre les deux scénarios (170,3 vs 275,0
unités de canvas) — pas creusé plus loin (hors du périmètre des deux questions posées), possible
sensibilité de `TopBarController.EffectiveBottomOverhangPx` au nombre de frames de settle avant
lecture. N'affecte PAS les deux verdicts ci-dessus (le recouvrement par les barres reste à 0,00 %
dans les deux scénarios, sur les deux valeurs de `TopInsetPx`).

## Constat supplémentaire — hors périmètre des 2 questions, à consigner pour un round futur

Le scénario A n'est pas qu'un artefact de test : **il reproduit une classe de défaut réelle**. Les
4 panneaux de l'Accueil sont montés UNE fois (`AppShell.MonterPanneauxAccueil`, pendant
l'acquisition de session) et leur bande (`offsetMin`/`offsetMax`) est un nombre ABSOLU figé à cet
instant — contrairement à `DistrictInteriorScreenController`, qui porte SA PROPRE
`RebatirPourResolutionCourante()`, rien ne rejoue ce calcul pour les 4 panneaux si `ContentSlot`
change de taille APRÈS leur montage. Or l'app Android par défaut (manifest généré par Unity,
aucun `AndroidManifest.xml` custom dans ce dépôt) déclare `configChanges` pour orientation/
screenSize — un changement de fenêtre (multi-fenêtre, pliable, rotation) NE détruit PAS l'activité
et PEUT donc livrer, à l'Accueil déjà monté, exactement la séquence du scénario A. **Non mesuré
sur device réel** — a fortiori consigné comme risque, pas comme fait établi côté production.
⇒ Un futur round pourrait doter les 4 panneaux d'un hook `RebatirPourResolutionCourante()`
symétrique à celui du district (ré-appeler l'équivalent de `NouveauPanneauAccueil` avec le
`ContentSlot.rect.height` courant). Hors périmètre de ce mandat (mesure, pas correctif).

## Déviations (option conservatrice, consignées)

1. **Ajout du 3ᵉ test (montage natif)**, non demandé littéralement par le mandat, pour ne pas
   laisser un résultat de scénario A non désambiguïsé (test-artefact vs vrai défaut) — option qui
   change le MOINS de surface (un test de plus, aucune ligne de production touchée) tout en
   répondant complètement à la question posée. Continué sans bloquer.
2. **Les violations sont collectées dans une liste et assertées UNE fois, à la fin**, plutôt qu'un
   `Assert` par panneau — un premier essai a montré qu'un `Assert.LessOrEqual` par panneau fait
   avorter la coroutine au 1er écart, empêchant de mesurer les 3 autres panneaux ET la 2ème
   résolution (contradiction directe avec « colle la table COMPLÈTE »). Corrigé avant la mesure
   finale (voir historique de commit).
3. **Aucune correction de production** — conforme au mandat. Les deux `Assert.LessOrEqual` par
   panneau (scénario A) restent des pins ROUGES délibérés sur un défaut désormais confirmé — ne
   pas les assouplir pour faire passer la couleur au vert ; le correctif appartient à un round
   séparé, avec sa revue ⊥.

## Preuve d'exécution

`MafiaCI.RunPlayModeTests`, catégorie `Charpente` (parmi les 5 du filtre) :
- Run 1 (avant restructuration collecte) : `passed=217 failed=2` — 1 échec NavD12 (référence
  217/1, intermittent, antérieur), 1 échec du nouveau test (1er `Assert` rencontré seulement).
- Run 2 (après restructuration collecte) : `passed=217 failed=2` — même paire, mais le log porte
  désormais la table complète (6 constats hors tolérance, les 6 lignes ci-dessus scénario A).
- Run 3 (après ajout du montage natif) : `passed=218 failed=2` — NavD12 (référence) + le test
  scénario A (toujours rouge, comme attendu) ; le nouveau test « montage natif » est VERT (aucun
  écart hors tolérance).
- `[Charpente] SetUp` : 33 occurrences (référence 31 + 2 nouveaux `[UnityTest]` de ce fichier).
- 3 runs, foreground, `LOG_FILE` explicite, aucun autre run concurrent (vérifié `docker ps -q`/
  `uptime` avant chacun).
