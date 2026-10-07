# Design — la couche de mouvement du client Unity (CLIENT-3, 07/10/2026) — v2

Statut : **design, rien n'est codé.** v1 revue ⊥ le 07/10 : NOT_APPROVED, 6 BLOCKING / 13 MAJEUR / 11 mineurs (rapport : scratchpad `revue-design-v1`, résumé §12). Cette v2 répond à chaque finding (table §12) et applique les rulings du soir : **« les petits pixels de nuance, ne traite pas ; il faut que ce soit fidèle »** (animations fidèles en cause, rythme et sensation, sans chasser la milliseconde ni la nuance de courbe) et la règle de revue **« BLOCKING = le code écrit d'après ce design serait faux ; une prémisse se tranche par une mesure »**.

Entrées : `inventaire-animations.md` (44 paires), `oracle-css-*.json` (valeurs calculées par Chromium), rulings 27/08 soir (« animé le truc, dark/mafieux », animations DIÉGÉTIQUES), canon `global_conventions_core.md`.

## 0. Exigences (les revues les citent)

| # | exigence |
|---|---|
| X1 | UN mécanisme commun ; aucune animation visuelle écrite à la main hors de lui (garde G10, tout `Assets/Scripts`) |
| X2 | Toute animation a une CAUSE dans la fiction, dans une table, vérifiée par un test |
| X3 | IL2CPP/mobile : pas de réflexion ni de codegen runtime ; 0 octet alloué par image en régime |
| X4 | Coût d'image borné par des plafonds durs, **les inconnues d'uGUI sont des mesures planifiées (E0), pas des affirmations** |
| X5 | Mouvement réduit conforme au canon F2 (toggleable, désactive les transitions) |
| X6 | Preuve par captures MULTI-IMAGES qui traverse le chemin réel du jeu |
| X7 | Fidélité à la maquette : cause, rythme (période ±10 %), sensation (forme de la courbe à ±0,15 en valeur normalisée) — **mesurée contre Chromium, tolérance volontairement large** |
| X8 | Aucune animation ne REFUSE l'entrée du joueur (canon : `T.ui.anim_max_block_ms` borne le BLOCAGE, pas la durée) |
| X9 | Chaque garde a un contrôle négatif exécutable |

## 1. Placement et assemblies (B1)

