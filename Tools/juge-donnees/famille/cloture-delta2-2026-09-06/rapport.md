# Juge données ⊥ — ⑥ La Famille — clôture en DELTA (2) — 2026-09-06

Code jugé : `77bd229` (gelé dans `front-77bd229/`, vérifié byte-identique 5/5).
Back lu : worktree `mafia-clean-city`, vérifié byte-identique à `fc944b62` sur `operational/lieutenant/` (50/50).
Base précédente : `couverture-precedente.md`, 43 lignes (42 numérotées + 1 « nouveau »).

## En une phrase

**3 lignes sur 43 bougent, 0 ligne nouvelle** ; les **6 défauts nommés sont FERMÉS**, dont un
(« commentaire ⓐ ») **fermé sur le fond mais DÉPLACÉ en citation** — la phrase survit à 1 et le
« vérifié à 0 » du commit `5349ac2` n'est reproductible qu'avec un motif aveugle au repli de ligne ;
et **une réserve de classe reste OUVERTE sur ⓑ** (la docstring de `RendreTousLesLibelles` affirme
encore pour 8 résolveurs ce que le correctif n'a rendu vrai que pour 1, et `TenureBucketLabel`
n'est rejoué que sur son repli).

---

## Vérifications de provenance (faites, pas reprises)

| contrôle | méthode | résultat |
|---|---|---|
| back == `fc944b62` sur `operational/lieutenant/` | `git hash-object` fichier à fichier vs `git rev-parse fc944b62:<path>` | **50/50 identiques, 0 différent** |
| ↳ contrôle POSITIF de la méthode | même boucle contre `b47a809f` (témoin ancien) | **38 identiques / 11 DIFFÉRENTS** ⇒ la méthode sait détecter |
| `front-77bd229/` == commit `77bd229` | idem, 5 fichiers | **5/5 identiques** |
| ↳ contrôle POSITIF | mêmes fichiers contre `8e982ab` | **3 DIFFÈRENT** (`FamilleLabels`, `LieutenantDtos`, `LieutenantScreenController`), 2 identiques (`LieutenantClient`, `RuleModel`) — exactement ce que `dossier.md` annonce |

⚠️ **Trois écarts du dossier à la mesure** (sans effet sur le verdict, mais le dossier n'est pas la mesure) :

1. `dossier.md` annonce `FamilleLabels.cs` **(+36)** et `LieutenantScreenController.cs` **(+193/−31)**.
   Mesuré (`rtk proxy git diff --numstat`, recompté par oracle python sur le diff brut) :
   **+30/−6** et **+168/−25**. `LieutenantDtos.cs` **+10/−0** ✔.
2. `dossier.md` : « la garde `RendreTousLesLibelles` énumère **9** valeurs ». Mesuré : elle parcourt
   `ArchetypesCanoniques`, qui en porte **10** (9 archétypes + `UNKNOWN`), plus un repli explicite.
3. Le HEAD du dépôt Unity a **bougé pendant la passe** (`9e1953bb` → `8f179f5`, session voisine) ;
   `8e982ab`/`5349ac2`/`77bd229` ne sont **pas ancêtres de HEAD** (ils vivent sur `correcteur/ecrans`).
   Toutes mes mesures sont ancrées sur des SHA explicites et sur `front-77bd229/` — c'est précisément
   ce que le gel du dossier protège.

---

## Table des lignes qui bougent

| # | information | B | M | F avant (`8e982ab`) | F après (`77bd229`) | preuve (fichier:ligne) | statut |
|---|---|---|---|---|---|---|---|
| 3 | `archetype` (roster) | ● | ● M08 | **◐** repli seulement (plus dans `.nom`) | **● RENDU** — 2ᵉ fente du rang, devant l'ancienneté | `LieutenantScreenController.cs:2432` (`metier`), `:2473-2477` (`NewText("Metier")` + `TrackText`), conditionné `:2472` `if (nomServi)` | **ⓐ FERMÉ** |
| 7 | `name` (détail) | ● | – | **–** | **● RENDU** — 1ʳᵉ rangée du panneau de détail | `LieutenantDtos.cs:110` (champ déclaré) · `LieutenantScreenController.cs:884` dans `RenderBands()` (`:864`, `b = CurrentBands` `:867`) | **D-1b FERMÉ** |
| 18 | `reassign_availability` | ● | – | **● LOGIQUE** seule (garde du POST) | **● LOGIQUE + RENDU** — pilote l'état interactif du bouton | `:2790` (champ), `:2746` (capture), `:2783-2787` (désactivation) ; chemin `RefreshBands():458` → `RenderBands()` → `RenderReassignSection():911` | **D-6 classe FERMÉE** |

**Lignes nouvelles : 0.** Le delta n'affiche aucune information qui ne soit déjà une clé B ou un
élément M de la table précédente.

### Lignes dont le CONTENU change sans que le triplet bouge (4 — signalées, non comptées comme mouvantes)

| # | ce qui change | avant → après | preuve |
|---|---|---|---|
| 8 | `archetype` (détail) : le cas `UNKNOWN` | `default` → « Unknown » (anglais brut) **→** `Lib("Inconnu")` → clé `famille.archetype.inconnu`, **servie** | `FamilleLabels.cs:69` ; clé présente dans `services/game-back/src/i18n/string_table.ts` |
| 34 | M06 rôle du Don | « VOUS » **→** « Vous » (casse mixte, F13) | `:2367`, `:2371` |
| 37 | M11 libellé « État » | `Lib("ÉTAT")` (rendait « État ») **→** `Lib("ÉTAT").ToUpperInvariant()` (rend « ÉTAT », F9) | `:2537`, `:2542` ; vérifié sur la planche |
| nouveau (delta 1) | message de refus de réaffectation | `Lib(...)` **→** littéral nu (la clé dérivée n'est pas servie) | `:599` |

**Arithmétique** : 43 lignes de référence = 3 mouvantes + 4 à contenu changé + 36 inchangées.
Lignes rapportées = 3 mouvantes + 0 nouvelle = **3**.

---

## État des défauts nommés — instance ET classe

### D-1b — `name` sur les DEUX DTO, rendu par `RenderBands` → **FERMÉ (instance + classe)**

- **Instance** : `LieutenantBands.name` déclaré `LieutenantDtos.cs:110` ; rendu
  `LieutenantScreenController.cs:884`, à l'intérieur de `RenderBands()` (`:864`), avec repli nommé
  « — » et **pas** l'archétype (qui garde sa propre rangée `:886`) — les deux rangées coexistent,
  aucune grandeur n'en remplace une autre.
- **Classe comptée, pas supposée** : le back sert `name` sur **exactement 2** projections joueur —
  `LieutenantBands` (`lieutenant.projection.service.ts:139`, émis `:336` pour `GET /v1/lieutenants/:id`)
  et `RosterRow` (`:212`, émis `:390` pour `GET /v1/lieutenants`). Les deux sont déclarées
  (`LieutenantDtos.cs:110` et `:146`) et les deux sont rendues (`:884` détail, `:2435` roster).
  **2/2.** Le contrôleur ne porte aucune 3ᵉ route de lecture (10 routes, toutes sous
  `@UseGuards(JwtAuthGuard)`, dont 2 `@Get`).
- ⓘ *Hors périmètre de ⑥, noté* : `lieutenant.projection.service.ts:133-137` désigne une **3ᵉ** surface
  du même contrat — la carte d'exception (`carte.lieutenant.name`). Et `GET /v1/autonomy-reports`,
  que ce contrôleur appelle, sert `lieutenant_id` **sans** `name` (corps mesuré). C'est un candidat
  forme F pour l'écran des exceptions, pas pour celui-ci.

### ⓐ — archétype ET nom sur chaque rang → **FERMÉ (instance, prouvé sur l'image ; classe vérifiée)**

- **Code** : `metier = FamilleLabels.Archetype(row.archetype)` (`:2432`), `nomServi` (`:2433`),
  `nom = nomServi ? row.name : metier` (`:2434`), fente NOM `:2435`, fente MÉTIER `:2473-2477`.
  Le repli est correct : nom absent ⇒ le métier remonte en ligne 1 et **ne se répète pas** en ligne 2
  (`if (nomServi)` `:2472`).
- **Planche `capture-1080x2400.png` (minute 72 118 = celle des corps), valeur servie ↔ valeur affichée** :

  | corps `GET_lieutenants.json` | affiché |
  |---|---|
  | `name: "Lt. Rook" / "Lt. Sallo" / "Lt. Halde"` | **Lt. Rook · Lt. Sallo · Lt. Halde** (ligne 1, serif crème) |
  | `archetype: "COOK"` ×3 | **Cuisinier** ×3 (ligne 2) |
  | `tenure_bucket: "FRESH"` ×3 | **RÉCENT** ×3 (puce) |
  | `op_state_band: "IDLE"` ×3 | **Au repos** ×3, libellé **ÉTAT** |
  | cardinal 3 | sous-titre **« 3 LIEUTENANTS »** |

  Les trois rangs portent bien **les deux** grandeurs. Ils restent identiques sur métier / ancienneté /
  état — ce qui est la **vérité servie** (les trois sont COOK/FRESH/IDLE), pas un défaut.
- **Classe** (« un correctif qui remplace un champ par un autre déplace le défaut d'un cran ») :
  les 2 autres substitutions du delta ont été vérifiées — panneau de détail, `Nom` (`:884`) **et**
  `Archétype` (`:886`) tous deux présents ; rang du Don, « Vous » en fente NOM (`:2367`) **et**
  « LE DON » en fente RÔLE, tous deux visibles sur la planche. **Aucun champ perdu.**

### ⓑ — les 9 archétypes ont un libellé → **FERMÉ (instance) · RÉSERVE DE CLASSE OUVERTE**

**Fermé, mesuré :**
- Égalité d'**ENSEMBLES** (pas `contains`) entre les `case` de `FamilleLabels.Archetype` et
  `ArchetypesCanoniques` : **10 = 10**, `case` sans entrée = aucun, entrée sans `case` = aucun.
- Les 3 clés déclarées non servies le sont réellement : dans
  `services/game-back/src/i18n/string_table.ts`, `famille.archetype.{gros_bras,renseignement,intendant}`
  = **absentes** ; `famille.archetype.inconnu` = **présente**. Idem `famille.ecran.nom` = **absente**
  (56 clés `famille.ecran.*` comptées — le commentaire `:877` dit 56, exact).
- La garde source-reading existe et est bien construite :
  `Assets/Tests/PlayMode/LieutenantUiExtensionPlayModeTests.cs:375-412`
  (`ArchetypesCanoniques_CouvreTousLesCasDuResolveur`) — bornes gardées des deux côtés
  (`Assert.Greater(fin, debut, …)`), **plancher anti-vacuité `cas.Count >= 9`**, message qui NOMME
  les manquants. C'est la bonne forme, et elle protège du piège de tranche vide.
  *(J'ai moi-même payé ce piège en écrivant mon instrument : ma borne de fin `ArchetypesRatifies`
  matche aussi dans la docstring d'en-tête, donc AVANT ma borne de début ⇒ tranche vide ⇒ « 0 entrée ».
  Le test du correcteur, lui, s'en garde.)*

**Réserve de classe, OUVERTE — la même faute, un résolveur plus bas :**
- La docstring de `RendreTousLesLibelles` (`LieutenantScreenController.cs:959-962`) affirme toujours :
  « *Les valeurs de domaine ci-dessous ont été **LUES dans les `case`** de ces résolveurs, pas recopiées
  de mémoire* ». C'est l'énoncé exact que le commit `77bd229` déclare faux. Le correctif ne l'a rendu
  vrai que pour **1 résolveur sur 9** (`Archetype`, via le tableau + le test) ; les **8 autres** listes
  sont toujours recopiées à la main, et la docstring les couvre encore.
- Mesuré, résolveur par résolveur : `Mode` 2/2 rejoués ✔ · `Etat` 4/4 ✔ · `GrantedRoleLabel` 4/4 ✔ ·
  mais **`TenureBucketLabel` n'est rejoué que sur `"__inconnu__"`** (`:1000`) — ses **5** valeurs
  réelles (`FamilleLabels.Anciennete` : FRESH · ACCLIMATED · SEASONED · SENIOR · ENTRENCHED) ne sont
  **jamais** rejouées.
- ⚠️ **Ce n'est PAS un trou de « zéro repli »**, et je le dis pour ne pas sur-classer : `Anciennete`
  fait **0** appel au catalogue (mesuré : 0 `Libelle.De` / `Lib(` dans son corps), et
  `famille.anciennete.*` = **0 clé** dans `string_table.ts`. La garde n'aurait donc rien à mesurer là.
- Le fait qui reste : **5 littéraux français hors catalogue**, dans le même régime que les 3 archétypes
  — mais ceux-là ont été consignés (TD-643) et ceux-ci ne sont mentionnés nulle part dans le delta.
  *Même famille, traitement différent.*

### D-6 classe — le bouton se désactive, pas seulement le POST → **FERMÉ**

- `boutonReaffecter` (`:2790`) capturé `:2746`, désactivé `:2783-2787` :
  `interactable = string.IsNullOrEmpty(dispo) || dispo == "AVAILABLE"`.
- **La garde est du bon côté de la transformation** — la question qui décide : `RenderReassignSection()`
  est appelée depuis `RenderBands()` (`:911`), elle-même appelée depuis `RefreshBands()` (`:458`) juste
  après `CurrentBands = bands` (`:445`). L'état du bouton **suit donc le rechargement des bandes**, il
  n'est pas figé à la construction.
- **Domaine mesuré côté back**, pas supposé : `ReassignAvailabilityBand = 'AVAILABLE' | 'ON_COOLDOWN'`
  (`lieutenant.projection.service.ts:124`). Le test `== "AVAILABLE"` couvre donc le domaine **fermé**
  en entier, et un 3ᵉ membre futur désactiverait le bouton — le sens sûr.
- **Classe** : `interactable` n'a que **3** sites dans tout le fichier (`:1718` et `:1729` = `CanvasGroup`
  d'ouverture/repli de panneaux, sans rapport ; `:2786`). Et `reassign_availability` est la **seule**
  bande de disponibilité servie par la projection (1 clé sur les 19 du détail). Il n'y a donc pas
  d'autre geste à garder de ce type sur cet écran.
- ⚠️ Non observable sur cette base : le compte sert `AVAILABLE` ; l'état DÉSACTIVÉ n'apparaît ni dans
  les corps ni sur la planche. La preuve est **code + domaine**, pas mesure en jeu.

### D-3b commentaire — → **FERMÉ (instance) · classe VÉRIFIÉE VRAIE**

- **Instance**, avec valeurs attendues avant/après :
  motif « Les deux étaient appelés » : **1 (`8e982ab`) → 0 (`77bd229`)** ;
  contrôle positif « le repli nommé du résolveur » : **11 → 11**. Le motif mordait avant, il ne mord
  plus, et l'instrument est vivant.
- **Le fond est vrai, et je l'ai recompté** : à l'état pré-unification `df00789` (parent de `3e57e98`),
  `FamilleLabels.Mode(` a **0 appel** dans le contrôleur et `ModeLabel(` en a **4**. La rectification
  du correcteur est exacte : un seul des deux résolveurs de mode vivait.
- **Classe** — le fichier porte **un** autre énoncé de la même forme (`FamilleLabels.cs:131-137` :
  « CETTE MÉTHODE ET `LieutenantScreenController.OpStateLabel` … **LES DEUX ÉTAIENT À L'ÉCRAN** »).
  Je l'ai mesuré au lieu de le supposer, et **il est VRAI**, ancres exactes :
  à `df00789`, `FamilleLabels.Etat(` était appelé à **`:2414`** (rangée d'organigramme) et
  `OpStateLabel(` à **`:857`** (détail), **`:2579`** et **`:2591`** (rangée de roster) — deux résolveurs
  vivants sur le même écran. Et les mots divergeaient bien sur **exactement 2 des 4** bandes :
  SETTLING « Stabilisation » vs « Prend ses marques » ; IDLE « Repos » vs « Au repos » ;
  ACTIVE et PAUSED identiques. **La classe est fermée : l'unique énoncé restant de cette forme est fondé.**

### commentaire ⓐ (« descend sur la ligne d'état ») — → **FERMÉ SUR LE FOND, DÉPLACÉ EN CITATION**

- La forme **assertive** est bien partie : motif « L'archétype reste visible » = **1 (`8e982ab`) →
  0 (`5349ac2`) → 0 (`77bd229`)** ; contrôle positif « qualificatif et non comme identité » : 1 → 0 → 0.
- **Mais la phrase elle-même survit à 1** : motif normalisé « descend sur la ligne d'état » =
  **1 · 1 · 1** — inchangé aux trois états. Elle vit à `LieutenantScreenController.cs:2414-2415`,
  citée entre guillemets **à l'intérieur de sa propre réfutation** (« … *il descend sur la* / *ligne
  d'état » : **cette ligne de code n'a jamais été écrite.*** »). Sémantiquement c'est la bonne forme —
  le lecteur est prévenu que c'est faux. Mais :
- ⛔ `5349ac2` écrit « *Le commentaire faux est retiré (**vérifié à 0**, avec un contrôle positif …)* ».
  **Ce zéro n'est pas reproductible.** Il ne s'obtient qu'avec un motif aveugle au **repli de ligne** :
  la phrase est coupée par `\n //`, donc tout motif littéral contigu rend 0 — **avant comme après**.
  Mon premier motif a rendu exactement ce faux zéro (**0 → 0**, donc un motif faux et non satisfait,
  au sens du socle) ; seul le motif normalisé (repli des continuations `//`) l'a vu.
- ⇒ Verdict : **l'énoncé daté n'est plus affirmé** (défaut fermé), mais **le contrôle qui le certifie
  est inopérant**, et la citation subsiste. Un futur balayage anti-péremption sur cette phrase
  rendra 1 et accusera à tort — ou rendra 0 et rassurera à tort, selon son motif.

---

## Ce que je n'ai pas pu vérifier

1. **Aucune stack, aucun `curl`** (contrainte du mandat) : je n'ai **pas re-dérivé** les corps. B est
   pris tel que commité dans `corps-reels/` (`fc944b62`, minute 72 118). Ce que j'ai vérifié est que le
   **code back lu est byte-identique à `fc944b62`** sur `operational/lieutenant/` (50/50, avec contrôle
   positif) — pas que les corps en découlent.
2. **Aucune suite PlayMode lancée.** Le « **15/15, declares=15** » de `77bd229` et son contrôle positif
   « une valeur retirée ⇒ rouge, et elle la NOMME (`[MUSCLE]`) » sont **non vérifiés** : j'ai lu la
   source du test (`LieutenantUiExtensionPlayModeTests.cs:375-412`) et je la juge bien construite, je ne
   l'ai pas exécutée. Une garde non exécutée reste une prose datée avec un `[Test]` devant.
3. **L'état DÉSACTIVÉ du bouton de réaffectation n'est pas observable** sur cette base : le compte sert
   `AVAILABLE`. Et le **panneau de détail n'est pas sur la planche** (le commit le dit ; je le confirme —
   la planche ne montre que le bandeau, l'en-tête, l'organigramme et la barre). Donc **D-1b et D-6 ne
   sont couverts par aucune image**, seulement par le code et les tests non lancés.
4. **Le bundle mesuré est la SOURCE, pas la réponse servie** : j'ai compté dans
   `services/game-back/src/i18n/string_table.ts`, pas sur `GET /v1/i18n/bundle`. Mes comptes :
   **13** clés `famille.archetype.*` (le commentaire `FamilleLabels.cs:52` en annonce **14**) et
   **56** clés `famille.ecran.*` (le commentaire `:877` en annonce 56 — exact). Le « 675 clés » du
   commit n'est pas vérifiable sans requête. L'écart 13/14 n'affecte aucun des 4 verdicts de clé
   ci-dessus, qui portent sur des présences/absences individuelles, chacune re-testée nommément.
5. **Statut de dette des 5 littéraux d'ancienneté** : j'ai mesuré `famille.anciennete.*` = 0 clé et
   0 appel catalogue dans `Anciennete`, mais **je n'ai pas vérifié l'inventaire de dette** pour savoir
   s'ils y sont inscrits (TD-643 ne couvre, d'après le commit, que les 3 archétypes).
6. **Je n'ai pas lu `rapport.md`** du juge visuel r3, présent dans le répertoire de la planche —
   le mandat l'interdit et le dossier le déclare non fourni. Les lectures d'image sont les miennes.
7. **Le dépôt Unity bougeait pendant la passe** (HEAD `9e1953bb` → `8f179f5`). Rien de ce que j'ai mesuré
   ne dépend de HEAD, mais je n'ai pas d'avis sur l'état courant de `Assets/Scripts` du worktree.
