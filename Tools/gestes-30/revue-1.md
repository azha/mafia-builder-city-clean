# ㉚ « Les deux gestes » — revue INDÉPENDANTE (⊥) du lot client, 2026-11-11

Relecteur ⊥ : contexte neuf, n'a rien écrit de ce lot (auteur ≠ relecteur). Revue **STATIQUE** : Unity n'a pas été
lancé, la porte n'a pas été prise, **aucun fichier du lot n'a été modifié**.

Objet : worktree `/home/erutheone/project/mafia-unity-C1`, branche `lot/client1-gestes-30-2026-11-11` @d886738a,
changements NON commités (5 fichiers modifiés + 3 neufs + `Tools/gestes-30/`).

Référentiel de la revue : `Tools/gestes-30/DESIGN.md` · `CLAUDE.md` du worktree ·
`~/project/mafia-clean-city/CLAUDE.md` §3 (V1-V21) · maquette **RATIFIÉE**
`~/project/atelier3d-mafia-C1/poser-chaine-gestes.py` + `poser-chaine-routes.py` (lecture seule) ·
code back `~/project/mafia-clean-city/services/game-back/src` (lecture seule).

## VERDICT : NOT_APPROVED

1 BLOCKING, 2 MAJOR, 6 MINOR. Les deux MAJOR sont des défauts que **aucun test du lot ne peut voir** (l'un parce
qu'il ne mord que sous le shell, l'autre parce qu'il ne mord que le jour où BACK-1 sert les coûts).

### Ce que j'ai vérifié à la source, et qui tient

Pour que le NON soit lisible, voici ce qui a été contrôlé **ligne à ligne** et qui est **juste** — ces points ne
sont pas à refaire :

- **`Idempotency-Key` sur les deux POST.** `ChaineDApproClient.cs:188` (`maintain`) et `:220` (`rebuild`) appellent
  `ClientHttp.Idempotent(req)`, qui pose un **UUID v4 NEUF par appel** (`Assets/Scripts/I18n/ClientHttp.cs:37-42` :
  `string cle = Guid.NewGuid().ToString();`). Pas de clé constante, pas de rejeu croisé entre deux gestes.
- **Aucun geste ne part sans coût servi.** La règle est RELUE au moment du choix, pas seulement lue sur le bouton :
  `ChaineDApproScreenController.cs:1056-1058` (`PeutChoisir` → `ChaineDApproGestes.Actionnable(mode,
  CentimesLisibles(Couts, mode.Id), JetonDisponible)`), et `ChoisirUnMode:1062` n'appelle `StartCoroutine` que si
  `PeutChoisir`. Un bouton forcé à `interactable` par un test ou un bug ne ferait toujours rien partir.
- **Pas de double envoi.** `GesteCoroutine:1065-1068` pose `gesteEnCours = true` **avant son premier `yield`** ;
  `StartCoroutine` exécute ce segment de façon synchrone, donc un second clic dans la même image voit déjà le
  drapeau. `OuvrirLaFeuille:1043` et `PeutChoisir:1055` refusent tous deux pendant `gesteEnCours`, et le voile
  (`ChaineDApproFeuille.cs:70`, `raycastTarget = true`) barre les lignes dessous.
- **Aucun tick affiché (R2.2).** Le corps de réponse de `rebuild` n'est lu que pour que `JsonUtility` ne le jette
  pas ; `GesteCoroutine:1071-1074` jette le DTO (`_ => ok = true`) et l'après-geste vient de `RechargerChaine()`
  (`:1083`). Aucun chemin ne porte `rebuildCompletesAtTick` vers un texte.
- **Refus = `RefusServi` seul.** `TraiterLEchecDuGeste:1096-1101` passe par
  `PhraseDeRefusAMontrer(code, phraseServie)` (`:1090-1094` : `code == 0 ⇒ null`) et `MontrerRefus` refuse une
  phrase vide (`ChaineDApproFeuille.cs:119-124`). `DerniereErreur` (technique) n'est jamais affichée. La clé
  générique `error.resource.state_conflict` est bien neutralisée **en amont**, par
  `RefusServi.EstGenerique` (`Assets/Scripts/I18n/RefusServi.cs:25-27` : famille `"error.resource."`) — le test
  D5:592-594 ne teste donc pas une tautologie locale.
- **La feuille n'est PAS rognée.** Elle est posée sous `racinePleinEcran` (`ChaineDApproScreenController.cs:1044`,
  `:1145`), tandis que le `RectMask2D` est sur `FenetreChaine`, plus bas dans l'arbre (`:728-731`). Voile puis
  panneau en **derniers enfants** (`ChaineDApproFeuille.cs:111-112`), et `Detruire` (`:140-147`) **déparente avant
  `Destroy`** — sans quoi `childCount` compterait encore l'objet mourant à la réouverture. Juste.
