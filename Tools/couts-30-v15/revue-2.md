# Revue ⊥ tour 2 — ㉚ V15 « coûts par mode » (commit `ed92bfab`, branche `lot/client1-couts-30-v15-2026-11-11`)

Relecteur indépendant (⊥) — n'a écrit ni le lot ni la revue 1. Tour 2 = `rtk proxy git diff 973deae6 ed92bfab`
(9 fichiers, 798+/33−). Lot entier = `cec8de29..ed92bfab`. Lecture seule : aucun fichier du lot modifié,
aucun Unity lancé, aucune porte prise, aucun `--controle` relancé (il écrit dans les sources).

**VERDICT : APPROVED — 0 BLOCKING, 0 MAJOR, 3 MINOR.**

B1, M1, m1, m3(b) sont RÉELLEMENT fermés — chacun vérifié par **mutation** : j'ai neutralisé la règle dans le
portage Python et compté les vecteurs qui rougissent. m3(a) et m2 sont restés tels que la revue 1 le demandait.

Sources confrontées : code back `lot/couts-30` @`87820327` (`upkeep-costs-view.ts`, `upkeep-duration-band.ts`,
`supply-chain.controller.ts:263-266`, `protocol/envelope.interceptor.ts:136-148`) · contrat §1
`mafia-design-couts/.../2026-11-13-couts-30-contrat-page.md` · `Tools/couts-30-v15/{DESIGN.md, revue-1.md,
preuves.txt, vecteurs-lirecouts.py}` · `CLAUDE.md` du worktree.

---

## 1. Fidélité du portage Python — vérifiée ligne à ligne avant de s'en servir

`Tools/couts-30-v15/vecteurs-lirecouts.py` prétend porter `ChaineDApproClient.{FinDeChaine, FinDeValeur,
ChampsAuPremierNiveau, ObjetsDuTableau, LireCouts}` et `ChaineDApproGestes.{CentimesLisibles, MotDeLaBande,
SousTitreDuMode}`. Comparé au C# du working tree :

| point | C# | portage | verdict |
|---|---|---|---|
| `FinDeChaine` : `\\` saute 2 | `if (s[i]=='\\') { i++; continue; }` + `i++` du `for` | `i += 2; continue` | ✔ |
| `FinDeValeur` objet/tableau : le `continue` avance `k` | `k = FinDeChaine(s,k); … continue;` + `k++` | `k = fin_de_chaine(...); k += 1; continue` | ✔ |
| `FinDeValeur` littéral nu : s'arrête à `,` ou `}` | `while (j<Len && s[j]!=',' && s[j]!='}') j++` | idem | ✔ |
| `DeuxPoints` ancré `\G` à `fin+1` | `Regex("\\G\\s*:\\s*").Match(objet, fin+1)` | `re.compile(r'\s*:\s*').match(objet, fin+1)` | ✔ (`.match(pos)` ancre) |
| `ObjetsDuTableau` : `m.Index+m.Length` | idem | `m.end()` | ✔ |
| `EntierJson` / `LitteralNu` `^…$` | `.NET $` tolère un `\n` final | `\Z` + `.match` | ✔ (`brut` est `.Trim()`é) |
| `ChaineSimple` : `\` ⇒ null | idem | `'\\' in inter` | ✔ |
| **`CentimesLisibles`** | `CentimesServis` **+ `decimal.TryParse`** (`ChaineDApproGestes.cs:126-133`) | `couts.centimes(mode)` **seul** | ✘ voir **m5** |
| `MotDeLaBande` | `Libelle.De("appro","etiquette", <mot>)` | dict FR en dur | ✔ dans le contexte du test (`Servir()` ne sert aucune clé `appro.*`, `ChaineDApproGestesPlayModeTests.cs:131-136`) |

Rejoué dans le worktree :

```
$ python3 -I Tools/couts-30-v15/vecteurs-lirecouts.py ; echo RC=$?
…
65 vecteurs · 65 OK · 0 ROUGE
RC=0
```

Le compte du message de commit (65 · 65 · 0, rc=0) tient.

---

## 2. Fermeture de B1 — mesurée par mutation, pas déduite

`ChaineDApproClient.cs:244-270` : `ChampsAuPremierNiveau` exige désormais la virgule.

```csharp
i = finValeur;
while (i < objet.Length && char.IsWhiteSpace(objet[i])) i++;
if (i >= objet.Length) return null;
if (objet[i] == '}') return champs;
if (objet[i] != ',') return null;   // deux membres sans virgule
```

et l'ancienne boucle qui avalait la virgule comme un blanc a disparu (diff `973deae6..ed92bfab`, `-while (i < objet.Length && (char.IsWhiteSpace(objet[i]) || objet[i] == ','))`).

Le vecteur D'ORIGINE de la revue 1 rend maintenant ce que G-V1b affirmait :

```
OK    V1b vecteur d'origine (revue B1) : quick_patch null, reroute_bypass 5000
```

**Anti-tautologie** — portage muté : `champs_au_premier_niveau` remis dans sa version laxiste du tour 1 ⇒

```
M-A  virgule NON exigee (etat du tour 1)
    rc=1  ROUGE=5
      ROUGE V1b ligne illisible ignorée : {"mode":"quick_patch" "cost_cents":1}  ({'quick_patch': '1', …})
      ROUGE V1b ligne illisible ignorée : {,"mode":"quick_patch","cost_cents":1}
      ROUGE V1b ligne illisible ignorée : {"mode":"quick_patch","cost_cents":1,}
      ROUGE V1b ligne illisible ignorée : {"mode":"quick_patch",,"cost_cents":1}
