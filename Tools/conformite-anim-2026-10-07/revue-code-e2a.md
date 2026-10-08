# Revue ⊥ de CODE — E2a `d4ba8a31` (branche `design/conformite-anim-2026-10-07`)

Relecteur indépendant (⊥), lecture seule, aucun Unity lancé. Spec : `Tools/conformite-anim-2026-10-07/design-couche-mouvement.md`
(§3, §5, §9, §10, §11). Journal : `Tools/conformite-anim-2026-10-07/implementation-notes.md`.
Hors périmètre volontaire (non reproché) : RetourAppui des 67 boutons (E2e), G2, G9, G14.

## Verdict : **NOT_APPROVED**

1 BLOCKING · 6 IMPORTANTS · 7 mineurs.

Le câblage lui-même est bon : j'ai retracé les quatre migrations ligne à ligne et n'ai trouvé **aucun** chemin où
l'état affiché reste faux dans le régime nominal (le cerclage ne reste ni braise ni laiton, l'aiguille est posée,
le bandeau est toujours effacé). Le BLOCKING est une garde livrée **rouge**, et sa redness est démontrable sans Unity.

---

## BLOCKING

### B1 — G10 est ROUGE comme livrée : deux `LateUpdate` de `Assets/Scripts` manquent à la liste fermée, dont une qui écrit une couleur par frame

`Assets/Tests/PlayMode/MouvementsGardesE2PlayModeTests.cs:40-49` déclare 7 entrées :

```
internal static readonly string[] UpdateAdmis =
{
    "CityMap/DistrictMapNavigation.cs:Update",                       // pan/zoom au doigt
    "Operational/Carnet/AppuiLong.cs:Update",                        // minuterie, aucune écriture visuelle
    "Operational/Exceptions/ExceptionQueueController.cs:LateUpdate", // `CalerLeZinc`, mise en page
    "Operational/Reputation/ReputationScreenController.cs:LateUpdate", // visibilité de l'ascenseur
    "Shell/AppShell.cs:Update",                                      // la touche retour
    "Shell/LaSuitePanelController.cs:LateUpdate",                    // `Ajuster` → `localScale` …
    "ShellContracts/LongPressButton.cs:Update",                      // minuterie, aucune écriture visuelle
};
```

**Mesure binaire** à `d4ba8a31` (arbre propre, HEAD vérifié), avec la MÊME règle que le scanner
(`void\s+(Update|LateUpdate|FixedUpdate)\s*\(\s*\)`, exclusion du préfixe `ShellContracts/Mouvements/`) :
**10 au total, 1 dans le mécanisme (`Regie.cs:184`), donc 9 hors mécanisme — pas 7.** Les deux non nommées :

- `Assets/Scripts/ShellContracts/SuiviDuCadre.cs:17` — `private void LateUpdate() => Maj();`
  (`Maj` écrit la mise en page : `rt.anchorMin = min; rt.anchorMax = max; rt.offsetMin = …` `:43-44`)
- `Assets/Scripts/ShellContracts/ListeDefilante.cs:160` — `private void LateUpdate() => Rafraichir();`
  et `Rafraichir` écrit **une couleur et deux positions par frame** (`:171-174`) :
  `Color c = Fondu.color; c.a = OpaciteCourante; Fondu.color = c;` puis `Pouce.sizeDelta = …`, `Pouce.anchoredPosition = …`

`G10(...)` (même fichier, `:87-88`) produit alors exactement deux violations
(« un Update/LateUpdate hors de la liste fermée du design §10 »), et `Assert.IsEmpty(v)` (`:99`) rougit.
Aucune entrée morte en sens inverse (les 7 nommées existent toutes). Le message de commit annonce
« gardes G6 G10 G11 » : G10 ne peut pas passer au créneau.

Ce n'est pas une simple erreur de transcription : `ListeDefilante.Rafraichir` écrit un **alpha de `Graphic`**
à chaque frame hors de `Mouvements/` — c'est X1 (« aucune animation visuelle écrite à la main hors du
mécanisme »). Et la liste du design §10 est elle-même fausse : elle dit « 10 `Update`/`LateUpdate` mesurés dans
`Assets/Scripts` : 3 migrés, 7 nommés » ; la mesure dit **12 avant E2a** (9 + les 3 migrés). Le coder a recopié
un compte **déduit** du design au lieu de le **compter** — exactement la classe de défaut que la liste « fermée »
prétend empêcher.

