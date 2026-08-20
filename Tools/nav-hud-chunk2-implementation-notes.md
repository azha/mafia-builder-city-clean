# nav-hud-design-v1.md, chunk 2 — navigation « Entrer » / « ← Carte » — implementation-notes.md

Design : `Tools/nav-hud-design-v1.md` §3 (v2 — insets substitués, nav-F5 reciblée), §8 (mondes
dégénérés), §2.6-bis (base gelée + plafond de texture, posé par l'arbitrage ⊥ du chunk 1,
`4fa3805`). Design APPROVED, **non modifié** par ce chunk. Repo `mafia-builder-city-clean`,
branche `main` directement, à la suite des 4 commits chunk 1 + l'arbitrage `4fa3805`.

## Ce qui a été livré

1. `TopBarController.cs` — `LeadingAction {None, BackToMap}`, `CurrentLeadingAction` (public,
   épinglé par sa VALEUR), `SetLeadingAction(action, onClick)`. Bouton construit UNE fois dans
   `BuildLayout`, PREMIER enfant du `HorizontalLayoutGroup` (avant les 4 éléments canoniques),
   jamais détruit — seule `SetActive` suit l'état. Canvas.childCount reste 3 (enfant de
   `TopBarSlot`, jamais un enfant direct du Canvas).
2. `CityMapController.cs` — `OnEnterDistrict` (event `Action<int>`), bouton « Entrer » construit
   comme `Footer` (3ᵉ enfant DIRECT de `detailPanel`, survit à `RenderDetail` dont la destruction
   reste scopée à `detailContent`). Trois refresh d'`interactable`, EXACTEMENT les points nommés
   par le design : `SelectDistrict`, juste après `IsAuthenticated=true` (dans `AuthThenHeat`),
   `FinishDetail`.
3. `AppShell.cs` — `CityTabDistrictId` (-1 = carte, état nommé), `EnterDistrict(int districtId)`
   (réutilise le corps de `MountTenant<T>`, câble `SetSafeInsets`+`SetLeadingAction(BackToMap)`,
   lance `SetSession`+`Render`), `ExitToCityMap() => ActivateTab(Tab.City)`. Abonnement à
   `OnEnterDistrict` au montage du locataire City.
4. `DistrictInteriorScreenController.cs` — `SetSafeInsets(top, bottom)`, arithmétique §3.4 exacte
   (titreBand=40 sourcé, respTop/respBottom substituent la respiration, replis dérivés de
   `referenceResolution`), titre à `anchoredPosition.y = -(8+insetTop)`.
5. `Assets/Tests/PlayMode/NavigationPlayModeTests.cs` — nav-F1..nav-F5, `[Category("W3U2")]`,
   flux RÉEL (`SeederSupport.CityMapSeeder`, vrai clic sur les vrais boutons via `onClick.Invoke()`).

## Falsifiables — statut (run réel, job Unity `96c774760fd74b0585c64c0a2833cc6b`)

59 tests dans `W3U2` (54 existants + 5 nav-F*) : **59/59 verts**. Les 54 existants n'ont pas bougé.