```

La garde a de vraies dents. Déviation 2 (`preuves.txt`), le `<summary>` de `LireCouts`
(`ChaineDApproClient.cs:191`) et le `<summary>` de `ChampsAuPremierNiveau` (`:238`) disent tous les trois ce que
le code fait : **l'option conservatrice déclarée est maintenant celle qui est implémentée**. Le contrôle
positif (blancs autour des virgules et des deux-points, `ChaineDApproGestesPlayModeTests.cs:1012`) prouve que
la stricture n'a pas emporté le corps bien formé.

Mutations complémentaires, toutes rouges (⇒ aucune des règles de `LireCouts` n'est gardée par tautologie) :

```
M-D  doubles ignore .................... ROUGE=3
M-E  cost_cents non entier accepte ..... ROUGE=8
M-F  bande hors union gardee ........... ROUGE=1
M-G  mode en double : on choisit ....... ROUGE=1
```

---

## 3. Fermeture de M1 — la bonne branche a été prise, et elle est pinnée

`ChaineDApproGestes.cs:156` :

```csharp
string mot = spec != null && spec.DitLaBande && couts != null && CentimesLisibles(couts, mode.Id) != null ? MotDeLaBande(couts.BandeServie(mode.Id)) : null;
```

C'est l'option **conservatrice** que la revue 1 désignait (règle (3) de `Tools/gestes-30/DESIGN.md` : coût
absent ⇒ mode éteint, on ne devine rien), pas l'inverse. Elle est tranchée par écrit en trois endroits
cohérents : `DESIGN.md` §5, `preuves.txt` déviation 3, `<summary>` de `SousTitreDuMode`.

Point fort non demandé : la condition passe par **`CentimesLisibles`**, c'est-à-dire la MÊME lecture que la
règle d'extinction (`ChaineDApproScreenController.cs:1078`) et que l'affichage du montant
(`ChaineDApproFeuille.cs:180`). Pas de troisième avis sur un même coût.

La garde manquante est posée, avec son contrôle positif
(`ChaineDApproGestesPlayModeTests.cs:1061` et `:1070`) — et les deux littéraux attendus sont **à l'octet** le
repli du mode, U+00A0 compris (lu au point de code, pas à l'œil) :

```
$ python3 -I -c "… repr(ligne) …"
Tests:1061 '…AreEqual("la liaison se repose\xa0: plus rien n’y passe tant qu’elle n’a pas récupéré", …'
Gestes:104 'new ModeDeGeste("reroute_bypass", "contourner", "Contourner", "la liaison se repose\xa0: plus rien n’y passe tant qu’elle n’a pas récupéré")'
Tests:933 'private const string Sep = " · ";'   → [0x20, 0xb7, 0x20]
Gestes:135 'public const string SeparateurDeBande = " · ";' → [0x20, 0xb7, 0x20]
```

`Servir()` (`:131-136`) ne sert que `game.fiction.building.name` ⇒ les `appro.*` tombent sur leur repli, donc
les littéraux en dur du test sont les bons. Le chemin rendu est bien celui-là : `ChaineDApproFeuille.cs:215-218`
n'écrase `sous` que si `jetonPris` (faux ici : jeton libre, et `reroute_bypass` n'est pas structurel).

**Anti-tautologie** :

```
M-B  SousTitreDuMode sans le test du cout (etat du tour 1)
    rc=1  ROUGE=1
      ROUGE M1 reroute_bypass sans coût MAIS bande immediate => conséquence seule
             tout de suite · la liaison se repose : plus rien n’y passe…
