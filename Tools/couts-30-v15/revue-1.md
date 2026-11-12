# Revue ⊥ tour 1 — ㉚ V15 « coûts par mode » (commit `973deae6`, branche `lot/client1-couts-30-v15-2026-11-11`)

Relecteur indépendant (⊥) — n'a pas écrit ce lot. Base `cec8de29`. Lecture seule : aucun fichier du lot
modifié, aucun Unity lancé, aucune porte prise.

**VERDICT : NOT_APPROVED — 1 BLOCKING, 1 MAJOR, 3 MINOR.**

Sources confrontées : code back `lot/couts-30` @`87820327` (`upkeep-costs-view.ts`,
`upkeep-duration-band.ts`, `supply-chain.controller.ts`, `protocol/envelope.ts`,
`protocol/envelope.interceptor.ts`, `i18n/string_table.ts`) · contrat §1
`mafia-design-couts/docs/superpowers/specs/2026-11-13-couts-30-contrat-page.md` · `Tools/gestes-30/DESIGN.md`
(règle (3)) · `Tools/couts-30-v15/DESIGN.md` + `preuves.txt`.

---

## BLOCKING

### B1 — G-V1b : le vecteur « ligne illisible » n'est PAS illisible ; l'assertion est ROUGE, et la déviation 2 est contredite par le code

`Assets/Tests/PlayMode/ChaineDApproGestesPlayModeTests.cs:1003-1004` :

```csharp
CoutsServis abime = ChaineDApproClient.LireCouts("{\"payload\":{\"data\":{\"maintenance\":[{\"mode\":\"quick_patch\" \"cost_cents\":1},{\"mode\":\"reroute_bypass\",\"cost_cents\":5000,\"duration_band\":\"immediate\"}],\"rebuild\":[]}}}");
Assert.IsNull(abime.CentimesServis("quick_patch")); Assert.AreEqual("5000", abime.CentimesServis("reroute_bypass"));
```

La cause est dans `Assets/Scripts/Operational/ChaineDAppro/ChaineDApproClient.cs`, boucle de
`ChampsAuPremierNiveau` :

```csharp
while (i < objet.Length && (char.IsWhiteSpace(objet[i]) || objet[i] == ',')) i++;
```

La virgule est **sautée comme un blanc**, jamais **exigée**. `{"mode":"quick_patch" "cost_cents":1}` se
parse donc sans faute : `champs = {mode:"\"quick_patch\"", cost_cents:"1"}`, `doubles` vide,
`EntierJson.IsMatch("1")` vrai ⇒ `centimesParMode["quick_patch"] = "1"`.
`abime.CentimesServis("quick_patch")` rend **"1"**, pas `null` ⇒ **`Assert.IsNull` rougit**.

**Evidence** — portage fidèle en Python de `FinDeChaine` / `FinDeValeur` / `ChampsAuPremierNiveau` /
`ObjetsDuTableau` / `LireCouts` (y compris l'ancrage `\G` de `DeuxPoints` et le `continue` qui avance `k`
dans la boucle `for` de `FinDeValeur`), rejoué sur **les 41 vecteurs** de G-V1a / G-V1b / G-V2 / G-V3 / B1 :

```
$ python3 -I vectors.py | grep -v "^OK"
ROUGE  V1b ligne illisible ignoree (quick_patch null)
$ python3 -I vectors.py | grep -c "^OK"
40
```

Sortie directe du vecteur :

```
ABIME  centimes: {'quick_patch': '1', 'reroute_bypass': '5000'}  bandes: {'reroute_bypass': 'immediate'}
  attendu par le test V1b : quick_patch -> None, reroute_bypass -> 5000
```

Ce n'est pas seulement un test faux. `Tools/couts-30-v15/preuves.txt` § Déviations, entrée 2, écrit :

> `LireCouts` — cas que la spec ne tranchait pas, **option conservatrice (= ne sert PAS)** : […] **une ligne
> illisible est ignorée.**

et le commentaire de `LireCouts` (`ChaineDApproClient.cs`, bloc `<summary>`) écrit la même chose :
« une ligne illisible est ignorée ». **Le code ne fait ni l'un ni l'autre** : il sert un coût lu dans un
corps qu'aucun analyseur JSON n'accepte. L'option conservatrice déclarée est celle qui n'est PAS
implémentée, et la seule garde qui l'épinglait est la garde rouge.