**Correction** (deux gestes, le second est du ressort du `spec-writer`) :
(a) re-mesurer et nommer les deux, avec leur raison, dans `UpdateAdmis` — le fondu de `ListeDefilante` est piloté
par la POSITION de défilement, pas par le temps : c'est de la mise en page, comme `LaSuitePanelController` ; ou
migrer ce fondu vers une piste `Parametre`/`Alpha` ;
(b) amender la liste FERMÉE du design §10 dans le même lot (le compte « 10 » et le « 7 nommés » sont faux).

---

## IMPORTANTS

### M1 — `de` = la cible précédente (déviation 2) : pop visible sur un chemin réel, alors que la valeur en vol EST stockée

`Assets/Scripts/Shell/TopBarController.cs:879-891` :

```
private void Virer(Entree virage, Image cible, ref bool chaud, ref Handle tenu, bool versLeChaud)
{
    if (cible == null || chaud == versLeChaud) return;
    Handle h = RegieMouvement.Transitionner(virage, cible.rectTransform, chaud ? 1f : 0f, versLeChaud ? 1f : 0f);
```

`chaud` mémorise la **cible demandée au dernier appel**, pas ce que le pixel montre. Deux bascules à moins de
0,6 s (la durée du virage) et l'anneau **saute** à l'ancienne cible avant de repartir : le CSS `transition` ne fait
jamais ça. Chemin réel : `AppShell.cs:304` (`ActivateTab` → `SetDescente(false)`) puis `AppShell.cs:459`
(`EnterDistrict` → `SetDescente(descente)`) encadrent un aller-retour réseau ; sur un back local le délai peut
tomber sous 0,6 s, et le cerclage clignote laiton → braise à chaque entrée en district pendant une descente.

La déviation dit « la régie n'expose pas la valeur courante d'une piste ». C'est vrai de l'API, pas de la donnée :
`Assets/Scripts/ShellContracts/Mouvements/RegieInterne.cs:304` conserve `ecrit = m` (la dernière valeur `Melange`
écrite sur le couple). Et la déviation 4 montre qu'ajouter un accesseur de **lecture seule** (`Inspecter`) était
dans le périmètre d'E2a. L'option conservatrice était donc disponible.

**Correction** : un `bool ValeurCourante(RectTransform, Propriete, out float)` sur `Regie`, et `Virer` /
`PoserLAiguille` passent cette valeur en `de` quand elle existe.

### M2 — une piste libérée par la règle des 30 s laisse son propriétaire avec un cache qui ment

`Assets/Scripts/ShellContracts/Mouvements/Regie.cs:235-243` libère une piste dont la cible est inactive plus de
30 s d'horloge de régie — et le test d'inactivité précède `if (p.fini) return;` (`:250`), donc **une
`Transitionner` FINIE qui TIENT est libérée aussi**, avec `Restituer()` (retour à `CouleurA` = laiton).

Or les deux propriétaires court-circuitent sur un cache :
- `TopBarController.cs:881` : `if (cible == null || chaud == versLeChaud) return;`
- `TopBarController.cs:748` : `if (Descente == descente) return;`

Après une libération, le cerclage est **repeint en laiton par la régie** et plus rien ne le remet en braise ; le
pouls ne se ré-attache jamais. J'ai vérifié que ce n'est **pas atteignable pour le chrome** (le `TopBarSlot` et la
TopBar sont persistants, « never torn down » — `AppShell.cs:142-144` ; aucun `SetActive(false)` sur eux dans
`AppShell.cs`). Mais `Gyrophare` attache sa piste une seule fois (`Gyrophare.cs:85`, dans `Poser`) et ne la
ré-attache jamais : dès que l'arbre du district est désactivé 30 s, la lueur se fige sur sa teinte de base et ne
retourne plus jamais.