- **Gardes structurelles.** Tout `Image` naît par `AjouterImage` (`ChaineDApproFeuille.cs:293-297`) et tout texte
  par `TexteSansTrace` (`:326`), les deux posant le `CanvasRenderer` **avant** le `Graphic` : `AddComponent` à
  l'exécution n'honore pas `[RequireComponent]`, le piège est évité partout. `Image` et `TextMeshProUGUI` sont des
  `MaskableGraphic`. Ordre de fratrie conforme à la maquette (marque après le sous-titre dans `.n`,
  `poser-chaine-gestes.py:118` ; « En reconstruction » avant l'état dans `gr30-dr`,
  `poser-chaine-routes.py:72-74`).
- **Cible du geste.** `CibleDeGeste.Id` = `legs[].leg_id` (`ChaineDApproGraphe.Liaisons`, `:1648`) /
  `routes[].route_id` (`Routes`, `:1884`), tous deux **servis et jamais dessinés** (vérifié par le test
  R2:768). Côté back, l'autorisation est bien là : `playerId` dérivé du JWT, route d'un autre joueur ⇒ 404
  (`route.controller.ts:184` « another player's route → 404 », `supply-chain.controller.ts:155` « Not the
  player's leg → 404 ») — pas d'IDOR à câbler côté client.
- **Corps des POST.** `{mode}` seul, ce que la garde `rejectUnknownFields(body, ['mode'])` du back exige des deux
  côtés (`supply-chain.controller.ts:180`, `route.controller.ts:205`).
- **Fidélité couleurs / ordre des routes : exacte.** `C_SIN`/`C_EFF`/`C_ETAT` et `R_ETAT`/`R_EFF` de
  `poser-chaine-routes.py:36-55` sont reproduits à l'identique par `TeinteDeSinuosite` / `TeinteDEffondrement` /
  `RangDeTeinteDEtat` / `RangEtatDeRoute` / `RangEffondrement` (`ChaineDApproScreenController.cs:1792-1843`), y
  compris le `na` neutre `#91876e` et le `draft` jamais dessiné. Le filet des modes actionnables
  (`DecorsDeSceneFilets.cs:545` : `#3a352c`, rayon 3) est bien celui du CSS `.gr30-fch`.
- **`EcranAppro` est au filtre de MafiaCI** en **nom nu** (`Assets/Editor/MafiaCI.cs:188`) : la claim de
  `preuves.txt:88` est vraie.
- **`--controle` joué sur les 7 fichiers** (`preuves.txt:36-70`), chaque fois « citée dans ce fichier : OUI ». Le
  vert du typecheck n'est pas un vert d'aveugle.

---

## BLOCKING

### B1 — « Remaniement » / `MODERATE_RESTRUCTURE` : un mode **RETIRÉ par f2** est livré, avec des mots jamais ratifiés

**Fichier** : `Assets/Scripts/Operational/ChaineDAppro/ChaineDApproGestes.cs:86`

```csharp
new ModeDeGeste("MODERATE_RESTRUCTURE", "remaniement", "Remaniement", "on redessine une bonne partie du trajet"),
```

**La maquette RATIFIÉE n'a que DEUX choix pour « Reconstruire la route »**
(`~/project/atelier3d-mafia-C1/poser-chaine-gestes.py:56-58`) :

```python
RECONSTRUCTION = {'titre': 'Reconstruire la route', 'commun': 'Pendant les travaux, plus rien ne passe sur cette route.', 'choix': [
    ('Petit détour', 'on contourne ce qui gêne, au plus près', '100' + NN + '€', False),
    ('Remise à plat', 'on repart d’un trajet droit, sans tenir compte de l’usure', '1' + NN + '000' + NN + '€', True)]}
```

et le retrait est un **ruling explicite de f2, daté du même jour**, avec sa raison
(`poser-chaine-gestes.py:166-167`, repris mot pour mot dans l'annexe du cadre) :

> « Entretenir : trois choix ; Reconstruire : **DEUX** (« Remaniement » **retiré**, décision produit de f2 11/11 :
> au back il fait EXACTEMENT le même recalcul que « Petit détour », seul le coût diffère — **un choix plus cher
> sans effet de plus est un piège**). »

Le même fichier le redit en tête (`:9`) : `[MODERATE_RESTRUCTURE (40000 c) : RETIRÉ de la feuille, même recalcul
que MINIMAL_REROUTE — f2 11/11]`.

**Mesure binaire** (comptage dans la maquette rendue, pas une impression) :

```
$ python3 -c "... s.count('<b>'+mot+'</b>') ..."   # ecrans-brennar-6.html
Rafistoler       4 occurrence(s) comme choix <b>
Renforcer        4
Contourner       4
Petit détour     4
Remaniement      0        ← aucun cadre ne le dessine
Remise à plat    4
```

Les 5 mots ratifiés apparaissent 4 fois (les 4 cadres de feuille) ; « Remaniement » **0 fois**. Son unique
occurrence dans tout `ecrans-brennar-6.html` est la phrase de l'annexe qui dit qu'il est retiré.

**Scénario joueur** : la feuille de « Reconstruire la route » propose trois lignes au lieu de deux. La ligne du
milieu coûte 40 000 c (4× « Petit détour ») et produit **exactement le même recalcul** — c'est le piège que f2 a
écarté, remis dans la main du joueur.

**Double faute** : le libellé « Remaniement » **et** le sous-titre « on redessine une bonne partie du trajet » sont
des mots **fabriqués par le client** — `grep` sur toute la maquette (posers + HTML) : zéro occurrence du
sous-titre, zéro occurrence de « Remaniement » comme choix. C'est une V-fabrication : des mots montrés à un joueur
sans source ratifiée. Et ils sont déjà propagés en clés i18n neuves (`appro.mode.remaniement`,
`appro.mode_sous.remaniement`) que BACK-1 serait prié de servir pour un mode qui n'existe pas.

**⚠️ Conflit de canon — ce point appelait un STOP, pas une implémentation.** Le brief f2 relayé au lot dit
« feuille par geste (**3 modes** …) » ; la maquette ratifiée du même jour en dit **2** pour la reconstruction, avec
un motif produit écrit. Deux sources de canon se contredisent. Ni `DESIGN.md` (§6 liste bien les 6 suffixes dont
`remaniement`) ni `implementation-notes.md` (§ Deviations, 15 entrées) ne relèvent la contradiction : elle a été
tranchée **par omission**, du côté non conservateur (on ajoute un geste payant plutôt que de s'arrêter). C'est
l'inverse de la règle.

**Correctif** (dans cet ordre) :

1. **Remonter le conflit à f2 avant de coder** : « 3 modes » (brief) contre « Reconstruire : DEUX » (maquette
   ratifiée + motif produit). Ma recommandation : la maquette gagne — elle est l'artefact ratifié, datée du même
   jour, et elle porte la raison. Mais le choix est à f2, pas au lot.
2. Si f2 confirme la maquette : retirer le 3ᵉ `ModeDeGeste` de `ChaineDApproGestes.Reconstruction`
   (`ChaineDApproGestes.cs:86`) et le `MODERATE_RESTRUCTURE` du commentaire `:80`.
3. Retirer `appro.mode.remaniement` et `appro.mode_sous.remaniement` de la `DetteDatee`
   (`Assets/Tests/PlayMode/ZeroRepliDesLocatairesPlayModeTests.cs`, lignes ajoutées par le lot), de `DESIGN.md` §6,
   et du décompte de TD-1048 dans `Tools/juge-donnees/dettes-client1.md` (**22 → 20 clés**).
4. Tests à corriger — sinon ils **verrouillent la faute** :
   - `ChaineDApproGestesPlayModeTests.cs:520-521` : retirer les 2 clés de `ClesNeuves`.
   - `:406` `Assert.AreEqual(3, Regex.Matches(…).Count, "chaque mode dit « on ne sait pas encore combien »")` :
     le compte attendu devient **par spec** (3 pour Entretien, 2 pour Reconstruction) — en l'état le test
     EXIGE le 3ᵉ mode.
   - `:443` : `autres` devient `new[] { "MINIMAL_REROUTE" }`.
   - `:865` et `:868` : les deux tableaux de `GestesW1` deviennent 2 entrées.

---

## MAJOR

### M1 — Le panneau de la feuille ignore `ShellChrome.BottomInsetPx` : sous le shell, « Annuler » passe derrière la barre d'onglets

**Fichier** : `Assets/Scripts/Operational/ChaineDAppro/ChaineDApproFeuille.cs:76-77`

```csharp
rt.anchorMin = Vector2.zero; rt.anchorMax = new Vector2(1f, 0f); rt.pivot = new Vector2(0.5f, 0f);
rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
```

Le panneau est ancré à `bottom = 0` de **`racinePleinEcran`**, qui est la racine **plein écran** de l'écran
(`ChaineDApproScreenController.cs:1144-1146`, commentaire : « La racine PLEIN ÉCRAN — jamais un panneau
intermédiaire »). Or le bas de l'écran est mangé par le chrome du shell :

`Assets/Scripts/ShellContracts/ShellChrome.cs:39-40`
```csharp
/// <summary>Hauteur que le chrome mange en bas : zone sûre + barre d'onglets.</summary>
public static float BottomInsetPx { get; private set; }
```

L'écran lui-même la réserve pour son corps (`ChaineDApproScreenController.cs:1162` :
`EnteteDEcran.PoserLaPile(racine, 0, (int)ShellChrome.BottomInsetPx)`), et **19 autres contrôleurs la réservent
aussi**. Le précédent d'une **surcouche** (et non d'un corps) existe et ajoute l'inset explicitement :
`Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs:1996`
```csharp
cardRt.anchoredPosition = new Vector2(0f, 24f + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx);
```

La feuille est la seule pièce de ce lot qui vit hors de la pile et elle ne l'ajoute pas.

**Scénario joueur** (classe **A/B** — un geste, pas une nuance) : sous le shell, le bas du panneau —
`padding-bottom` 13 px **plus le bouton « Annuler »**, dernier enfant du `VerticalLayoutGroup`
(`ChaineDApproFeuille.cs:108`) — est recouvert par la barre d'onglets. Le seul moyen de fermer la feuille devient
inatteignable : le voile, volontairement, **ne ferme pas** (implementation-notes § Deviations 9 : « Le voile BARRE
le clic mais ne ferme pas la feuille (seul « Annuler » ferme) »). Le joueur est enfermé dans la feuille.

**Pourquoi aucun test ne le voit** : hors shell, personne n'appelle `ShellChrome.PublierInsets`, donc
`BottomInsetPx == 0`. `GestesS1` et `GestesS2` montent l'écran nu (`MonterEcran()` → `AddComponent`, pas de shell) :
les deux gardes structurelles sont **vertes sur un écran où le défaut ne peut pas exister**. C'est exactement le
motif « une garde sur les PARAMÈTRES n'est pas une garde sur l'EFFET » du `CLAUDE.md`.

**Correctif** :
- `ChaineDApproFeuille.cs:77` → `rt.offsetMin = new Vector2(0f, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx);`
  (le voile, lui, peut rester plein écran : il doit barrer tout le clic).
- Garde : dans `GestesS1`, publier un inset non nul (`ShellChrome.PublierInsets(0f, X)`) avant d'ouvrir, puis
  **mesurer** que `EnPixels(f.Panneau).yMin >= X` ; contrôle positif = `offsetMin.y = 0` ⇒ rouge. Remettre
  `PublierInsets(0,0)` en `TearDown` (globaux statiques, TD-576, même raison que `JetonDeStructure`).
- À confirmer au premier run avec une capture sous shell (aucune n'existe : `implementation-notes.md` § « Ce qui
  n'est PAS fait »).

### M2 — Jeton de structure non republié : **la non-publication est JUSTE, la conséquence non gardée ne l'est pas** (réponse à la question posée)

**Question** : après le succès d'une décision structurelle (Renforcer / Remise à plat), le code ne publie pas
`JetonDeStructure.Publier` alors que `DemolitionScreenController` le fait — défaut, ou non ?

**Tranché : il y a bien un défaut, mais il n'est pas dans la non-publication.** Ne PAS copier Démolition.

**(a) Le risque est réel et mesuré à la source.** Les deux modes structurels de ce lot passent par le **même**
gouverneur, donc le **même** compteur que la démolition de ㊳ :

- `services/game-back/src/core_loops/supply_chain/supply-chain.controller.ts:158` : « A 2nd `structural_reinforce`
  past the session's structural cap → 409 STRUCTURAL_CAP_EXHAUSTED (governor REUSE, I4). »
- `services/game-back/src/operational/distribution/route.controller.ts:182` : « FULL_GEOMETRIC_RESET is the ONE
  structural mode (code 9, `governor.commit(SINUOSITY_FULL_RESET)` — a 2nd FULL rebuild the SAME session 409s
  STRUCTURAL_CAP_EXHAUSTED). »
- `progression/loop10/structural-decision-governor.service.ts:97-104` : une seule réservation atomique, un seul
  `structural_decisions_this_session`.

Donc, le jour où BACK-1 sert les coûts : après un « Renforcer » réussi, le joueur rouvre une feuille, « Remise à
plat » est **allumé** et porte encore la marque « votre grande décision du jour » — il clique, il prend un 409. Ce
que `JetonDeStructure.cs:9-10` existe précisément pour empêcher :

> « *Une contrainte transverse doit se voir à l'identique partout où elle mord, sinon le joueur la découvre par un
> refus.* Il faut donc UNE source, lisible par les trois. »

Et l'asymétrie est réelle : Démolition → Appro fonctionne (Appro relit le statique à chaque ouverture,
`ChaineDApproGestes.cs:90`), Appro → Démolition **non**.

**(b) Mais copier `Publier(1, true)` serait une fabrication, pire que le trou.**
`DemolitionScreenController.cs:1030` écrit `JetonDeStructure.Publier(1, true)` — deux chiffres en dur, et contre le
contrat du fichier lui-même (`JetonDeStructure.cs:48` : « Écrit par le shell **UNIQUEMENT**, à chaque
`session/open`. Les locataires lisent. »). Or :

- le cap est un **tunable 1..2** : `core-loops-tunables.ts:423-434`, « the RAW registry cap (1, 1..2 — canon
  "unlockable to 2") » ;
- il vaut même **0** sous une fenêtre d'observation T4 : `:548-551`,
  `if (pressureCapCache.hasOpenObservationWindow(playerId)) return 0;` ;
- le client ne reçoit **jamais** `cap` : `session-open-sequence.service.ts:361` sert
  `structural_budget: { used, cap_reached: used >= cap }` — et **seul `POST /v1/session/open` le sert**
  (`grep structural_budget` : aucune route de relecture).

Le client ne peut donc pas calculer `cap_reached` après son geste. L'option du coder
(`implementation-notes.md` § Deviations 4) est la conservatrice, et elle est **à garder**.

**(c) Le défaut à corriger est ailleurs, et il est en deux morceaux :**

1. **La marque est une PROMESSE fausse.** « votre grande décision du jour » affirme que *celle-ci* est la décision
   du jour. Après en avoir dépensé une, le client ne sait pas s'il en reste — mais il sait avec certitude qu'il en
   a pris une. Montrer la marque est la mauvaise moitié de l'incertitude.
   **Correctif minimal, qui n'invente aucun chiffre** : ajouter à `JetonDeStructure` un
   `DepenseLocalement()` qui n'incrémente que `Utilises` **sans toucher à `PlafondAtteint`** (rien n'est affirmé
   sur le cap), l'appeler dans `GesteCoroutine` après un 2xx quand `mode.Structurel`, et conditionner la marque à
   `Utilises == 0` dans `ChaineDApproFeuille.cs:217`. Le mode reste **actionnable** : c'est le back qui arbitre, et
   son refus servi reste la source de vérité (`error.core_loops.structural_cap_exhausted`, vérifié servi :
   `protocol/error-codes.ts:264-266` + `i18n/string_table.ts:5967`). **Hors périmètre du lot** ⇒ à arbitrer par f2
   avant d'y toucher.