⇒ Deux sorties possibles, au choix de l'auteur, mais une mesure dans les deux cas :
exiger la virgule (`return null` si le champ précédent n'est pas suivi d'une `,` avant le nom suivant) —
c'est l'option conservatrice déjà déclarée —, **ou** rectifier la déviation 2, le commentaire de
`LireCouts` et le vecteur de G-V1b pour dire ce que le code fait réellement. Dans les deux cas G-V1b doit
porter un vecteur qui, lui, rougit vraiment (p. ex. `{"mode":"quick_patch","cost_cents"` tronqué, ou
`{"mode" 5}`), sinon la règle reste non gardée.

---

## MAJOR

### M1 — La déviation 3 (« la bande s'affiche indépendamment du coût ») n'a AUCUNE garde, et c'est l'option la moins conservatrice

`preuves.txt` § Déviations, entrée 3 :

> La bande est indépendante du coût : un mode sans `cost_cents` mais avec une bande valide garde sa bande
> (`BandeServie` non null), **son sous-titre peut donc dire « quelques minutes · … » sur un mode éteint**.

C'est bien ce que fait `ChaineDApproGestes.SousTitreDuMode` : le mot de bande est composé dès que
`spec.DitLaBande && couts != null`, sans jamais consulter `CentimesServis`.

Or le cas existe **déjà dans les fixtures du lot** et n'est jamais mesuré :

- `ChaineDApproGestesPlayModeTests.cs:965` (G-V1a) — `LigneDeCout("reroute_bypass", null, "immediate")` :
  le test asserte `sans.CentimesServis("reroute_bypass")` null, **jamais** `sans.BandeServie(...)`.
- `ChaineDApproGestesPlayModeTests.cs:1024` (G-V1c) — le même mode, à l'écran cette fois : le test asserte
  `BoutonDuMode("reroute_bypass").interactable` faux, `TexteDe(LigneDuMode(…,"reroute_bypass"),"Cout")`
  == « On ne sait pas encore combien. », et le compte de ce texte. **Le `"Sous"` de cette ligne n'est
  jamais lu.** G-V3, qui lit les `"Sous"`, ne sert que des modes AVEC coût.

Donc le seul comportement joueur que la déviation introduit — un mode éteint qui annonce quand même une
durée — n'est pinné nulle part : le changer ne ferait rougir aucune garde.

Et c'est aussi le choix le moins conservateur. `Tools/gestes-30/DESIGN.md` règle (3) de l'orchestrateur :
*coût absent ⇒ mode éteint, on ne devine rien* ; `Tools/couts-30-v15/DESIGN.md` §5 : *bande non servie ⇒
conséquence seule (on ne devine pas une durée ; **le mode est alors éteint de toute façon**)*. Le design
raisonne « éteint ⇒ pas de durée » ; la déviation prend l'inverse pour le cas symétrique, sans le dire.

⇒ Trancher explicitement (sous-titre d'un mode éteint = conséquence seule, ce que la règle (3) suggère ;
ou bande conservée, assumé par écrit) **et poser la garde** : G-V1c a déjà le montage, il lui manque une
ligne `Assert.AreEqual(…, TexteDe(LigneDuMode(ecran.Feuille, "reroute_bypass"), "Sous"))`.

---

## MINOR

### m1 — `doubles` : la branche « champ répété dans UNE ligne » n'est exercée par aucun test

`preuves.txt` déviation 2 promet : « un champ `cost_cents`/`duration_band`/`mode` répété dans UNE ligne ⇒
ce champ n'est pas servi (même règle que “mode en double”) ». C'est le `HashSet<string> doubles` de
`ChampsAuPremierNiveau` + les trois `!doubles.Contains(...)` de `LireCouts`.

G-V1b ne teste que le `mode` répété sur **deux lignes** (`ChaineDApproGestesPlayModeTests.cs:995-1000`),
qui passe par `parMode`, une branche entièrement différente. Aucun vecteur du lot ne porte deux fois le
même nom de champ dans un même objet (vérifié par balayage des littéraux de corps du fichier de test).
Branche déclarée comme garantie, jamais jouée.