**Prémisse non démontrable statiquement** → à trancher au créneau, mais **aucun test actuel ne la tranche** :
il faudrait, dans `MouvementsRegiePlayModeTests` ou un voisin, un cas « cible désactivée, 31 s d'horloge figée,
réactivée ⇒ la piste a disparu et le propriétaire ne le sait pas », avec le gyrophare comme sujet.

**Correction** : la libération par horloge doit passer par `quandFini` (ou un compteur lisible par le propriétaire),
ou les propriétaires doivent consulter `EstVivant(tenu)` avant de court-circuiter sur leur cache.

### M3 — B10 (`PoserLAiguille`) n'est couvert par AUCUN test

§9 exige, pour `SetCitywideHeatBucket` : « **l'aiguille ne saute pas** ; `HeatNeedleAngleDegrees` reste la bande ;
sortie de descente : aiguille sur sa bande ». Les deux derniers sont dans `T1`. Le premier n'est nulle part :
`grep` sur tout `Assets/Tests` ne trouve `CatalogueHud.AiguilleBalayage` que dans
`MouvementsRegiePlayModeTests.cs:335,375,948` (tests de la RÉGIE, cibles synthétiques) et
`MouvementsGardesPlayModeTests.cs:66-68` (tests de la DONNÉE). Rien ne touche
`Assets/Scripts/Shell/TopBarController.cs:725-734`.

Conséquence : le drapeau `aiguillePosee` (`:719`, `:733`) et le court-circuit `Mathf.Approximately(ancien, bande)`
(`:727`) ne sont exercés par rien. `T1` ne change jamais de bande après le premier `SetCitywideHeatBucket("WARM")`.

**Correction** : un test de contrôleur sur régie de test — (a) première pose = directe, `PistesVivantes` inchangé ;
(b) second bucket ⇒ une piste `chrome.aiguille.balayage` et, à mi-balayage, `Mathf.DeltaAngle(0, needle.z)`
strictement entre les deux bandes ; (c) à la fin, la nouvelle bande.

### M4 — la pose « Mouvement réduit » des trois boucles ambiantes est le CREUX : décision de donnée non consignée, visible sur la fumée

`Assets/Scripts/ShellContracts/Mouvements/CatalogueHud.cs:175` :
`Iteration.InfiniFois, alterne: false, poseDeReposS: AmbiancePeriodeS * 0.5f` ⇒ `PhaseDePose` = 0,5 ⇒ le facteur
figé est le **creux**. Pour `diorama.fumee` le creux est 0,31 : sous `Reduit`, la fumée se fige à
0,35 × 0,31 = **0,109** d'alpha effectif, contre 0,35 au repos — trois fois plus pâle, en permanence.

Le pouls a eu droit, lui, à un raisonnement explicite pour éviter exactement ça
(`CatalogueHud.cs:34-37` : « ni le creux 0,45 (éteint, immobile = "rien ne se passe"), ni la crête 1 » ⇒
`PoulsPoseReduitS = 0.1638f` ⇒ α 0,72, décision f2 / dette 17). La déviation 6 de `implementation-notes.md`
nomme la période, l'`ease-in-out` et le déphasage — **pas la pose**. C'est une décision de donnée prise seule,
avec un effet visible, et muette.

**Correction** : poser une pose intermédiaire (comme le pouls) ou consigner le choix et le faire ratifier.

### M5 — la ligne « Mouvement réduit » disparaît quand le profil ne répond pas