2. **La conséquence n'est ni dettée ni gardée.** La déviation vit **uniquement** dans
   `implementation-notes.md:10`. Rien dans `DESIGN.md` §7 (TD-1046..1049), rien dans
   `Tools/juge-donnees/dettes-client1.md`. Un trou honnêtement documenté se garde — mais il se garde **dans le
   registre**, pas dans un fichier de notes que le prochain lot ne relira pas.
   **Correctif exigible ce soir, sans toucher au code** : ouvrir **TD-1050** (plage 1050+ libre ; 1046-1049 pris
   par ce lot) dans `dettes-client1.md` et dans `DESIGN.md` §7 — « le jeton de structure n'est pas republié après
   un geste structurel de ㉚ : une 2ᵉ décision structurelle de la même session est OFFERTE (marque comprise) et
   finit en 409 servi ; le client ne peut pas calculer `cap_reached` (cap = tunable 1..2, 0 sous fenêtre T4, jamais
   servi) ⇒ BACK-1 : servir `cap`, ou une route de RELECTURE du `structural_budget` hors `session/open` ». Et
   noter la trajectoire (1) comme décision de f2.

**Sévérité MAJOR et non BLOCKING** : aujourd'hui les six modes sont éteints (aucun coût servi), le chemin est
injoignable. C'est une faute **latente**, qui part en production le jour de TD-1046 — c'est-à-dire le jour où
personne ne relira ce lot.