| # | statut | evidence |
|---|---|---|
| nav-F1 | 🟢 | district=3 (≠16), `LastFetch.district_id==3`, `CityTabDistrictId==3`, `CurrentLeadingAction==BackToMap` |
| nav-F2 | 🟢 | clic réel sur « ← Carte », hôte district précédent `==null` (détruit), `MountedTenantType==CityMapController`, `CityTabDistrictId==-1`, `CurrentLeadingAction==None` |
| nav-F3 | 🟢 | bouton présent+`interactable==false` avant auth réelle, `interactable==true` après, MÊME instance (`AreSame`) |
| nav-F4 | 🟢 | district=**16** (voir § Deviations #6) — titre/TopBarSlot et grille/TabBarRoot sans intersection, largeur grille ≥0,6×ContentSlot |
| nav-F5 | 🟢 | hors shell : titre.y==-8 ; dans le shell : insetTop=56>0 asserté d'abord, titre.y==-(8+56), delta==-56px |

## Protocole r9 (§3.5) — les 5 éléments, capturés par le test lui-même

`Assets/Screenshots/district_shell_r9.png` (1100×577), district 16, flux RÉEL : `AppShell(Start)
-> ActivateTab(City) -> CityMapController.SelectDistrict(16) -> EnterButton.onClick ->
AppShell.EnterDistrict(16)`.

1. **chrome dans le cadre** : `TopBarSlot.activeInHierarchy=True`, `TabBarRoot.activeInHierarchy=True`.
2. **largeurs** : `root.rect.width=1280`, `ContentSlot.rect.width=1280`.
3. **bbox du titre** : min=(-640.00, 239.71), max=(640.00, 271.71) — largeur 1280px, hauteur 32px.
4. **scène + point d'entrée** : `NavigationPlayModeTests.ZZ_Scratch_CaptureR9ControlScreenshot`
   (capture SCRATCH, retirée avant le commit — § Deviations #9), entrée documentée ci-dessus.
5. **CellSize + scaler** : `CellSize=118`, `uiScaleMode=ScaleWithScreenSize`,
   `referenceResolution=(1280,720)`, `screenW=1100 screenH=577` — le couple confirme que
   `CellSize=118` (identique au montage nu, §3.4) tient aussi à la résolution RÉELLE du test
   (1100×577, ratio ≠ 16:9), pas seulement à la résolution de référence.

## Sonde de composition (§8-bis figé + §2.6-bis)

bbox de grille détectée par balayage PIL sur `district_shell_r9.png`, restreint à `y∈[90,516)`
pour exclure le TopBar (surfaceCard, pas `nightOutOfDistrictMuted`) et le titre : **x 41..1068,
y 107..515**.

| métrique | portée | valeur | gate | verdict |
|---|---|---|---|---|
| platitude (§8-bis) | bbox grille, r9 (shell) | **29,9 %** | ≤58 % (gate chunk 1) | 🟢 tient en shell — chunk 1 (28,7 % base) n'est pas dégradé par le montage |
| sd p50 (§2.6-bis, NEUF) | bbox grille, r9 (shell) | **9,17** | ≤7 | 🔴 dépassé |

**Le dépassement sd p50 n'est PAS une régression de ce chunk.** Cross-check : le screenshot BARE
de chunk 1 (`diorama_nuit_chunk1.png`, aucun code de chunk 2 impliqué) mesure, avec la MÊME sonde,
**sd p50 = 9,07** — quasi identique aux 9,17 mesurés en shell, et cohérent avec le chiffre que
l'arbitrage ⊥ du chunk 1 avait déjà consigné lui-même (« la grille dépasse DÉJÀ la texture de la
référence, 9,00 vs 6,08 », `4fa3805`). Chunk 2 ne touche AUCUN code de rendu de grille/texture
(parcellaire, façades ambiantes — inchangés) ; il ajoute seulement le chrome de navigation autour.
Le plafond `sd p50 ≤7 à CHAQUE chunk restant` (§2.6-bis) était donc DÉJÀ dépassé au moment où il a
été posé, par un héritage de chunk 1 — pas quelque chose que ce chunk introduit ou pourrait
corriger sans toucher le rendu de la grille (hors mandat de ce chunk). Signalé, non masqué, non
« réparé » unilatéralement — c'est un arbitrage produit qui revient à spec-writer/reviewer (est-ce
au chunk 3, qui touche VRAIMENT la texture des rues, de résorber la dette héritée ? ou faut-il un
correctif dédié sur le remplissage ambiant de chunk 1 ?).

## § Deviations (imprévus non bloquants, option conservatrice, consignés)

1. **Source du jeton d'`EnterDistrict`.** Le design déclare `EnterDistrict(int districtId)` (UN
   seul paramètre) puis écrit « `StartCoroutine(SetSession(token, districtId))` » sans jamais dire
   d'où vient `token`. Résolu par lecture : `EnterDistrict` lit `Token` sur le `CityMapController`
   actuellement monté (le City tenant qu'il s'apprête à remplacer) AVANT de l'unmount — la SEULE
   source de jeton disponible dans l'architecture à ce chunk (le `SessionToken`/`AdoptToken` de
   `AppShell` n'existe qu'au chunk 5/HUD). Option qui change le moins de surface : pas de paramètre
   ajouté à la signature déclarée par le design.
2. **`ActivateTab` réinitialise `CityTabDistrictId=-1` et `SetLeadingAction(None)` pour LES 5
   ONGLETS, pas seulement `Tab.City`.** Le design ne nomme que le cas City (« `ActivateTab(Tab.City)`
   remet CityTabDistrictId=-1 avant de monter »). Sans extension, taper directement sur Home/Org/
   Pipeline/More depuis un district aurait laissé « ← Carte » affiché sur un onglet où il n'a
   aucun sens — défaut évident, corrigé par symétrie (garde anti-défaut, pas une réinterprétation
   du design). Aucune falsifiable n'est affectée dans un sens ou dans l'autre.