`Assets/Scripts/Account/Settings/SettingsScreenController.cs:163-172` : `if (EtatVide) { … return; }` précède le
tiroir « Le jeu », donc la bascule aussi (`:197-204`). Or ce réglage est **purement local**
(`PlayerPrefs` via `MouvementReduit.Stockage`, aucun réseau — c'est écrit dans le commentaire `:195-196`).
Une panne de `GET` prive le joueur de la seule option d'accessibilité du client.

La déviation 8 dit « visible seulement quand le profil est rendu (comme les autres) » : mais les deux autres
bascules **lisent** le profil (`Profil.meta_market_visibility_enabled`, `Tutoriels`), celle-ci non. « Comme les
autres » n'est pas une raison ici, c'est un alignement de forme.

**Correction** : rendre la ligne aussi dans l'état vide, ou dire explicitement pourquoi un réglage local doit
attendre le réseau.

### M6 — JNI Android : rien ne peut le trancher, et l'échec est muet

`Assets/Scripts/ShellContracts/MouvementReduit.cs:71-92`. Le test `N3_Android_…`
(`Assets/Tests/PlayMode/MouvementReduitPlayModeTests.cs:124-143`) lit le **texte** de la source
(`#if UNITY_ANDROID && !UNITY_EDITOR`, un seul point d'entrée JNI, `Appliquer()` dans
`OnApplicationPause`) — ce qu'il dit, il le prouve ; mais **aucun test du créneau ne peut trancher le
comportement**, le bloc n'étant pas compilé en éditeur. Et :

```
catch (Exception)
{
    return false;   // une lecture qui échoue ne force pas le mouvement réduit…
}
```

ne journalise rien. Point de risque précis : `reglages.CallStatic<float>("getFloat", resolveur, nom, 1f)` (`:82`)
passe un `AndroidJavaObject` dont Unity dérive la signature de la classe **runtime**
(`android.app.ContextImpl$ApplicationContentResolver`), alors que `Settings.Global.getFloat` est déclarée sur
`android.content.ContentResolver`. Unity a un repli par `Class.getMethods()`, donc ça peut marcher — je ne
l'affirme pas. Le défaut est SÛR (le réglage joueur reste seul), d'où IMPORTANT et non BLOCKING. Mais en l'état,
si la source système est morte, **personne ne le saura jamais**.

**Correction** : `Debug.LogWarning` dans le `catch` (avec le message de l'exception), et inscrire la vérification
**sur appareil** comme dette datée — en disant explicitement qu'aucun test du créneau ne la couvre.

---

## Mineurs

1. **m1** — `Assets/Tests/PlayMode/DistrictDescentePlayModeTests.cs:287` (`T1_SansRegie_…`) ne remet pas le
   registre à zéro avant de mesurer « hôte nu », contrairement à `BandeauEphemerePlayModeTests.cs:134`
   (`RegieMouvement.Oublier();` en première ligne de `B10_SansRegie_…`). Si une régie fuit d'une autre suite
   (un `AppShell` non détruit), ce test mesure l'inverse de ce qu'il annonce. Ajouter `RegieMouvement.Oublier()`.

2. **m2** — `Assets/Scripts/Shell/AppShell.cs:51-56` : `RegieMouvement.Publier(RegieDeMouvement)` écrase `Courante`
   sans garde ni journal. Deux shells dans une scène de test (ou un `PourTest()` déjà publié) : le second vole le
   registre, les `Attacher` ultérieurs du premier partent dans la régie du second, et à la destruction du second ils
   tombent en `SansRegie`. `OnDestroy` (`:45`) est, lui, correctement gardé par `ReferenceEquals`. Journaliser (ou
   refuser) une publication qui écrase une régie vivante.

3. **m3** — `Assets/Scripts/ShellContracts/Mouvements/Regie.cs:510-514` refuse sur `nMelange >= PistesMelangeMax`
   **avant** le calcul des remplacements (`:530-538`) : une `Transitionner` qui ne ferait que REMPLACER une piste
   `Melange` déjà posée sur le même couple peut être refusée au plafond. 2 pistes sur 10 au HUD aujourd'hui ;
   à corriger avant ⑮ (6 voyants) — compter le remplacement avant le quota.

4. **m4** — `Assets/Scripts/ShellContracts/Mouvements/Gardes.cs:76` : `else if (c.P == Propriete.Echelle && …)`.
   `EchelleX`/`EchelleY` **passent**. La déviation 3 le consigne (« à trancher avant E3 »), mais des deux options
   c'est la moins conservatrice : refuser aurait été sûr (aucune entrée du HUD n'en pose). Dire pourquoi, ou refuser.

5. **m5** — `Assets/Scripts/ShellContracts/MouvementReduit.cs:41,44` : deux champs statiques **mutables**
   (`Stockage`, `LectureDuSysteme`) que `RegieMouvement.Oublier()` (`RegieMouvement.cs:60-67`) ne remet pas.
   Deux suites les restaurent à la main (`ReglagesPlayModeTests.cs:243-244`,
   `MouvementReduitPlayModeTests.cs:36-37`) ; toute suite qui oublie laisse un stockage de test aux suivantes.
   Mettre la remise à zéro dans `Oublier()`.

6. **m6** — `MouvementReduit.cs` est en espace de noms `MafiaCleanCity.Mouvements` mais **hors** de
   `Mouvements/` ; la portée de G7 est le CHEMIN (`Gardes.G7(nomFichier, source)`), donc ses motifs interdits ne
   s'y appliquent pas. Justifié (déviation 8, et aucun motif de `Gardes.MotifsInterdits` n'y serait violé — vérifié),
   mais « namespace ≠ dossier » est un angle mort pour une garde de source : le dire dans l'en-tête de `G7`.