```

Et l'assertion neuve de G-V1a (`:970`, `AreEqual("immediate", sans.BandeServie("reroute_bypass"))`) sépare
proprement la donnée (la bande reste LUE) de l'affichage (elle n'est pas DITE) — la décision n'est pas cachée
dans le parseur.

---

## 4. m1, m3, m2

- **m1 fermé.** Trois vecteurs de champ répété DANS une ligne (`:1016-1021`) ; mutation M-D ⇒ 3 rouges. La
  branche `doubles` est enfin jouée, et les trois champs (`cost_cents`, `duration_band`, `mode`) le sont
  séparément, avec le voisin servi comme témoin.
- **m3(b) fermé.** `ChaineDApproScreenController.cs:320` porte `if (renduExpliciteDemande) yield break;` après
  `RelireLesCouts()`. Le motif du fichier est de nouveau entier : 8 occurrences (270, 284, 287, 289, 305, 310,
  **320**, 327).
- **m3(a) : le trou honnête a été GARDÉ, comme demandé.** `GestesV5c…` porte toujours son commentaire de
  péremption (`:1229` : « ⚠️ Écrite pour le jour où BACK-1 est sur la pile… ») et sa branche `if (ecran.Couts
  is CoutsServis)`. Rien n'a été supprimé pour faire vert. C'est la bonne réponse.
- **m2 : laissée, consignée** (déviation 11). Vérifié que c'est inoffensif ici : la seule chaîne du corps que
  le joueur influence est `request_id_echo` / `correlation_id_echo` (`envelope.interceptor.ts`
  `buildResponseMeta`), et `JSON.stringify` y échappe les guillemets (`\"maintenance\":[`), ce que la regex
  `"maintenance"\s*:\s*\[` ne peut pas apparier. Constat, pas correctif.

---

## 5. L'écart non demandé : `JsonUtility` retiré de `LireCouts` — ACCEPTÉ, mesuré

`ChaineDApproDtos.cs` redevient **identique à `cec8de29`** (vérifié : `git diff --stat cec8de29 ed92bfab --
…/ChaineDApproDtos.cs` ⇒ sortie vide) ; aucun symbole orphelin :

```
$ grep -rn "GetSupplyChainUpkeepCostsResponseDto\|…Envelope\|…Payload" Assets/ Tools/
Tools/couts-30-v15/revue-1.md:157:  … (citation de la revue 1)
```

**Le corps réel est-il toujours lu ?** Reconstitué exactement comme Nest le sert — `{ response_meta, payload:
{ data } }` (`envelope.interceptor.ts:147-148`), `response_meta` AVANT `payload`, `cost_cents` en
`number` (`upkeep-costs-view.ts:21-25`), `JSON.stringify` compact, `server_build_ref` peuplé — puis passé au
portage :