### m2 — `ObjetsDuTableau` n'est pas borné à `payload.data`

`ChaineDApproClient.cs`, `ObjetsDuTableau` : `Regex.Match(corps, "\"" + nom + "\"\\s*:\\s*\\[")` balaie le
**corps entier**. Le contrôle de présence `PayloadData`
(`"\"payload\"\\s*:\\s*\\{.*\"data\"\\s*:\\s*\\{"`, `Singleline`) ne prouve que l'existence de
`payload` … `data` quelque part, jamais que les tableaux lus en sont les enfants. Un `response_meta`
portant `"maintenance":[…]` serait lu comme des coûts — et `response_meta` **précède** `payload` dans le
corps servi (`envelope.interceptor.ts` : `{ response_meta: meta, payload: { data } }`). Le back n'émet
rien de tel ; c'est la même laxité que `LireGraphe` d'avant le lot, donc non régressif. À noter, pas à
corriger ici.

### m3 — G-V5c est inerte côté « servi » ; `RechargerChaine` perd une garde `renduExpliciteDemande`

(a) `ChaineDApproGestesPlayModeTests.cs:1195-1213` — `if (ecran.Couts is CoutsServis) { … } else
Assert.IsInstanceOf<CoutsNonServis>(…)`. Aujourd'hui seule la branche `else` s'exécute, et elle asserte
exactement ce que `CoutsApresLecture` produit par construction sur tout échec. La moitié « servie »
(3 + 3 lignes complètes) ne peut pas rougir tant que BACK-1 n'est pas sur la pile. C'est **déclaré**
(déviation 6 : « V5c est inerte côté “servi” tant que BACK-1 n'est pas sur la pile ») — trou honnête, à
garder tel quel, avec son commentaire de péremption. Il ne doit simplement jamais être compté comme
preuve du chemin servi.

(b) `ChaineDApproScreenController.cs`, `RechargerChaine` : `yield return RelireLesCouts();` n'est **pas**
suivi d'un `if (renduExpliciteDemande) yield break;`, alors que les sept autres attentes du fichier le
portent (lignes 270, 284, 287, 289, 305, 310, 326). Déclaré (déviation 7) et sans effet mesurable
aujourd'hui : `RendrePourTestChaine` fait `StopCoroutine(coroutineChargement)` **et** pose
`chargementAmorce = true`, donc la coroutine entière meurt — mais le motif du fichier est rompu.

---

## Ce qui a été vérifié et tient (mesuré, pas déduit)

**(1) `LireCouts` face au vrai corps servi.**
- Enveloppe : `envelope.interceptor.ts` enveloppe tout 2xx en `{ response_meta, payload: { data } }` ;
  `envelope.ts` `ResponseSuccessPayload.data`. Le client lit `payload.data` (`GetSupplyChainUpkeepCostsEnvelope`
  → `Payload` → `ResponseDto`) **et** re-vérifie la présence dans le corps brut (`PayloadData`), parce que
  `JsonUtility` instancie les classes imbriquées absentes. G-V1b épingle `{"payload":{}}` ⇒ null.
- Casse et ensemble de clés : `upkeep-costs-view.ts` sert `{mode, cost_cents, duration_band}` en
  snake_case sous `{maintenance, rebuild}` ; `LireCouts` lit exactement ces cinq noms, rien d'autre.
  Valeurs de `mode` recopiées de l'énum PG / de l'union TS, identiques aux `Id` de `ModeDeGeste`.
- Absent ≠ 0 : la présence de `cost_cents` est lue dans le corps brut, ligne par ligne, et
  `EntierJson = "^(0|[1-9][0-9]*)$"` refuse `5000.5`, `"5000"`, `1e3`, `-5`, `null`, `true`, `[5000]`,
  `{"v":5000}` — les 8 vecteurs de G-V1b passent au portage. Un `cost_cents` de SOUS-OBJET ne compte pas.
  Un montant au-delà d'un int64 survit en chaîne (`"12345678901234567890"`), ce que `JsonUtility` aurait
  tronqué.
- `MODERATE_RESTRUCTURE` : lue comme les autres (`b1[0]["MODERATE_RESTRUCTURE"] == "280000"` au portage)
  et jamais demandée — B1 épingle DEUX `Mode_*` dans le panneau et l'absence du montant 280000.
- Rien codé en dur : aucun montant ni seuil dans le code de production ; G-V2 a de vraies dents (son
  contrôle rouvre la feuille avec le corps du contrat et exige que « 50 € » apparaisse).
- Authz/IDOR : la route back ne lit aucune ligne joueur (en-tête de `upkeep-costs-view.ts` : « deux
  comptes, la MÊME réponse »), `@UseGuards(JwtAuthGuard)` au contrôleur `supply-chain.controller.ts:263-266`.
  Rien à garder côté propriété ; le client pose son bearer (`ClientHttp.Authentifier`). RAS.

**(2) Branchement dans `RechargerChaine` — aucune régression d'écran trouvée.**
- `RelireLesCouts` ne touche ni `DerniereErreur`, ni `PhraseDuRefus`, ni `DernierCodeErreur`, ni l'état
  indisponible (`onErr` vide, commenté).
- `DernierePhraseDeRefus` **du client** est bien écrite par le GET des coûts
  (`ChaineDApproClient.cs:128`), mais aucun lecteur ne la voit : dans `RechargerChaine` le GET du graphe la
  réécrit avant le seul lecteur (`ChaineDApproScreenController.cs:325`), et `TraiterLEchecDuGeste` la lit
  immédiatement après le POST, avant toute relecture (`ChaineDApproScreenController.cs:1100`).
- Injection de test préservée : la garde d'entrée de `RelireLesCouts` ET la relecture de `Couts` **après**
  l'attente (`CoutsApresLecture`) — G-V5a couvre les 7 combinaisons et porte un vrai contrôle positif
  (`AreNotSame(lus, CoutsApresLecture(injecte, lus))`).
- Aucun test existant ne compte les requêtes ni leur durée (balayage de
  `ChaineDApproGestesPlayModeTests.cs`, `ChaineDApproScreenPlayModeTests.cs`,
  `ChaineSilencieusePlayModeTests.cs`). Les tests `Monte()` ne partent jamais en réseau :
  `RendrePourTestChaine` arrête `Charger()` et pose `chargementAmorce`.
- `PoserLAdresseDuBackPourTest(null)` rend bien la source unique : `baseUrl` est une propriété
  `get => baseUrlPose ?? AdresseDuBack.Url` (`ChaineDApproScreenController.cs:46-47`). La doc dit vrai.

**(3) Clés et replis — 22/22 à l'octet.**
- Les 21 valeurs FR du bloc « Lot ㉚ » de `string_table.ts` @`87820327` (l. 6090-6111) comparées une à une
  à la table écrite à la main `FrDuContrat` (`ChaineDApproGestesPlayModeTests.cs:1222-1245`) :
  **0 écart**. La 22ᵉ, `error.funds.insufficient` = `Pas assez d’argent pour ça.`
  (`string_table.ts:6209-6210`), correspond aussi.
- U+00A0 : `ChaineDApproGestes.cs:104` porte bien `…se repose\xa0: plus rien…` (lu au point de code, pas à
  l'œil) ; le back porte `la liaison se repose` + `C2 A0` + `:` (`cat -A`). Apostrophes U+2019 partout,
  aucune U+0027.
- Les 18 replis que la feuille lit sont présents **à l'octet** dans `ChaineDApproGestes.cs` +
  `ChaineDApproFeuille.cs` : 0 manquant.
- `De` ou `Gabarit` selon la colonne « entrée client » du contrat §1.5 : `titre`, `etiquette`,
  `sous_titre`, `cout`, `accueil.jeton` en `De` (`ChaineDApproFeuille.cs:91, 98, 212, 235, 242`) ;
  `consequence` en **`Gabarit`** (`ChaineDApproGestes.SousTitreDuMode`, clé explicite
  `appro.consequence.<suffixe>`). `Libelle.Slug` (minuscules, accents pliés, non-alnum ⇒ `_`, trim) dérive
  chaque clé `De` exactement sur la clé du contrat — vérifié mot à mot pour les 13 `De`.
- `accueil.jeton.votre_grande_decision_du_jour` : **0 occurrence** dans `string_table.ts` à `51cece7d` et
  à `74c5a0b0`, présente à `87820327`. La sortie d'`EstUnReuse` vers `DetteDatee` est juste, et ferme un
  faux « REUSE servi » que la branche F portait. Bon constat, bien documenté.
- `DetteDatee` (`ZeroRepliDesLocatairesPlayModeTests.cs:43-107`) : **51 clés, 51 distinctes, 0 doublon** ;
  bloc ㉚ = **24** (2 titre + 5 étiquettes de mode + 3 mots de bande + 5 conséquences + 1 sous_titre +
  1 jeton + 1 coût + 2 + 4 états). `ClesNeuves` de G-D4 porte les mêmes 24, écrites à la main.
  Les 3 clés du contrat non lues (`etiquette.remaniement`, `consequence.remaniement`,
  `error.funds.insufficient`) ne sont PAS en dette : correct, rien ne les demande.
  Aucune clé lue hors dette, aucune clé servie restée en dette (toutes à 0 sur la pile).

**(4) Gardes.** G-V1a / G-V1c / G-V2 / G-V3 / G-V4 / G-V5a / G-V5b ont des contrôles positifs réels et non
tautologiques — G-V2 montre que le test « aucun montant du contrat » pouvait rougir ; G-V6 falsifie son
propre U+00A0 (U+0020 ET U+202F) et son U+2019 ; G-D4 ajoute un contrôle positif neuf sur un nom
DISPARU du code. G-D1..D6 sont rebasées sur les clés neuves sans perdre d'assertion : D3 garde
`TextesAvecUnTick` et son contrôle « 12 ticks » (rebasé sur `appro.consequence.rafistoler`), D4 gagne une
ouverture de feuille AVEC bandes pour que les trois mots de bande soient demandés, B1 lit désormais ses
coûts par `LireCouts` au lieu de `CoutsDeTest.Servi` — plus fort, pas plus faible. Réserves : B1 et m1/M1
ci-dessus.

**(5) Règles du dépôt.** Aucun tick affiché (R2.2) : la durée ne voyage qu'en mots, et
`rebuild[].duration_band` est lue sans être montrée — G-V3 l'épingle (`DoesNotContain("plus longtemps")`
sur la feuille de reconstruction). Aucun `Graphic` neuf n'est créé par le lot (la feuille passe par
`Texte` / `AjouterImage`, inchangés) ⇒ la règle du `CanvasRenderer` n'est pas touchée ; S1 la garde
toujours. Rien d'autre qu'un typecheck n'est présenté comme prouvé : le message de commit, l'en-tête du
fichier de test et `preuves.txt` disent tous « NON JOUÉES », « Ça typecheck, rien de plus ». Conforme.