7. **m7** — `Assets/Tests/PlayMode/DistrictInteriorAmbientLoopsPlayModeTests.cs:79-96` (`AssertToutesVivent`) ne
   prouve que « ça bouge » (`maxi - mini > 0.02f`). Les facteurs MESURÉS du §9 ([0,88 .. 1], [0,31 .. 1]) ne sont
   vérifiés que sur la donnée (`MouvementsGardesPlayModeTests.cs:98-100`). Le seuil 0,02 est très lâche pour une
   amplitude de 0,12 : nommer l'amplitude attendue par source rendrait le test mordant sur le CÂBLAGE aussi.

---

## Ce que j'ai vérifié VERT (et comment)

- **Pouls / tremble** : `Update` supprimé ; 3 pistes `Alerte` (`Pouls` ×2 cibles + `Tremble`).
  Les `CanvasGroup` sont posés sur des FEUILLES (`BoitierRing` = `ringGo`, aucun enfant — `BoitierFace` est un
  frère, `TopBarController.cs:1346,1388` ; `Hairline` = `hlGo`, aucun enfant — `:1104-1142`), donc aucune fratrie
  ne fond avec eux.
- **Signe CSS→Unity du tremble** : catalogue `TrembleAmplitudeDeg = -4f` (`CatalogueHud.cs:38`) ;
  `Sign(NeedleAngleDegrees(Burning) − NeedleAngleDegrees(Cold))` = `Sign(−60 − 60)` = **−1**
  (`HeatBucketResolver.cs:174-177`), donc `4f * versLeChaud = −4` : l'épinglage de T2 est conservé **au signe près**,
  et T2 ajoute un balayage de signe sur tout le cycle + un contrôle négatif (`+4` distingué).
- **Le « coude » de la courbe** : `Pouls(0.125 × 1.1)` = `LerpUnclamped(1, 0.45, Ease(0.25))` avec
  `Aisance.Ease = (0.25, 0.1, 0.25, 1)` (`Aisance.cs:22`) ⇒ **0,7753**, et le contrôle négatif écarte le 0,914 du
  `SmoothStep`. L'assertion n'est pas une tautologie.
- **L'assertion VIDE de `:164`** : remplacée par une lecture du `CanvasGroup` du cerclage, avec un contrôle négatif
  RÉEL et voisin (`DistrictDescentePlayModeTests.cs:276-284`) qui fait la MÊME lecture au MÊME instant sans
  désarmer. J'ai calculé la valeur armée à `PoulsEnMontee` (phase 0,745 ⇒ α ≈ 0,885) : elle tombe bien du bon côté
  des seuils `< 0.95` et `1 − α > 0.05`. **Non vacuous.**
- **Jetons vs catalogue** : `Laiton = 0xb08d3e` ⇒ (0,6902 / 0,5529 / 0,2431) contre
  `hudHairlineGold: {r: 0.69, g: 0.553, b: 0.243}` et `Braise = 0xe0664a` ⇒ (0,8784 / 0,4 / 0,2902) contre
  `hudGaugeArcHot: {r: 0.878, g: 0.4, b: 0.29}` (`Assets/Resources/DesignTokens.asset:71,77`) :
  écart max 4·10⁻⁴, bien sous le `1f/255f` des assertions de T1.
- **`SetDescente` double appel** : gardé par `if (Descente == descente) return;` (`TopBarController.cs:748`) —
  aucune fuite de piste.