```
=== A. VRAI corps Nest (enveloppe complète, JSON.stringify) ===
  centimes: {'quick_patch':'5000','structural_reinforce':'30000','reroute_bypass':'5000',
             'MINIMAL_REROUTE':'10000','MODERATE_RESTRUCTURE':'40000','FULL_GEOMETRIC_RESET':'100000'}
  bandes  : {… 'brief','extended','immediate','extended','extended','extended'}
```

**Un champ ADDITIF éteint-il un mode ?** Non — 12 formes ajoutées à la ligne `quick_patch`, toutes servies
(`5000` / `brief` conservés) :

```
=== B. champs ADDITIFS ===
  OK scalaire string · OK entier · OK nul · OK booleen · OK negatif · OK decimal · OK exposant
  OK objet imbrique · OK tableau · OK string avec } et , · OK string echappee · OK unicode
=== C. champ additif au niveau data / ordre des cles inverse ===
   data + champ -> ('5000','10000')      data: rebuild d'abord -> ('5000','10000')
=== D. JSON.stringify avec indentation -> les 6 coûts lus
```

Échappements (`\"`, `\\`, `\uXXXX`), nombres hors int64 (`"12345678901234567890"` intact), `null`, ordre des
clés, champs inconnus : rien n'éteint un mode. Le point (2) du mandat est clos **par mesure**.

**La perte de la validation JSON globale est-elle régressive ?** Non, de façon mesurable : un 2xx dont le
corps est tronqué rend aujourd'hui un `CoutsServis` VIDE au lieu d'un `CoutsNonServis` — tous les modes sont
éteints dans les deux cas, et `RelireLesCouts` relit les deux à la relecture suivante (`:343`, la garde
n'exclut que l'injection d'un test). Le vecteur `tronque` (`:1009-1010`) épingle exactement ça. Par ailleurs
les analyseurs bruts n'ont JAMAIS été sous le `try/catch` (il n'entourait que `JsonUtility.FromJson`) : aucune
protection n'a été perdue.

---

## 6. Pas de régression (point (3) du mandat)

- **Fichiers clés non touchés par le tour 2** : `git diff --stat 973deae6 ed92bfab --
  ZeroRepliDesLocatairesPlayModeTests.cs ChaineDApproFeuille.cs` ⇒ **sortie vide**. Les clés, les replis à
  l'octet et la table `FrDuContrat` sont ceux que la revue 1 a comparés un à un au bloc « Lot ㉚ » de
  `string_table.ts` @`87820327` (0 écart) ; je n'ai pas refait ce balayage, je constate l'identité binaire.
- **DetteDatee re-mesurée** (pas relayée) : `51` clés, `51` distinctes, 0 doublon (lignes 43-107). Le découpage
  par bloc (24 pour ㉚) reste porté par la mesure de la revue 1, le fichier étant inchangé.
- **`RechargerChaine` / injection** : `CoutsApresLecture` (`:334-338`) et la garde d'entrée de `RelireLesCouts`
  (`:343`) sont inchangées ; la seule modification est le `yield break` de m3(b), qui ne peut que raccourcir
  une coroutine déjà condamnée par `RendrePourTestChaine`.
- **Silence** : `RelireLesCouts` garde son `onErr` vide commenté (`:345`) ; G-V5b l'épingle (`:1219-1223`).
- **G-D1..D6** : non touchées par le tour 2.
- **IDOR / authz** : la route `GET /v1/supply-chain/upkeep-costs` ne lit aucune ligne joueur
  (`upkeep-costs-view.ts:7-13` « deux comptes, la MÊME réponse »), `@UseGuards(JwtAuthGuard)`
  (`supply-chain.controller.ts:263-264`), le client pose son bearer (`ChaineDApproClient.cs:126`). Aucune
  garde de propriété à poser ; rien n'a changé au tour 2. RAS.