Mesuré : `ShellContracts.asmdef` référence seulement `Theme`, `I18n` ; `Shell`, `CityMap`, `Operational`, `Economy`, `Account`, `CitySim`, `CoreLoops`, `Onboarding` référencent `ShellContracts` ; **aucun** ne référence `Shell`. Donc :
- **Tout le mécanisme et le catalogue vivent dans `ShellContracts`** (`Assets/Scripts/ShellContracts/Mouvements/`, espace de noms `MafiaCleanCity.Mouvements`, m7). Il ne référence AUCUNE classe de `Shell`, `CityMap` ou `Operational` : le catalogue est de la **donnée pure** (images clés, causes), jamais des délégués vers du code d'écran.
- **Les fonctions `TopBarController.Pouls/Tremblement` et `Gyrophare.TeinteA` ne sont pas appelées par le mécanisme.** Leurs courbes passent au catalogue en images clés (`pouls` : alpha 1 → .45 → 1, `ease`, 1,1 s ; `tremble` : rotation +0 → +4° → +0, 0,14 s ; `gyroflip` : hue 0 → −140° → 0, 0,9 s). Le calcul `HueRotate` (matrice CSS) descend dans `ShellContracts/Mouvements/Couleurs.cs` ; `Gyrophare.HueRotate/TeinteA` et `TopBarController.Pouls/Tremblement` restent comme **enveloppes qui appellent la même courbe du catalogue** (leurs tests existants continuent de compiler ; leurs valeurs changent là où le SmoothStep s'écartait du `ease` CSS — l'écart est mesuré par l'oracle : à p = 0,125, `Pouls` rendait 0,914 pour 0,775 en CSS ; les tests qui épinglaient 0,914-type sont réécrits au même lot, listés au §8).
- **Une frontière d'assembly n'est pas vue par le typecheck Roslyn hors Unity** (`Tools/verifier-compilation-sans-unity.sh` : « son vert répond à la syntaxe et aux types, jamais au découpage en assemblies »). **E1 et E2 exigent donc un créneau batchmode** (compilation réelle des 17 assemblies) ; ils sont groupés avec les autres créneaux Unity.

## 2. Modèle de données (B2, B4, B6, m4)

Tout est `static readonly`, immuable.

- **`Genre`** : `Alerte` (porte un sens de jeu : la ville chauffe, la descente, « à soigner »), `Ambiance` (la matière vit), `Retour` (réponse à un geste), `Transition` (changement d'état).
- **`Propriete`** (ce qu'on écrit) : `Alpha` (CanvasGroup.alpha), `Melange` (0..1 entre deux couleurs `CouleurA`→`CouleurB` déclarées sur le mouvement, écrit dans `Graphic.color` RGB sans toucher l'alpha), `Hue` (degrés appliqués à une couleur de base par la matrice `HueRotate`), `Eclat` (alpha d'un **calque de lumière** enfant nommé `Eclat`, car un `Graphic` uGUI ne peut pas dépasser sa couleur : `filter:brightness(1.35)` de `mk-veille` s'exprime par ce calque, M12), `TranslationX`, `TranslationY`, `Rotation`, `Echelle`, `EchelleY`.
  **Retirées** : `Fonction` (B2), `Remplissage` (M12 : `stroke-dashoffset` n'est pas un `fillAmount` ; `fl` est déclarée « hors modèle, scène E5 »).
- **`Mode`** (par canal, B4) : `Additif` (delta ajouté à la valeur de base : translations, rotation du tremblement), `Multiplicatif` (facteur appliqué à la base : alpha, échelle), `Absolu` (valeur imposée : mélange, hue, et rotation d'un balayage d'aiguille).
- **`ImageCle`** `struct { float T; float V; Aisance E; }` ; **`Aisance`** `struct { Lineaire | Ease | EaseIn | EaseOut | EaseInOut | Bezier(x1,y1,x2,y2) }` (struct à 4 flottants, pas un enum, m4) : `cubic-bezier` résolu par 6 itérations de Newton, sans allocation.
- **`Canal`** `{ Propriete P; Mode M; ImageCle[] Cles; }` ; **`MouvementDefini`** (m7) `{ string Id; Genre G; float PeriodeS; Canal[] Canaux; Iteration (Infini | Fois n); bool Alterne; float PoseDeReposS; Couleur CouleurA, CouleurB; }`.
- **`Reglage`** par instance `{ float PhaseS; float KAmp; float KDuree; float KDepl; }` (équivalent de `--own --amp --dur --mo`). La phase est **repliée par piste** et avancée par `dt` (m2 : pas d'horloge absolue en flottant). Les translations de la maquette en `%` sont résolues contre le rect de la cible à l'attachement ; les px de maquette → px Unity par `scaleFactor` du Canvas (m10).
- **`Entree`** du **`Catalogue`** : `{ Id; Ecran; Source; Cause; Genre; MouvementDefini; Pistes; Hote ("client" | "SansHote:<raison>") }`. `Source` ∈ { paire de l'inventaire | `PROPOSE` }.

## 3. L'exécution : UNE régie (M4, M5, M9, M13)

```
Regie : MonoBehaviour   (une par AppShell, créée avec lui ; pas de singleton statique caché)
  Piste[] pistes (tableau plafonné, 0 allocation en régime) ; IHorloge horloge (Reelle=unscaledTime | Figee)
  Handle Attacher(Entree e, RectTransform cible, Reglage r, Action<Handle> quandFini = null)   // lève si e hors catalogue
  Handle Transitionner(Entree e, RectTransform cible, float de, float vers, Action<Handle> quandFini = null) // changement d'état
  void Tick(float t)       // appelé par Update ET par la planche ; AUCUN chemin de contournement
  void Detacher(Handle h); void DetacherSous(Transform racine)
```

**Ordre dans `Tick`** : (1) cible nulle ⇒ piste libérée ; (2) cadence ; (3) visibilité (`activeInHierarchy` ; hors cadre, contrôlé toutes les 15 images) ; (4) évaluation ; (5) composition ; (6) écriture.

**Composition (M4)** : par couple (cible, propriété) : `valeur = base ⊕ pistes`, où les `Additif` s'additionnent, les `Multiplicatif` se multiplient, et **deux pistes `Absolu` sur le même couple sont refusées** (garde G12). Une `Transitionner` en cours fournit la `base` à la place du propriétaire (l'aiguille : `SetCitywideHeatBucket` appelle `Transitionner(chrome.aiguille.balayage, de=ancien, vers=nouveau)` ; le tremblement `Additif` s'y ajoute).

**La base d'un transform appartient au propriétaire (B4, M13)** : la régie n'écrit jamais « repos + delta » à partir d'une copie lue une fois. À chaque tick elle compare la valeur courante à ce qu'elle a écrit la fois d'avant : si elles diffèrent de plus de 1/512, **le propriétaire a réécrit → la base devient la valeur courante**. Ainsi `heatNeedle.localEulerAngles` posé par `SetCitywideHeatBucket` reste la bande, et le tremblement se pose dessus. Garde **G11** : un canal de transformation est refusé sur une cible dont un parent porte un `LayoutGroup`/`ContentSizeFitter` (sauf `LayoutElement.ignoreLayout`).

**Fin d'animation (M9)** : `quandFini` est appelé une fois, sur un délégué mis en cache par l'appelant (pas de lambda à chaque appel). Le bandeau garde sa coroutine **comme minuterie** (l'attente de 5 s n'est pas une animation, G10 l'autorise : elle n'écrit rien de visuel) ; puis `Transitionner(bandeau.sortie, alpha 1→0, quandFini: Effacer)` ; `Effacer` désactive l'objet (donc plus de raycast avalé).

**Application** : `Alpha` → `CanvasGroup.alpha` (ajouté par la régie ; jamais `Graphic.color.a` en boucle, voir E0) ; `Melange`/`Hue` → `Graphic.color` (cibles non texte) ; `Eclat` → alpha du calque ; transforms → `RectTransform`. Écriture seulement si la valeur a changé de > 1/512. **Jamais de texte animé** autre que `Alpha` (G6).

## 4. Coût borné (X4, M5, M6)

| plafond | valeur | preuve |
|---|---|---|
| pistes vivantes | **48**, avec **quota réservé** : 16 `Alerte`/`Retour`/`Transition` (jamais refusées tant que < 16), 32 `Ambiance` ; `Attacher` refuse l'`Ambiance` au-delà de son quota, compté et journalisé | test : 33ᵉ `Ambiance` refusée, `Alerte` encore acceptée |
| budget par écran | celui du catalogue, **≤ 16** | G4 |
| cadence | `Ambiance` plafonnée à **30 Hz** | test sur dt injectés |
| hors champ | piste inactive ou hors cadre : non évaluée, **emplacement conservé** ; cible détruite : libérée au tick (ordre §3) | test |
| délestage | **relatif à la cadence mesurée** : au démarrage, médiane de `dt` sur 120 images = `cible` ; `dt` lissé (EMA 0,2) > 1,5 × cible pendant 1 s ⇒ `Ambiance` à la moitié de sa cadence ; > 2,5 × cible ⇒ `Ambiance` figée à `PoseDeReposS` ; retour sous 1,25 × cible pendant 2 s. (Aucune hypothèse 60 fps, M6.) | test (dt injectés) + contrôle négatif |
| allocation | 0 octet par `Tick` : `Is.Not.AllocatingGCMemory()` de `UnityEngine.TestTools.Constraints` (idiome du dépôt, m9) | test |
| **inconnues d'uGUI → E0** | (a) `CanvasGroup.alpha` d'une cible animée : nombre de batches/draw calls avant/après ; (b) coût de `Graphic.color` animé ; (c) 48 cibles avec et sans Canvas imbriqué (batches, ms CPU) ; (d) clipping d'un `RectMask2D` parent sur un Canvas imbriqué. **Défaut en l'absence de mesure : pas de Canvas imbriqué** (zéro précédent dans le client : `AddComponent<Canvas>` = 0), les transformations sous un masque plafonnées à 6 pistes | spike E0, **créneau Unity** |

Les constantes vivent dans un `MouvementTunables` voisin de `UiTimingTunables` avec la même discipline (« noms stables »), sans diluer les 4 identifiants `T.ui.*` du canon (m8).

## 5. Mouvement réduit (X5, M3)

Le canon dit (`global_conventions_core.md` l.33, l.127) : « Mouvement réduit : option **toggleable** désactive toutes les transitions (F2) ». Donc :
- `PolitiqueMouvement` = `Plein | Reduit` (le niveau `Aucun` n'existe que pour les tests et le contrôle négatif de la planche).
- **`Reduit`** : tout est figé à `PoseDeReposS` (la « frame riche », pas la 0 %), **y compris** `Alerte` — l'alerte garde son état statique nommé (la teinte braise de la descente existe sans pulsation). Seule exception : `Retour` conserve le **mélange de couleur** à l'appui (information de toucher), sans échelle.
- **Source** : le réglage du joueur est **obligatoire** (canon : toggleable) ⇒ une ligne dans ⑲ Réglages (écran monté sans maquette de cette ligne : demande à l'atelier, §11). S'y ajoute : Android `Settings.Global.ANIMATOR_DURATION_SCALE == 0` ⇒ `Reduit` (JNI par chaîne), relu à chaque `OnApplicationPause(false)` ; iOS : réglage joueur seul tant qu'aucun plugin n'existe. Niveau final = `Reduit` si l'une des deux sources le demande.
- Limite de clignotement (G5) : en **toutes** politiques, tous canaux, après `Alterne`, **au plus 3 extrema par seconde** par piste d'alpha/mélange/éclat.

## 6. La preuve multi-images (X6, B5)

1. **Un seul chemin.** Il n'y a pas de `Pose(t)` parallèle : la planche pose `IHorloge.Figee(t_k)` et appelle `Regie.Tick(t_k)`, le même `Tick` que `Update`, **filtres actifs** (cadence, hors-champ, délestage, politique).
2. **Pas d'échantillonnage dérivé de la courbe**, pas de Δ fixe : pour chaque piste du masque, les `t_k` sont les instants où la valeur analytique diffère de la précédente d'au moins `3/255` en luminosité équivalente (calcul pur, testable) ; `N` = 8 images au moins, 24 au plus, couvrant la plus longue période de l'écran. Une `Ambiance` dont l'amplitude ne dépasse jamais ce seuil est **déclarée invisible** par G13 (rougit : une animation que personne ne verra n'a pas de cause).
3. **Garde anti-vacuité** : ≥ 80 % des paires d'images successives diffèrent d'au moins `K = 12` pixels de ≥ 2 niveaux, **dans le masque** (union des rects monde des pistes évaluées au tick considéré).
4. **Contrôles négatifs** : `Aucun` ⇒ 0 % diffèrent ; **délestage armé** (dt injectés > 2,5 × cible) ⇒ l'anti-vacuité DOIT rougir ; **hors-champ** (écran désactivé) ⇒ rougit. C'est ce qui distingue « la régie tourne » de « le calcul est juste ».
5. Livrables de la planche : N PNG, une **bande contact**, `journal.tsv` (t, pixels changés), la comparaison à la maquette aux MÊMES `t_k` (`echantillonneur-gif.py --seek`) pour l'œil du juge — pas une assertion.

## 7. Oracle CSS (X7, B6) — tolérance large (ruling du soir)

`oracle-css.cjs` (commité) échantillonne, dans Chromium, **la valeur calculée** de chaque `@keyframes` appliqué (`opacity`, `filter` brightness/hue-rotate, `transform` décomposé, `stroke-dashoffset`, `box-shadow`), **pseudo-éléments inclus** (`::after`) : `oracle-css-ecrans-brennar-6.json` (34 keyframes), `oracle-css-hud.json`. Grille = **union de 16 points uniformes et de tous les pourcentages d'images clés** (les coudes sont échantillonnés, B6). Le test pur compare : **valeur normalisée à ±0,15, période à ±10 %, ordre des extrema identique** — de la fidélité de SENSATION, pas des nuances. `transform-origin` est enregistré et comparé au pivot de la cible.
**Couverture nominative (rien de caché)** : exprimables par le modèle : `hl led derive drip spl respire tg sf clign rl bl ec ch vp cd rd gt am po sc pe cl ci mk-lampe mk-buee mk-eclat mk-veille mk-scan *-scan pouls tremble gyroflip monte` ; `gyroflip` en `Hue` ; B6/B7 (filet, anneau) en `Melange` ; B8 (lunette, `box-shadow`) approché par `Eclat` (écart déclaré) ; **hors modèle, hôte absent du client** : `fl` (`stroke-dashoffset`, serpentin du labo) et les `osc`/`tourne` morts. `sf` ×202 instances (feuilles) : **non portable en pistes CPU** (plafond 48) — décision E5 (scène en art + shader), hors de cette couche.

## 8. Migration des existants — assertion par assertion (M10)

| existant | devient | ce que les tests doivent CONTINUER à prouver |
|---|---|---|
| `TopBarController.Update` (pouls, tremble) | 2 entrées `Alerte` (`chrome.descente.pouls` alpha du cerclage ET du filet → 2 pistes `Multiplicatif`, `chrome.descente.tremble` rotation `Additif`) ; `Update` supprimé | `DistrictDescentePlayModeTests.cs:164` (« opacité pleine ») lit désormais `CanvasGroup.alpha` effectif de la cible et DOIT rougir si le pouls reste armé (contrôle négatif) ; l.167 (angle de l'aiguille = bande) lit `localEulerAngles` après `Detacher` |
| `Gyrophare.Update` | entrée `Alerte` `chrome.descente.gyro` en `Hue` | `DoitSAllumer` et `Poser` inchangés ; `TeinteA` délègue à la courbe du catalogue |
| `AmbientPulseLoop` | entrées `Ambiance` `district.neon/.fumee/.flicker` en `Alpha Multiplicatif` ; **écart déclaré** : un `CanvasGroup` ne peut pas dépasser l'alpha du `Graphic`, donc l'ancien `base ± 0,12` devient `base × [0,76 .. 1]` (même amplitude, crête = base) | `DistrictInteriorAmbientLoopsPlayModeTests.cs:130-132, 166-168, 206-207` : le compte devient « pistes vivantes **observées sur les objets** (CanvasGroup présent ET alpha qui varie sur deux ticks) = 4 au plus, 3 après re-rendu », avec un contrôle négatif par assertion (une piste sans cible animée ne compte pas) |
| `BandeauEphemere.Effacement` | minuterie conservée ; fondu = `Transitionner(bandeau.sortie, quandFini: Effacer)` | `Visible` faux et `SetActive(false)` après la fin ; le bandeau invisible n'avale plus le toucher |

## 9. Retour d'appui (demande de f2 ; M11)

`RetourAppui` (une classe) posé par un seul assistant `Retour.Poser(Button)` : appui → échelle .97 + mélange vers sombre, 90 ms `EaseOut` ; relâché → 140 ms. États : repos, appui, relâché **et annulé** (`IPointerExitHandler` + relâchement forcé après 400 ms, car un `ScrollRect` qui capte le glisser ne notifie pas le bouton). L'`onClick` part au relâchement, comme aujourd'hui. **Décision pour f2 (M11)** : 67 boutons, dont 15 en `Transition.None` ; les **52 autres ont aujourd'hui le tintement `ColorTint` par défaut d'Unity**. Reco : `RetourAppui` partout (67), le tintement par défaut supprimé ; un changement visuel d'appui sur 52 boutons, à valider au juge sur une planche. Garde G9 : tout `Button` du client a `RetourAppui` ou une exclusion nommée.

## 10. Gardes (X9) — ce qui s'exécute, et quand (M7)

| id | garde | exige Unity |
|---|---|---|
| G1 | catalogue : `Cause` (≥ 20 car.), `Source`, `Ecran`, `Id` unique ; `Attacher` hors catalogue lève | pur (compilé et exécuté au créneau) |
| G2 | **mesure ⇄ catalogue** : lit `mesure-ecrans-brennar-6.json` et le recensement des `@keyframes` (pas le .md) ; chaque paire mesurée a une entrée ou un `Hote = SansHote:<raison>` nommé et compté | pur |
| G3 | `PoseDeReposS` donne une valeur ≠ repos (la « frame riche ») ; la phase de départ de la maquette est conservée | pur |
| G4 | budget par écran ≤ 16 | pur |
| G5 | ≤ 3 extrema/s, toutes politiques, après `Alterne` | pur |
| G6 | pas de canal ≠ `Alpha` sur une cible `TMP_Text` | Unity (GameObjects) |
| G7 | motifs interdits (réflexion, `dynamic`, LINQ/`foreach` de `List` dans `Tick`) dans `Mouvements/` | source |
| G8 | aucun canal n'écrit `blocksRaycasts`/`interactable` ; `Retour` ≤ 250 ms ; (les transitions de la maquette, 500-700 ms, sont permises : elles ne refusent pas l'entrée) | pur |
| G9 | tout `Button` a `RetourAppui` ou une exclusion nommée | Unity |
| G10 | **périmètre global** : aucun `Update`/`LateUpdate`/coroutine hors `Mouvements/` n'écrit couleur, alpha, rotation, échelle ou position visuelle ; exclusions nommées (pan/zoom `DistrictMapNavigation`, mises en page `LateUpdate`, minuterie du bandeau) | source |
| G11 | pas de canal de transformation sous `LayoutGroup`/`ContentSizeFitter` | Unity |
| G12 | pas de deux `Absolu` sur le même couple | pur |
| G13 | une `Ambiance` dont l'amplitude < 3/255 est refusée (invisible) | pur |

**Ce qui prouve quoi, sans promettre plus** : le typecheck Roslyn hors Unity prouve la syntaxe et les types, **pas** les frontières d'assemblies ni l'exécution. Il n'existe qu'une assembly de tests (`Assets/Tests/PlayMode`), tout `[Test]` s'exécute dans le runner Unity : **toute exécution passe par un créneau**, groupé (E0+E1+E2 d'abord).

## 11. Plan de code (ordre de VALEUR JOUEUR, f2 07/10) et décisions

| étape | contenu | créneau Unity |
|---|---|---|
| E0 | spike des 4 inconnues d'uGUI (§4) | OUI |
| E1 | `ShellContracts/Mouvements/` : modèle, courbes, régie, politique, catalogue (HUD seul), `oracle`, gardes G1 G3 G4 G5 G7 G8 G12 G13 | OUI (frontières d'assemblies) |
| E2 | brancher la régie à `AppShell` ; migrer les 4 existants (§8) ; `RetourAppui` ; G2 G6 G9 G10 G11 | OUI |
| E3 | ① HUD : les 7 absentes ; **conditionnée à la décision R2.2 du flotteur** | planche multi-images + juge |
| E4 | ④, puis les écrans montés du catalogue (ii) | planches + juge, UN créneau groupé |
| E5 | scènes serre/labo/Ash = ART d'abord, pas mouvement ; `sf` ×202, `fl` : shader d'UI ou rien — décision séparée | — |

Décisions pour f2 : (1) ligne « mouvement réduit » dans ⑲ (§5, canon : obligatoire) ; (2) `RetourAppui` sur les 52 boutons `ColorTint` (§9) ; (3) le flotteur « + $320 » est un montant exact (R2.2) : bande/glyphe à décider avec l'atelier avant E3 ; (4) le catalogue (ii) des écrans statiques (`catalogue-mouvements.md`).

## 12. Réponse à la revue ⊥ v1

| finding | traitement dans v2 |
|---|---|
| B1 cycle d'assemblies | §1 : catalogue = donnée pure dans ShellContracts, aucune référence à Shell/CityMap ; E1/E2 en créneau batchmode |
| B2 `Fonction` | supprimée ; courbes en images clés ; `Hue` et `Melange` ajoutées (§2) |
| B3 G8 vs 250 ms | G8 réécrite : le canon borne le BLOCAGE ; transitions 500-700 ms permises (§10, X8) |
| B4 absolu/relatif, repos périmé | `Mode` par canal ; base relue quand le propriétaire réécrit ; `Transitionner` (§2-3) |
| B5 preuve | un seul chemin `Tick`, échantillonnage par seuil, trois contrôles négatifs (§6) |
| B6 oracle | pseudo-éléments, coudes, couverture nominative, tolérance large par ruling (§7) |
| M1 | G2 lit la mesure ; `SansHote` compté (§10) |
| M2 | G5 compte les extrema, toutes politiques (§5, §10) |
| M3 | canon suivi : réglage joueur obligatoire, tout figé, relu à la reprise (§5) |
| M4 | composition par couple, G12 (§3) |
| M5 | quotas par genre ; ordre de `Tick` (§3-4) |
| M6 | inconnues planifiées en E0 ; délestage relatif ; pas de Canvas imbriqué par défaut (§4) |
| M7 | ce qui s'exécute / se compile séparé (§10) |
| M8 | G10 global (§10) |
| M9 | `quandFini` ; minuterie conservée (§3) |
| M10 | table assertion par assertion (§8) |
| M11 | état annulé ; décision des 52 boutons remontée (§9) |
| M12 | `Eclat` par calque ; `fl` hors modèle (§2) |
| M13 | G11 + base relue (§3) |
| m1-m11 | m1 : affirmations d'uGUI déplacées en E0 ; m2 phase repliée ; m3 compte aligné (3 `Update` + 1 coroutine = 4 mécanismes, 5 effets) ; m4 `Aisance` struct ; m5 renvoi corrigé ; m6 phase négative abandonnée au profit de `PoseDeReposS` ; m7 espace `Mouvements` ; m8 `MouvementTunables` ; m9 `Is.Not.AllocatingGCMemory` ; m10 conversion px/% ; m11 E3 conditionnée |