- **`SetDescente(false)`** : les trois `Detacher` précèdent la réécriture + `Rebaser` ; sans balayage en vol le
  couple `Rotation` est libéré (refs 0) et `Restituer` repose la base, puis l'écriture directe pose la bande ;
  le `Rebaser` qui suit est alors un no-op inoffensif (aucun couple). `cgPose = true` pour les deux pouls ⇒
  `cg.alpha = 1f` restitué (§9 : « doit valoir 1 »). ✅
- **Virages B6/B7** : un virage vers la braise TIENT (`FinRejointLaBase` : `|Melange − 0| > eps` ⇒ false,
  `Regie.cs:396`) ; un virage vers le laiton rejoint la base et se libère avec restitution vers `CouleurA`.
  Le remplacement d'une transition en vol ou tenue fonctionne (`Regie.cs:530-538` + `:580`), et le couple n'est
  pas re-`Init` (refs 2 → 1) ⇒ **aucun flash au remplacement**. Repli sans régie : `Detacher(tenu)` **avant**
  l'écriture directe (`TopBarController.cs:885`), donc le virage tenu ne réécrit pas sa braise. ✅
- **Bandeau** : `Effacer` ET `Annoncer` détachent (`BandeauEphemere.cs:275-276`, `:290-291`) ; `surFonduFini` est
  mis en cache une fois (`:214`) donc 0 allocation par fondu ; `Effacer` appelé **depuis** `quandFini` de sa propre
  piste est sûr — `NotifierFins` (`Regie.cs:358-378`) protège par génération (`p.gen != finisGen[k]`) et
  `p.vivante`, et `LibererPiste` n'est pas réentrant sur une boucle de `couples` en cours. L'alpha est bien
  restitué à 1 (`cgPose == false`, le bandeau a son `CanvasGroup` depuis `:213`). Perte d'annonce couverte par
  `B11_PerteDAnnonce_…`. ✅
- **Boucles ambiantes** : facteurs conformes au §9 (crête = base, amplitude 0,24) ; période 2π/1,6 = 3,927 ;
  déphasage par instance via `Reglage.AvecPhase(-avance)` (un `PhaseS` négatif = en avance, cohérent avec
  `Regie.cs:281` `p.age - p.reg.PhaseS`) ; budget 4 tenu par `TryStartAmbientLoop` et compte épinglé indépendant
  de la régie ; `ClearContent` → `DetacherSous(enfant)` avant `Destroy` (`IsChildOf` inclut la racine) ⇒ le compte
  est juste **dès** le second rendu, pas au `Tick` suivant. Toutes les sources sont bien des `RectTransform`
  (`NewUI` crée `typeof(RectTransform)`, `TryBuildOverlay` aussi) ⇒ pas de `InvalidCastException`. ✅
- **Clé i18n** : `Slug("Mouvement réduit")` (`Libelle.cs:165-176`, NFD + strip des diacritiques) = `mouvement_reduit`
  ⇒ `reglages.bloc.mouvement_reduit` via `Lib` (`SettingsScreenController.cs:472-473`). Conforme à la convention
  de ⑲, inscrite à `ZeroRepliDesLocatairesPlayModeTests.DetteDatee`, aucune clé renommée. `sous` vaut `null`
  **brut** (pas `Lib(null)`) : aucun appel `De` de plus, aucun repli de plus. ✅
- **G11** : prédicat conforme au §10 v4.4, mot pour mot (parent DIRECT pour la translation ; cible OU ancêtre pour
  l'échelle, via `GetComponentInParent<ContentSizeFitter>(true)` qui inclut la cible). Consulté dans la boucle de
  **faisabilité** de `Creer` (`Regie.cs:526-527`), donc **sans effet de bord** avant l'acquisition. Aucun test E1
  n'attache de translation/échelle sous un `LayoutGroup`/`ContentSizeFitter` (`grep` sur
  `MouvementsRegiePlayModeTests`, `MouvementsGardesPlayModeTests`) ⇒ rien d'E1 n'est cassé. ✅
- **Invariant 0-alloc** : ni `Gardes.G11` ni `Inspecter` ne sont dans `Tick` ; `G11` ne concatène qu'en cas de
  violation ; `Inspecter` n'alloue pas. ✅