---

## 7. Statique re-mesurée par le relecteur, dans ce worktree

```
$ python3 Tools/typecheck-hors-porte.py --tout
→ 17 lignes « EXIT=0 · 0 erreur(s) », RC=0

$ python3 Tools/chaines-joueur-classer.py --verifier
127 motifs · 109 témoins de source · 0 écart(s) · population 1454      rc=0

$ python3 Tools/apparier-litteraux-aux-tokens.py --bilan
621 littéraux actifs dans 40 fichiers · 0 à moins de 4 d'un token, dans 0 fichiers

$ python3 Tools/juge-donnees/i18n/n3-ternaires-portage.py
None écarts (mesuré, dette) : {}
```

Les quatre chiffres du message de commit se reproduisent **à l'identique**. Les 7 attestations `--controle`
(« citée dans ce fichier : OUI ») de `preuves.txt` § TOUR 2 couvrent les 5 fichiers touchés **plus**
`ChaineDApproFeuille.cs` et `ZeroRepliDesLocatairesPlayModeTests.cs` : plus large que ce que le message
annonce, jamais moins. Je ne les ai PAS rejouées (elles écrivent dans les sources) — elles restent une
attestation de l'auteur, et je le dis plutôt que de la compter comme ma mesure.

Rappel du socle, repris par l'auteur dans son message : `.csproj` et DLL sœurs sont datés, **ça typecheck et
rien de plus** ; **aucune garde PlayMode n'a été jouée**, ni par l'auteur ni par moi. Ce qui est prouvé ici
l'est par portage et par mutation, pas par Unity.

## 8. Règles du dépôt (point (5))

`CLAUDE.md` du worktree : porte non prise et non nécessaire (aucun Unity) ✔ · `--tout` + `--frais`/`--controle`
par fichier touché ✔ · aucun `Graphic` neuf, donc ni `MaskableGraphic` ni `CanvasRenderer` en jeu ✔ · aucune
couleur/opacité déplacée d'une maquette ✔ · evidence = commande + sortie collée dans `preuves.txt` ✔ · aucun
`cat`/`head` utilisé pour un compte qui décide (tout en `Read`/`sed -n`/`python3`) ✔. Le worktree est propre
hors lot (`git status --porcelain` ⇒ seul `?? Tools/anim-e2e-lecture/`, étranger à ce lot).

---

## MINOR

### m4 — Le vecteur « littéral nu mal formé » ne garde PAS la règle du littéral nu

`ChaineDApproGestesPlayModeTests.cs:1008` (et `vecteurs-lirecouts.py:179`) :

```csharp
"{\"mode\":\"quick_patch\",\"cost_cents\":1 2}",   // littéral nu mal formé
```

Ce vecteur passe **avec ou sans** la ligne de production qu'il est censé épingler
(`ChaineDApproClient.cs:252`, `if (brut[0] != '"' && … && !LitteralNu.IsMatch(brut)) return null;`) : la valeur
`"1 2"` est de toute façon refusée par `EntierJson`, donc `quick_patch` n'a pas de coût dans les deux cas.
Mesuré en neutralisant la règle dans le portage :

```
M-C  controle du litteral nu retire
    rc=0  ROUGE=0
      /!\ AUCUN VECTEUR NE ROUGIT — tautologie
```

Alors que la règle a bien un effet observable — il suffit que le littéral mal formé ne soit PAS `cost_cents` :

```
--- corps qui discrimine (aucun vecteur du lot ne le porte) ---
   {"mode":"quick_patch","cost_cents":5000,"duration_band":"brief","x":1 2}
   avec LitteralNu : None None          (la LIGNE est illisible ⇒ quick_patch pas servi du tout)
   SANS LitteralNu : 5000 brief         (la ligne est lue)
```

Le message de commit et la déviation 2 présentent pourtant ce cas comme couvert. Même classe que le m1 du
tour 1 (branche déclarée garantie, jamais jouée) ⇒ **MINOR**. ⇒ remplacer ou doubler le vecteur par un corps
où le littéral mal formé est un champ ADDITIF, comme ci-dessus.