---

## MINOR

### m1 — `GestesR2:796-798` : un contrôle qui peut passer pour la mauvaise raison

```csharp
yield return Cliquer(route.gameObject);
yield return Cliquer(ecran.Feuille.BoutonDuMode("MINIMAL_REROUTE").gameObject);
Assert.IsFalse(ecran.GesteEnCours, "un mode éteint (coût absent) ne part pas");
```
`GesteEnCours` est faux **aussi** si le clic n'a atteint aucun bouton, si l'objet n'était pas celui qu'on croit, ou
si un geste était parti **et déjà terminé**. Le fait qu'on veut prouver — *rien n'est parti* — n'est pas mesuré.
**Correctif** : asserter `IsFalse(BoutonDuMode("MINIMAL_REROUTE").interactable)` **et** un témoin qu'aucun appel
n'a eu lieu (`DernierCodeErreur == 0` et `DerniereErreur == null` relevés avant/après).

### m2 — G-S2 : seuils **calculés**, jamais mesurés — trou honnête, à ré-ancrer au premier run

`ChaineDApproGestesPlayModeTests.cs:338-340` (`claires0 < 300`, `claires1 > claires0 * 0.05f`,
`vif1 < 40 || vif1 > 100`) repose sur des nombres **dérivés à la main**, ce que l'auteur déclare sans détour
(`implementation-notes.md:15` : « Les nombres de la garde G-S2 … sont CALCULÉS, pas mesurés : à relire au premier
run »). Le 2ᵉ contrôle positif (`:369-373`) tient tout entier à la marge « ~126 » contre la borne 100 : si le rendu
réel tombe dans `[40,100]`, `DefautDuVoile` rend `null` et l'`Assert.IsNotNull` **échoue**.
**Ce test se garde tel quel** : il échoue en ROUGE franc, jamais en faux vert, et son commentaire de péremption est
écrit. À ré-ancrer sur la mesure au premier run — et la mesure à coller dans `preuves.txt`.