- **G10 (anti-vacuité du scanner)** : il lit bien `Path.Combine(Application.dataPath, "Scripts")`, exige
  `sources.Count > 150` (**210 fichiers .cs** mesurés), `coroutines > 100` (**368 déclarations `IEnumerator`**
  mesurées) et vérifie que `Regie.Update` est vu malgré l'exclusion. Le lecteur gère le corps-expression, les
  littéraux de caractère (`'}'`), les chaînes blanchies, les commentaires. Contrôles négatifs riches et réels. ✅
  (C'est la LISTE, pas le scanner, qui est fausse — B1.)
- **Règle dure « aucun nouvel Update/LateUpdate/coroutine visuel »** : E2a n'en ajoute aucun ; il en **retire** 3
  (`TopBarController.Update`, `Gyrophare.Update`, `AmbientPulseLoop.Update`) et vide le fondu de la coroutine du
  bandeau. Le type `AmbientPulseLoop` et son `.meta` sont bien supprimés. ✅
- **Règle dure « aucun `Graphic.color` direct sur une cible gérée quand une piste existe »** : les seules écritures
  restantes sur `hairline`/`boitierRing` sont à la CONSTRUCTION (`:1130`, `:1348`, avant toute piste) et le repli de
  `Virer` (après `Detacher`, donc sans piste). `Gyrophare` écrit `image.color = TeinteA(0f)` **avant** `Attacher`
  (`Gyrophare.cs:84-85`). Les sources d'ambiance ne voient jamais leur `Graphic.color` touché par la régie. ✅
- **`AppShell`** : `CreerLaRegie()` est bien **avant** `BuildLayout()` dans `EnsureInitialized` ; la régie est sur le
  GameObject du shell ; `MouvementReduit.Appliquer()` avant `Publier` ⇒ `Publier` pose `PolitiqueGlobale` sur la
  régie neuve (ordre correct) ; `OnDestroy` ne dépublie que SA régie (`ReferenceEquals`) ; `OnApplicationPause(false)`
  relit les deux sources (§5). ✅

---

## Jugement des 11 déviations

| # | sujet | verdict |
|---|---|---|
| 1 | Repli quand la régie ne rend pas de piste | **JUSTIFIÉE.** C'est l'option conservatrice : sans elle, tout hôte nu montrerait un cerclage laiton sur une ville qui brûle et un bandeau qui ne s'efface jamais. L'ordre est le bon (`Detacher(tenu)` **puis** écriture directe) et le §3 (« plus aucune écriture directe ») reste vrai dès qu'une piste existe. Couverte par `T1_SansRegie_…` et `B10_SansRegie_…`. |
| 2 | `de` = la cible précédente, pas la valeur en vol | **FAUTIVE (M1).** Consignée, donc pas une faute de procédure — mais ce n'était pas l'option conservatrice : la valeur en vol est stockée (`RegieInterne.cs:304`) et la déviation 4 prouve qu'un accesseur de lecture était dans le périmètre. Pop visible sur un chemin réel. À retrancher. |
| 3 | G11 : REFUS à l'attachement (3 lignes d'E1) | **JUSTIFIÉE.** §10 dit « refusée » : le refus runtime est la lecture littérale, et il est posé sans effet de bord. Aucun test E1 n'est cassé (vérifié). Réserve : le point ouvert `EchelleX`/`EchelleY` est résolu en **laissant passer**, l'option la moins sûre des deux (m4). |
| 4 | `Regie.Inspecter(rang, out, out)` | **JUSTIFIÉE et bien bornée.** Lecture seule, 0 allocation, bornes testées (`Inspecter(-1)`, `Inspecter(PistesMax)`). Sans elle G6 ne peut rien dire : c'est l'ajout minimal. |
| 5 | G2 non fait | **JUSTIFIÉE** (et hors périmètre de cette revue). Le raisonnement est juste : avec 46 entrées d'écran absentes du code, la garde serait rouge par construction ou tautologique. La note nomme bien le moment de fermeture (revue ⊥ puis E3/E4). |
| 6 | Trois boucles au catalogue, `Pistes` 2+1+1 | **JUSTIFIÉE pour le budget** (G4 somme les `Pistes` d'un écran ; 4+4+4 = 20 > 16 serait rouge par construction), et la répartition conventionnelle est dite. **INCOMPLÈTE** : la pose sous `Reduit` (le creux) n'est pas consignée et a un effet visible (M4). |
| 7 | `ClearContent` détache (`DetacherSous`) | **JUSTIFIÉE.** Non seulement correcte, mais c'est elle qui rend `C10F2c` juste dès le second rendu (sinon 4+3 = 7 jusqu'au `Tick` suivant — exactement le rouge déjà mesuré sur l'ancien mécanisme). |
| 8 | `MouvementReduit` hors `Mouvements/`, stockage injectable, ligne sans sous-ligne, clé neuve | **JUSTIFIÉE dans l'ensemble.** Le placement est raisonné (E/S plateforme), le stockage injectable évite les `PlayerPrefs` de l'éditeur, la sous-ligne omise est propre (`null` brut), la clé dérivée est **vérifiée exacte** et inscrite à la dette. **Deux réserves** : la ligne n'existe pas dans l'état vide (M5) et les champs statiques ne sont pas remis par `Oublier()` (m5). |
| 9 | JNI compilé à part, faute injectée | **HONNÊTE mais sous-outillée (M6).** Compiler n'est pas exécuter, et la note le dit — c'est bien. Mais le `catch` muet rend un échec d'appareil indétectable à vie, et la note ne nomme pas de mesure sur appareil comme dette. |
| 10 | Source de `bandeau.sortie` reformulée | **JUSTIFIÉE**, triviale, bien faite (la citation de ligne morte a disparu, `PROPOSE:` conservé). |
| 11 | Noms de tests gardés, contrôle négatif voisin, 7 → 10 entrées | **JUSTIFIÉE et VÉRIFIÉE.** `T1_ControleNegatif_…` fait bien la MÊME lecture au MÊME instant sans désarmer, et j'ai recalculé que la valeur armée (≈ 0,885) tombe du bon côté du seuil. `Hud_LeCatalogueDuChrome_PasseToutesLesGardes` : `Assert.AreEqual(10, CatalogueHud.Entrees.Count)` ⇒ compte exact (7 chrome + 3 boucles). |

**Bilan des déviations : 9 justifiées (dont 2 avec réserve), 1 fautive (n° 2), 1 honnête mais sous-outillée (n° 9).**
Aucune n'appelait un STOP pour conflit de canon.

---

## Auto-audit du verdict

J'affirme avoir **lu les fichiers**, pas un résumé : les 10 diffs de source et les 8 fichiers de tests du commit,
plus `Regie.cs`, `RegieInterne.cs`, `RegieMouvement.cs`, `CatalogueHud.cs`, `Courbes.cs`, `Aisance.cs`,
`PolitiqueMouvement.cs`, `MouvementTunables.cs`, `Couleurs.cs`, `MouvementReduit.cs`, `Gyrophare.cs`,
`Libelle.cs`, `HeatBucketResolver.cs`, `SuiviDuCadre.cs`, `ListeDefilante.cs` et `DesignTokens.asset`.

Les comptes que j'asserte ont été **mesurés**, pas déduits :
- 10 `Update`/`LateUpdate`/`FixedUpdate` dans `Assets/Scripts`, 9 hors `Mouvements/`, 2 hors liste — double
  mesure (grep + script Python reproduisant la règle du scanner), résultats identiques.
- 210 fichiers `.cs` sous `Assets/Scripts`, 368 déclarations `IEnumerator` (planchers d'anti-vacuité du test).
- Valeurs des jetons lues dans `Assets/Resources/DesignTokens.asset`, converties à la main et comparées au
  `1f/255f` des assertions.
- `Slug("Mouvement réduit")` dérivé à la main depuis `Libelle.cs:165-176`.
- Angles `Burning = −60` / `Cold = +60` lus dans `HeatBucketResolver.cs:174-177` pour établir le signe du tremble.

Ce que je **n'ai pas** tranché et ne prétends pas avoir tranché : le comportement du JNI sur appareil (M6), la
réalité du pop de M1 sous une latence réseau donnée, l'atteignabilité de M2 pour le gyrophare, et l'exécution
effective des tests de contrôleur (créneau). Pour chacun j'ai nommé ce qui le tranche.