**Statique re-mesurée par le relecteur, dans ce worktree :**

```
$ python3 Tools/typecheck-hors-porte.py --tout
AssetLint.csproj: 6 sources · 297 refs · EXIT=0 · 0 erreur(s)
… (17 assemblies) …
Assembly-CSharp-Editor.csproj: 6 sources · 370 refs · EXIT=0 · 0 erreur(s)
RC=0
```

17/17 EXIT=0, rc=0 — le compte du message de commit tient. Rappel du socle : `.csproj` et DLL sœurs sont
datés, ça typecheck et rien de plus ; **aucune des gardes G-V1..G-V6 n'a été jouée**, ni par l'auteur ni
par moi. B1 ci-dessus est une garde dont je peux prouver qu'elle est rouge **sans** la jouer ; les autres
restent non mesurées.

---

## Ce qu'il faut pour un tour 2

1. **B1** — trancher la lecture d'une ligne mal formée (virgule exigée, option conservatrice déjà
   déclarée) ou rectifier déviation 2 + commentaire de `LireCouts` + vecteur de G-V1b ; dans les deux cas,
   un vecteur de G-V1b qui rougit vraiment.
2. **M1** — trancher le sous-titre d'un mode éteint portant une bande servie, et poser la garde
   (une ligne dans G-V1c, le montage existe déjà).
3. m1 — un vecteur à champ répété dans UNE ligne, pour que `doubles` soit exercé.
4. m2, m3 — constat, rien à corriger dans ce lot.

Un tour 2 ne redemande aucune mesure Unity : B1 et M1 se ferment sur du statique et du portage.