### m5 — Le portage annonce `CentimesLisibles`, il porte `CentimesServis`

`vecteurs-lirecouts.py:1-2` : « Portage FIDÈLE de … `ChaineDApproGestes.{CentimesLisibles, MotDeLaBande,
SousTitreDuMode}` ». Or `:127` écrit `couts.centimes(mode) is not None`, c'est-à-dire `CentimesServis`, alors
que le C# (`ChaineDApproGestes.cs:126-133`) ajoute un `decimal.TryParse` :

```csharp
if (!decimal.TryParse(c, NumberStyles.Integer | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out _)) return null;
```

`EntierJson` accepte un entier de longueur quelconque, `decimal` plafonne à 29 chiffres : un `cost_cents` de
30 chiffres est SERVI pour le portage et ÉTEINT pour le C#. **Aucun vecteur ne franchit le seuil**
(`12345678901234567890` = 20 chiffres, et il n'est lu que par `c.centimes`, fidèle), donc **aucun vecteur n'est
faussement vert aujourd'hui** — mais l'en-tête promet une fidélité que le fichier n'a pas, et c'est exactement
ce qui rendrait une prochaine mesure non concluante. Même remarque, plus bénigne, pour `MOTS` : le dict FR en
dur tient lieu de `Libelle.De`, ce qui n'est fidèle que tant que `Servir()` ne sert aucune clé `appro.*`.
⇒ porter les deux, ou rétrécir la phrase de l'en-tête (et le dire en déviation).

### m6 — Deux lignes neuves de `ChampsAuPremierNiveau` sans vecteur

`ChaineDApproClient.cs:245` : `if (i < objet.Length && objet[i] == '}') return champs;   // {}`. Elle est
**inerte** pour `LireCouts` : avec ou sans elle, une ligne `{}` finit en `continue` (champs vide ⇒ `mode`
absent, ou `null` ⇒ ligne ignorée). Mesuré : `{} -> 5000` (voisin) dans les deux versions.

`ChaineDApproClient.cs:251` : `if (brut.Length == 0) return null;`. Celle-ci n'est PAS inerte — elle empêche un
`IndexOutOfRangeException` sur `brut[0]` pour un corps `{"mode":…,"cost_cents":}`. Et `LireCouts` n'a **aucun**
`try/catch` : une exception remonterait dans la coroutine `RechargerChaine` et emporterait le chargement du
graphe. Mesuré sur le portage :

```
   {"mode":"quick_patch","cost_cents":}  -> None 5000          (avec la garde)
   SANS la garde len==0                  -> EXCEPTION IndexError
```

Aucun vecteur du lot ne porte une valeur vide. Ce n'est pas un défaut du code — le code est juste — mais une
ligne défensive non gardée, et le socle dit qu'une règle non mesurée n'est pas une règle. ⇒ un vecteur
`"cost_cents":` suffirait.

---

## Ce qui n'a PAS été vérifié par moi (à ne pas compter comme prouvé)

1. Les 7 `--controle` : attestation de l'auteur, non rejouée (elles écrivent dans les sources).
2. Le balayage exhaustif des 22 clés / replis à l'octet contre `string_table.ts` @`87820327` : fait par la
   revue 1 ; je n'ai re-vérifié que l'identité binaire des fichiers depuis `973deae6`, plus U+00A0/U+00B7 sur
   les trois littéraux que le tour 2 ajoute.
3. Le découpage « bloc ㉚ = 24 » de `DetteDatee` : relayé de la revue 1 ; j'ai re-mesuré 51/51 distinctes.
4. Toute garde PlayMode : **aucune n'a été jouée**. Les fermetures de B1/M1/m1 sont prouvées par portage +
   mutation, ce qui est suffisant pour ces trois règles (pures, sans Unity) et pour rien d'autre.