### m3 — `GestesS1` contrôle positif 1 : le `CanvasRenderer` n'est pas réellement retiré

`:238-244` remplace le **prédicat** de la garde au lieu de retirer le composant (Unity refuse de retirer un
`CanvasRenderer` sous une `Image` vivante). Le contrôle prouve la branche du détecteur, pas qu'un `Graphic` nu
serait produit. C'est honnêtement commenté sur place, et le vrai risque (`AddComponent` n'honore pas
`[RequireComponent]`) est couvert par l'assertion sur l'arbre réel (`:236`). **À garder**, noté.

### m4 — `LireGraphe` : un `maintaining` **imbriqué** compterait

`ChaineDApproClient.cs:115` : `CleMaintaining.IsMatch(liaisons[i])` s'applique au **texte entier** de l'objet de la
liaison, sous-objets compris. Aucun sous-objet n'est servi dans `legs[]` aujourd'hui
(`supply-chain.controller.ts:92-99`), donc l'impact est nul — mais la garde D6b:651-653 ne couvre que le cas
« autre nom / mot dans une chaîne », pas « bon nom, mauvaise profondeur ». À ajouter au jour où le back imbrique.

### m5 — `gesteEnCours` sans `try/finally`

`ChaineDApproScreenController.cs:1065-1085` : si le `MonoBehaviour` meurt pendant `RechargerChaine()`, le drapeau
reste vrai. Impact nul (l'écran meurt avec), mais le patron coûte une ligne.

### m6 — Deux écarts de maquette (classe C) non consignés

- `ChaineDApproScreenController.cs:944-946` : `.gr30-bandes{display:flex;flex-wrap:wrap;gap:2px 8px}`
  (`poser-chaine-routes.py:51`) est rendu par **un seul** `TextMeshProUGUI` en rich-text avec `<space=…>` au lieu de
  deux spans qui se replient. Même famille que l'écart déjà dette (TD-1043, `.gr30-l{flex-wrap:wrap}`) — à y
  rattacher.
- `ChaineDApproFeuille.cs:76-86` : le panneau se dimensionne par `ContentSizeFitter` avec `offsetMax = zero` ; si le
  contenu dépasse la hauteur d'écran (6 textes repliés + 3 modes en langue longue), rien ne défile. Pas de recette
  de débordement dans la maquette non plus. À vérifier au premier run en EN.

---

## Auto-audit du verdict

Je confirme avoir **réellement** ouvert et lu, à la ligne : les 3 fichiers neufs du lot, le diff complet des 5
fichiers modifiés (`rtk proxy git diff`, jamais un `cat`), `DESIGN.md`, `implementation-notes.md`, `preuves.txt`,
`ClientHttp.cs`, `RefusServi.cs`, `Libelle.cs`, `JetonDeStructure.cs`, `ShellChrome.cs`, `DecorsDeSceneFilets.cs`,
`DemolitionScreenController.cs` (zones 360-380 et 1010-1065), `MafiaCI.cs:188`, les deux posers de la maquette, et
côté back `supply-chain.controller.ts`, `route.controller.ts`, `structural-decision-governor.service.ts`,
`core-loops-tunables.ts`, `error-codes.ts`.

Les deux comptes qui décident ont été **mesurés**, pas estimés :
- « Remaniement » dessiné 0 fois contre 4 pour chacun des 5 mots ratifiés (comptage `python3` sur
  `ecrans-brennar-6.html`, sortie collée en B1) ;
- `ClientHttp.Idempotent` rend bien un UUID neuf par appel (corps de la méthode lu, `ClientHttp.cs:37-42`).

**Ce que je n'ai PAS vérifié, et que ce verdict n'atteste donc pas** : aucun test n'a été joué (Unity n'a pas été
lancé, la porte n'a pas été prise), aucune capture n'a été prise, aucun pixel n'a été compté. M1 et m2 sont
dérivés du code et resteront **à confirmer par une mesure** au premier créneau. Le typecheck et ses `--controle`
sont repris de `preuves.txt` sans être rejoués : ils attestent que ça compile, rien de plus.

**Aucun fichier du lot n'a été modifié par cette revue** — ce document est le seul écrit.