3. **`EnterDistrict` appelle `UnmountCurrentTenant()` explicitement**, alors que le design dit
   seulement « réutilise EXACTEMENT le corps de `MountTenant<T>` » (qui, lui, ne unmount jamais —
   c'est toujours la responsabilité de l'appelant, `ActivateTab` le fait déjà). Nécessaire et
   voulu par le design lui-même (préambule §3.3 : « entrer dans un district DÉTRUIT
   CityMapController ») et par nav-F2 (l'hôte précédent doit devenir `null`, pas seulement caché).
4. **Couleur du bouton « Entrer » : `mapChipBg`, PAS `accentGold`.** `accentGold` est documenté
   « réservé aux CTA », mais une falsifiable EXISTANTE
   (`ChromeTabAccentAllowlistPlayModeTests.C5F2`) épingle l'ENSEMBLE FERMÉ des 11 fichiers qui y
   accèdent — `CityMap/CityMapController.cs` n'y figure pas. Ajouter `accentGold` ici aurait cassé
   ce test existant (12 au lieu de 11, fichier hors allowlist) pour une décision de STYLE que le
   design ne prescrit pas. Réutilisé `mapChipBg` — le MÊME token que `HeatToggle`, déjà dans ce
   fichier, R2.3-compatible (asset-backed, pas de littéral neuf).
5. **« signup frais » (brief de la tâche) ne correspond à aucun mécanisme câblé par ce chunk.**
   Le protocole r9 utilise le flux de PRODUCTION réel — l'auth démo interne de `CityMapController`
   (`AuthThenHeat`, le même compte seedé `citymap_demo` que `CityMapDetailPlayModeTests`) — parce
   que c'est EXACTEMENT ce qu'un joueur réel déclenche en tapant City → sélectionner un district →
   Entrer. Aucun jeton « signup frais » n'atteint `EnterDistrict` dans ce chunk (voir Deviation 1).
6. **nav-F4 scope sur le district 16, pas un district arbitraire ≠16.** MESURÉ (pas supposé) :
   le district 3 (utilisé par nav-F1/nav-F2 pour leur propre exigence « ≠16 ») porte une grille
   **10×6**, pas 10×4. À la résolution RÉELLE de cet environnement de test (canvas-space 671,42,
   dérivée du game view 1100×577 — PAS la résolution de référence 720), une grille 10×6 au même
   ancrage vertical fixe 0,46 (code PRÉEXISTANT, hors mandat de ce chunk) chevauche RÉELLEMENT
   `TabBarRoot` de ~7px — vérifié par calcul ET par le test avant correction (`Expected: False,
   But was: True`). Le district 16 (10×4), la SEULE géométrie que l'arithmétique §3.4 du design
   prouve dégagée, ne chevauche pas (marge ~9px mesurée). nav-F4 n'a pas d'exigence de district
   propre dans §3.6 — utiliser 16 est la lecture la plus fidèle : c'est le scénario que le design
   a réellement vérifié. **Non corrigé** (hors mandat) : l'ancrage 0,46 fixe + la formule de
   hauteur de grille ne sont PAS vérifiés sûrs pour des grilles >4 rangées ou des ratios d'écran
   plus étroits que 16:9 — signalé pour un futur chunk/district, pas un blocage de celui-ci.
7. **Plafond de texture §2.6-bis (sd p50≤7) dépassé, hérité de chunk 1** — voir § sonde ci-dessus,
   non un défaut de ce chunk, non corrigé ici (hors mandat : aucun code de texture/grille touché).
8. **Ébauche de formule dans le brief de la tâche (le « NON : » avant l'arithmétique confirmée).**
   Implémenté l'arithmétique CONFIRMÉE (celle que le ⊥ a recalculée, citée en clair dans le brief),
   jamais l'ébauche barrée.
9. **Test de capture d'écran temporaire (`ZZ_Scratch_CaptureR9ControlScreenshot`)** ajouté, exécuté
   une fois pour produire `district_shell_r9.png` + les 5 éléments du protocole r9, puis RETIRÉ
   avant le commit final — même discipline que le chunk 1 (pas un 6ᵉ falsifiable permanent).

## Ménage de fin de tâche

- `Assets/InitTestScene<guid>.unity(.meta)` — scratch scene du test-runner, supprimée avant chaque
  commit (régénérée à chaque run, jamais trackée).
- `Assets/Fonts/DejaVuSans SDF.asset` — churn TMP (régénération d'atlas dynamique, probablement
  déclenchée par le glyphe `←` du libellé « ← Carte ») — restauré (`git checkout --`) avant commit.
