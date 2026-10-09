# Revue ⊥ ciblée n°5 du §17 (v4.8, retour d'appui) — **NOT_APPROVED**

**Objet.** `Tools/conformite-anim-2026-10-07/design-couche-mouvement.md` **v4.8**, §17 (retour d'appui),
avec §8, §10 (G9, G11, G14 + « le mécanisme »), les dettes 21/24/29/30 de
`dettes-design-mouvement.md` et la note ciblée de `catalogue-mouvements.md` (§I.4).
**Base.** worktree `/home/erutheone/project/mafia-unity-F`, HEAD `b7c522a7`, diff relu :
`git diff 3f31e3b2 b7c522a7 -- Tools/conformite-anim-2026-10-07` (3 fichiers, +120/−23).
**Relecteur** ⊥ : contexte vierge, aucune ligne de ce design écrite par moi. Rien n'est codé.
**Règle appliquée** : BLOCKING = le code (ou le test) écrit d'après ce design serait faux — garde non
écrivable, règle inimplémentable, affirmation que le code réel dément. Une prémisse non démontrable
depuis le dépôt se tranche par une mesure, pas par un BLOCKING.
**Hors discussion** (arbitrage f2 du 08/10, relayé par l'orchestrateur) : le RETRAIT de l'`Echelle`
lui-même. Je ne le rouvre pas ; je ne juge que la **cohérence** de ce retrait et les deux gardes réécrites.

**VERDICT : NOT_APPROVED — 3 BLOCKING · 4 IMPORTANT · 4 mineurs.**

Les trois BLOCKING sont tous dans les pièces NEUVES de la v4.8 (la signature de G14 (a), le contrôle
positif de B3, la propagation du retrait au catalogue). Tout ce que la v4.8 annonce avoir *vérifié dans
le code* est, lui, exact : les 29 citations `fichier:ligne` que j'ai recontrôlées à HEAD tombent juste
(table en fin de rapport), la preuve de B3 sur les deux branches de `Gardes.G11` est **valide**, et les
quatre comptes neufs (75/22 `ContentSizeFitter`, 13 `.asmdef`, 8 assemblies, 7 sites `<color`) sont
reproductibles. Le défaut n'est pas dans la mesure : il est dans trois conclusions qui n'ont pas été
confrontées au code qui les porte.

---

## BLOCKING

### B1 — G14 (a) : la signature à deux arguments rend les **cas 3 et 4 du §17 inatteignables**

§10 « le mécanisme », pièce (a), ligne 147 :

> `AttacherRetourAppui(Entree appui, RectTransform surface, Entree voile, RectTransform cibleVoile)`
> (`Regie.cs:86`) devient **`AttacherRetourAppui(RectTransform surface, RectTransform cibleVoile)`** : la
> méthode résout elle-même les deux entrées dans son propre dictionnaire d'admises […] **aucun site
> d'appel ne peut nommer l'entrée** : il n'y a plus de paramètre où la mettre.

Le corps de la méthode, à HEAD (`Assets/Scripts/ShellContracts/Mouvements/Regie.cs:86-103`) :

```
 86  public Handle AttacherRetourAppui(Entree appui, RectTransform surface, Entree voile, RectTransform cibleVoile)
 ...
 94      if (melange && !PlaceMelangeLibre && voile != null && cibleVoile != null)
 95      {
 ...
 98          Handle hv = Creer(voile, cibleVoile, Reglage.Defaut, false, 0f, 0f, null, true);
 ...
102      return Creer(appui, surface, Reglage.Defaut, false, 0f, 0f, null, true);
```

Le chemin du voile n'est emprunté **que** si `melange && !PlaceMelangeLibre`. Or le §17 distingue deux
choses différentes : (i) la **bascule du cas 0** (plafond `Melange` plein) — c'est ce `if` ; (ii) les
**cas 3 et 4**, où `Retour.Poser` a déjà établi qu'**aucune surface ne rend** et veut le voile *seul*,
plafond libre ou non (« sinon, si `Peint(b)` ⇒ `retour.appui-voile` sur `b` », ligne 311 ; cas 4 ligne
312). Et le §17 ferme toutes les autres portes : « il passe **TOUJOURS** par
`Regie.AttacherRetourAppui` » (lignes 265-266), et G14 (c) **refuse** `retour.appui-voile` venu du chemin
`Attacher` ordinaire (ligne 149).

Avec la signature v4.7 (4 arguments), les cas 3-4 ont un chemin : l'appelant passe **l'entrée du voile
comme `appui`** et sa cible comme `surface` — `melange` calculé à `:91-92` vaut alors `false` (le voile
n'a qu'un canal `Alpha`), le `if` de `:94` est sauté, et `:102` attache le voile avec
`retourAppui: true` (donc la place réservée). C'est le seul degré de liberté qui rend les cas 3-4
exprimables, et la v4.8 le **supprime** sans le remplacer. Écrit tel que (a) le prescrit, le code donne,
en cas 3-4 :

- `surface == null` ⇒ `Creer` lève : `Regie.cs:505` `if (cible == null) throw new ArgumentNullException(nameof(cible));`
  — alors que le §17 ligne 273 promet « il ne lève **jamais** » ;
- ou l'appelant passe la cible du voile comme `surface` ⇒ la régie attache `retour.appui`
  (`Melange`) sur une surface dont `RendSurface` est **faux** : le retour invisible que tout le §17
  existe pour éviter (et `Couple.Realisable` ne l'arrête pas — `RegieInterne.cs:102` n'exige qu'un
  `Graphic`, pas un `Graphic` qui rend) ;
- ou l'appelant passe `null` et le coder « invente » la convention `surface == null ⇒ voile direct` —
  mais (a) écrit « Rien à inventer », et le §17 cas 0 (lignes 270-271) continue de parler d'un paramètre
  `voile` *nul* qui n'existe plus.

Dans les deux premières branches, le handle rendu est nul ou le retour est invisible en **cas 3-4** —
et G9 v4.8 (`ROUGIT aussi sur un handle NUL en cas 1-4`, ligne 334) le signalerait : la v4.8 crée le
défaut que sa propre garde doit attraper.

**Défaut sûr demandé** (pas une réécriture : le choix est à l'auteur) : ou garder un **troisième
paramètre d'intention** (p. ex. `AttacherRetourAppui(RectTransform surface, RectTransform cibleVoile)`
avec `surface` nullable **et la clause écrite** « `surface == null` ⇒ voile direct, place réservée
incluse »), ou deux méthodes (`AttacherRetourAppui` / `AttacherVoileDAppui`) toutes deux posant
l'`Id` elles-mêmes — l'invariant de (a) (« aucun site d'appel ne peut nommer l'entrée ») est préservé
dans les deux cas. Et dire ce que devient `Regie.cs:88-89` / `:96` (les trois levées sur `appui`/`voile`
deviennent mortes : les entrées résolues sont `Retour` par construction).

### B2 — le contrôle positif de B3 est **nommé sur un bouton que le code classe en cas 4**

§17 ligne 299-301 et ligne 338-341 (deux fois, mot pour mot le même porteur) :

> Contrôle positif : un `Button` monté sous un ancêtre `ContentSizeFitter` (**un bouton de la liste
> défilante de ㉜**, cf. la chaîne ci-dessus), appui simulé ⇒ **cas 1 ou 2**, `EstVivant(handle)` vrai,
> `Refus` inchangé […] si un jour une `Echelle` revient au retour d'appui, **ce contrôle rougit
> immédiatement** (G11, `Gardes.cs:211`).

La chaîne de parenté citée par le design est exacte (je l'ai relue ligne à ligne, cf. table). Elle
aboutit à `RendreCliquable` — et c'est là que l'affirmation casse. Mesure :

```
$ grep -n "AddComponent<Button>" Assets/Scripts/Operational/Delegation/DelegationScreenController.cs
1528:            Button b = zone.AddComponent<Button>();
```

**Un seul** site de création de `Button` dans tout ㉜ (les 5 appels de `RendreCliquable` — `:1176`,
`:1177`, `:1338`, `:1361`, `:1396` — passent tous par lui), et il est ainsi :

```
1522            GameObject zone = NouveauUI("Touche", go.transform);
1525            Image cible = AjouterImage(zone);
1526            cible.color = new Color(0f, 0f, 0f, 0f);
1528            Button b = zone.AddComponent<Button>();
1529            b.transition = Selectable.Transition.None;
```

Aucun `targetGraphic` n'est assigné (et `Selectable.Reset` n'existe qu'en éditeur — le §17 le dit
lui-même au cas 2), le seul `Graphic` du GameObject est à α 0, et la zone n'a pas d'enfant. Le §17
**l'écrit noir sur blanc** au cas 4, ligne 314-315 : « `DelegationScreenController.cs:1519-1531` […]
`Image` à `new Color(0f,0f,0f,0f)`, `Button` à `transition = None` posé dessus ⇒ **cas 1-2
impossibles** ». Le design affirme donc, à 25 lignes d'intervalle, que le même bouton est en cas 1-2
(ligne 300, 339) et qu'il ne peut pas l'être (ligne 315).

Conséquence sur le code écrit d'après le design : le test écrit littéralement est **rouge d'emblée**
(il exige « cas 1 ou 2 » d'un bouton qui tombe en cas 4) ; et s'il est « réparé » en acceptant le cas
4, il devient **vide pour ce qu'il prétend garder** — un cas 4 attache `retour.appui-voile`
(`Alpha` `Multiplicatif`), entrée qui ne portera **jamais** d'`Echelle` ; `Gardes.G11` n'est alors
consultée sur aucun canal `Echelle`, et la régression « une `Echelle` revient au retour d'appui » ne
fait **rien** rougir. Le seul garde-fou nommé contre la réouverture de B3 ne garde rien.

**Défaut sûr** : nommer un porteur qui satisfait les deux conditions (ancêtre `ContentSizeFitter` **et**
`RendSurface` vrai au `PointerDown`) — soit un bouton réel mesuré comme tel au relevé de G9, soit, plus
simple et cohérent avec les contrôles NÉGATIFS du même paragraphe (qui sont tous des montages
synthétiques), **un montage de test** : `ContentSizeFitter` sur un ancêtre, `Image` opaque sur le
GameObject du `Button` ⇒ cas 2, handle non nul, `Refus` inchangé.

### B3 — `Echelle` **toujours active** dans le catalogue, là où le mouvement est spécifié

La note ciblée de la v4.8 (`catalogue-mouvements.md:332-338`) ne corrige qu'une cellule de §I.4 et se
clôt par : « **Le reste de ce fichier n'est pas relu par cette note.** » Deux traces restent **actives**,
et ce ne sont pas des archives :

1. **§II.0.a, ligne 422** — la ligne `retour.appui` de la table des mouvements, celle qui porte la
   spécification complète du geste (durées, aisance, cible) :

   > **appui** : `Melange` 0 → 1 (`CouleurA = Cible`, `CouleurB = Cible × 0,85`), **90 ms**,
   > `ease-out`, **et `Echelle` 1,00 → 0,97 seulement si la plus grande dimension du bouton ≤ 1/3 du
   > cadre (design §8) et qu'aucun `ContentSizeFitter` n'est posé sur la cible ni sur un ancêtre
   > (G11)** · **relâchement** : retour à `Melange` 0 **et `Echelle` 1,00**, **140 ms**, `ease-out`.
   > Total ≤ 230 ms.

   §I.4 (ligne 351) ne donne ni l'aisance, ni le détail appui/relâchement : un coder qui implémente le
   geste lit §II.0.a. Il y trouve la règle que le design déclare **ANNULÉE** (§8 ligne 113) et dont la
   dette 29 démontre qu'elle n'a **aucun chemin d'implémentation** — et, s'il l'écrit, il réarme B3
   (un canal `Echelle` fait refuser l'**entrée entière** sous un `ContentSizeFitter` ancêtre, donc tout
   bouton de liste défilante perd son retour en silence).
2. **§I.2.9, ligne 292** — la section « G11 appliquée dans ses deux moitiés », liste des **échelles
   restantes, mesurées** : « […] `retour.appui`, **conditionnée par sa règle** ». La contrainte
   structurelle du catalogue compte donc encore une `Echelle` sur `retour.appui`.

C'est exactement le défaut que la v4.8 reproche elle-même à la version précédente de la dette 21 :
« **deux consignes vivantes et opposées pour le même lot** » (`dettes-design-mouvement.md:33`, dette 21). Une note
qui se déclare hors périmètre du reste du fichier **constate** la contradiction, elle ne la ferme pas.

**Défaut sûr** : retirer la clause `Echelle` de §II.0.a ligne 422 (appui et relâchement) et retirer
`retour.appui` de la liste des échelles restantes de §I.2.9 ligne 292, en renvoyant les deux à la
dette 29. Deux cellules, aucun compte touché (la colonne `Pistes` reste 1 — vérifié : une `Entree` =
une piste, le retrait d'un canal ne change pas §V).

---

## IMPORTANT

### I1 — le contrôle négatif de la réserve devient **vide**, et la dette 21 le déclare intact

`dettes-design-mouvement.md:33` (dette 21 réécrite) finit par :

> Ce qui restait vrai et le reste : le chemin `Attacher` ordinaire n'a pas la réserve (test
> `E0_RetourDAppui_JamaisRefuse_QuotaNonAmbiancePlein`, **contrôle négatif**).

Ce contrôle négatif est `Assets/Tests/PlayMode/MouvementsRegiePlayModeTests.cs:151-153` :

```
151            regie.Detacher(h);
152            Assert.IsTrue(regie.Attacher(voile, Img("bouton.q2", Color.white).rectTransform, Reglage.Defaut).EstNul,
153                "hors AttacherRetourAppui, pas de réserve");
```

Il prouve aujourd'hui que `Attacher` refuse **par le quota** (la réserve n'existe qu'au chemin du
retour d'appui). Après G14 (c) — garde posée « **avant les quotas** », §10 ligne 149 — et (d) (« **Les
tests passent aux entrées réelles** »), ce même `Attacher` est refusé **par G14**, avant d'atteindre
`Regie.cs:523`. L'assertion reste verte et ne prouve plus rien de la réserve : c'est la classe de
défaut que la revue v3 avait relevée en B1 (une assertion vraie quoi que fasse le mécanisme). La dette
30 liste 5 tests à réécrire ; celui-ci n'y est pas, et la dette 21 affirme explicitement qu'il tient.

**À écrire** : ce contrôle négatif garde une entrée `Retour` **synthétique** (dont l'`Id` n'est ni
`retour.appui` ni `retour.appui-voile`), ou assert sur la **raison** du refus ; à nommer dans la
dette 30 avec les cinq autres.

### I2 — (b) « la seule voie restante » est démentie par l'API publique de `Regie`

§10 pièce (b), ligne 148 :

> Et `Regie` n'offre aucune recherche par `Id` : son API publique (relevée en entier par la revue n°4)
> ne contient **aucune** `Entree Trouver(string)`. ⇒ **la seule voie restante** pour obtenir l'une des
> deux entrées est d'énumérer `CatalogueHud.Entrees` : c'est cette voie, **et elle seule**, que (c) ferme.

Vrai sur la lettre (aucune recherche *par `Id`*), faux sur la conclusion : `Regie.cs:122`
`public bool Inspecter(int rang, out Entree entree, out RectTransform cible)` rend l'`Entree` de
**n'importe quelle piste vivante** — un site fautif obtient donc la vraie entrée pendant qu'un appui
est en vol, sans toucher `CatalogueHud`. La **propriété survit** (c'est (c), le refus dans `Creer`, qui
la tient — et (c) couvre cette voie comme les autres : j'ai vérifié que les **quatre seuls** appels de
`Creer` sont `:98`, `:102` (`retourAppui: true`), `:159` (`Attacher`) et `:171` (`Transitionner`), les
deux derniers à `false`). Mais l'argument d'unicité de (b) est faux, et il est **load-bearing** dans
la démonstration de G14 — même genre d'erreur que l'I1 de la revue n°4 (une phrase qui dit l'inverse de
la mesure). À corriger en une phrase : « (c) ferme **toutes** les voies, quelle qu'elle soit, puisqu'il
mord sur l'`Id` à l'intérieur de `Creer` ».

### I3 — ce qui reste du §17 cas 0 et de `Regie.cs:89` après (a) n'est pas dit

Le §17 cas 0 (ligne 270-272) énumère ce que la réserve **ne** neutralise **pas**, dont : « l'absence de
voile (`voile` **ou** `cibleVoile` nuls ⇒ le refus ordinaire s'applique) ». Après (a), `voile` n'est
plus un paramètre : il est résolu dans `admises` et ne peut pas être nul (ou la méthode lève, G1).
De même la v4.8 continue d'expliquer la faille de la v4.7 par « `Regie.cs:89` ne vérifiant que
`appui.Genre != Genre.Retour` » (ligne 279) sans dire que cette levée, et celle de `:88`, et le
`voile.Genre` de `:96`, deviennent **mortes**. Un coder doit deviner s'il les supprime, et quoi
journaliser à la place. Une ligne suffit — mais elle manque, et le §17 restera faux à la lecture tant
qu'elle manque. (Lié à B1 : même pièce, autre conséquence.)

### I4 — Q6 du catalogue : une ratification f2 opposée, toujours présentée comme en vigueur

`catalogue-mouvements.md:1066` : « ### Q6 — L'échelle 0,97 du retour d'appui sur un bouton plein écran
— **RATIFIÉE** (f2 07/10 ; design §8) », et `:1076` : « > **Reco** : `Echelle` seulement si la plus
grande dimension du bouton ≤ **1/3 du cadre** ». La dette 29 enregistre bien l'annulation côté dettes,
mais le registre des questions tranchées continue d'afficher une décision f2 **ratifiée** que
l'arbitrage f2 du 08/10 a renversée. Un lecteur qui cherche « qu'a décidé f2 sur l'échelle ? » trouve
d'abord celle-ci. Marquer Q6 « **ANNULÉE** par l'arbitrage du 08/10 (dette 29) » — une ligne, aucun
compte touché.

---

## mineurs

- **m1 — `catalogue-mouvements.md:343` cité deux fois pour la ligne de §I.4** (§8 ligne 113 : « la
  colonne canaux de `retour.appui` (`catalogue-mouvements.md:343`, §I.4) » ; table B2 ligne 387 :
  « `catalogue-mouvements.md:343` ramené à `Melange` Abs »). À HEAD, `:343` est une ligne de prose
  (« « Mult » = `Multiplicatif`… ») : la ligne `retour.appui` est à **`:351`**, décalée de 8 lignes par
  la note que **le même commit** a insérée. La v4.8 affirmant « le §17 est lu à HEAD » (ligne 272), la
  citation doit l'être aussi.
- **m2 — « 75 occurrences dans 22 fichiers »** (§17 ligne 292, dette 29) : 22 fichiers ✔ ; 75 est le
  nombre de **lignes** qui nomment `ContentSizeFitter` (`grep -rn … | wc -l` = 75), pour **93**
  occurrences brutes. Le chiffre est reproductible, le mot « occurrences » est lâche.
- **m3 — §II.0.a ligne 423 garde les citations décalées** que la v4.8 a rafraîchies dans le design
  (`DelegationScreenController.cs:1527-1535` / `DemolitionScreenController.cs:1453-1459` ; HEAD :
  `:1519-1531` / `:1449-1461`). Même commit, même mineur m3 : la correction n'a pas été portée au
  catalogue.
- **m4 — « la garde rougit sur un site fautif » surévalue (c)** (§10 G14, ligne 143 et 149). Le refus
  de `Creer` **empêche** le site fautif (handle nul, `Refus++`, un `Debug.LogWarning` par
  `Regie.cs:487-490`) ; il ne le **détecte** pas au build : seul le test du contrôle positif rougit, et
  il rougit sur la garde, pas sur le site. C'est suffisant pour la propriété (empêcher vaut mieux que
  détecter), mais le mot « rougit » promet un signal de CI qui n'existe pas pour un site neuf.

---

## Ce que j'ai vérifié et qui est JUSTE (ne pas rouvrir)

**La preuve de B3 (les deux branches de G11) est valide.** `Gardes.cs:196-214` : `G11` n'a que
`if (c.EstTranslation)` et `else if (c.P == Propriete.Echelle && cible.GetComponentInParent<ContentSizeFitter>(true) != null)`
(`:211`), puis `return null;` (`:213`) — donc `null` sur `Melange` comme sur `Alpha`, et `Regie.cs:546`
ne refuse pas. `EstTranslation` est bien `P == TranslationX || P == TranslationY` (`Modele.cs:84`).
La chaîne de parenté de ㉜ est exacte dans ses **12** citations (`:919`, `:964-965`, `:980`, `:981`,
`:999`, `:1001`, `:457`, `:508`, `:548`, `:1176-1177`, `:1519-1531`, `:1528`) — c'est la conclusion
« cas 1 ou 2 » qui est fausse (B2), pas la parenté.

**G14 (c) et (d) sont écrivables et la propriété tient** (modulo B1) : le drapeau existe
(`Regie.cs:503` `… bool retourAppui)`), ses 4 sites d'appel sont exhaustivement `:98`/`:102` (`true`)
et `:159`/`:171` (`false`), `admises` est bien indexé par `Id` (`Regie.cs:23`) avec résolution par
**identité de référence** (`:476` `!ReferenceEquals(admise, e)`), et `Admettre` lève bien sous un `Id`
déjà admis par une autre référence (`:115-116`). Les 4 appels de test nommés par la dette 30 sont bien
aux lignes **105, 116, 145, 222**, et `E0_AttacherRetourAppui_HorsCatalogue_Leve_MemeSurLeCheminDuVoile`
bien à **206-224** : la conséquence « il perd son porteur » est juste.

**Citations recontrôlées à HEAD, toutes exactes** : `Regie.cs` `:23` `:54-60` `:86` `:89` `:98` `:102`
`:115-116` `:156` `:330` `:476` `:480-485` `:503` `:518` `:520` `:523` `:544` `:545-546` `:549-553` ·
`Gardes.cs` `:183` (seuls littéraux `"retour.appui"`/`"retour.appui-voile"` de `Assets/Scripts`, vérifié
par `grep -rn`) `:211` `:265` `:272` `:309` · `Modele.cs` `:84` `:192-204` · `MouvementTunables.cs`
`:18` `:76` (`3f / 255f`) · `Couleurs.cs:32` (max par canal ⇒ « le plus grand canal » est bien ce que
`EcartRvb` calcule) · `RegieInterne.cs` `:102` `:124` · `BandeauEphemere.cs` `:146` `:181` `:211` `:279`
(les quatre rafraîchies par m3 de la v4.8 : exactes) · `DemolitionScreenController.cs:1449-1461` ·
`MouvementsGardesPlayModeTests.cs:478` · `UiTimingTunables.cs:18` (`AnimMaxBlockMs = 250`, donc le
« ≤ 250 ms » de G8 est bien le canon).

**Comptes neufs de la v4.8, tous reproduits** : `ContentSizeFitter` → 22 fichiers (75 lignes) ·
`.asmdef` dans `Assets` → **13** · assemblies référençant `ShellContracts` → les **8** nommées
(`Account, CityMap, CitySim, CoreLoops, Economy, Onboarding, Operational, Shell`), plus
`ShellContracts` lui-même et l'assembly de tests · `<color` dans `Assets/Scripts` → **8** occurrences
dont `DailyReviewScreenController.cs:537` est un **commentaire** ⇒ les **7 sites** nommés dans **6**
fichiers, exactement ceux de la v4.8, et la répartition fragment (5) / chaîne entière (2) est fidèle ·
`ignoreParentGroups`, `colorGradient`/`enableVertexGradient`/`VertexGradient`, `<alpha=` → **0** ·
`appui`/`Appui` dans `CatalogueHud.cs` → **0** (dette 24 : les deux entrées sont bien à CRÉER) ·
`0,15 × 0,851 × 0,18 = 0,023` vs `0,128` : arithmétique juste, et cohérente avec « R 5,9/255 ».

**G9 v4.8 (handle nul) est bien spécifiée et sa sensibilité tient** : sous le protocole de relevé
(régie vierge + `Detacher` après chaque bouton, §17 ligne 329-331), aucun des chemins de refus listés au
cas 0 ne peut produire un handle nul légitime en cas 1-4 (quota et plafond `Melange` neutralisés par la
réserve et le `Detacher` ; G11 ne mord plus ; `Realisable` est satisfait par construction en cas 1-2
— `RendSurface` implique un `Graphic` sur le GameObject de la surface — et trivialement en cas 3-4
(`Alpha`) ; G12 exige deux `Absolu` sur le **même** couple, impossible bouton par bouton ; multi-touch
exclu par le protocole). Le rouge sur handle nul est donc un rouge de défaut, pas de bruit : c'est la
bonne réponse au B3 de la revue n°4.

---

## Auto-audit du verdict

- J'ai lu **le vrai fichier** pour chaque assertion : aucun compte ni identifiant de ce rapport ne
  vient d'un affichage filtré. Les lectures de code sont faites par `python3` avec numérotation
  explicite (ou `rtk proxy grep -n`), jamais par `cat`/`head`.
- Les trois BLOCKING portent chacun une **citation exacte du design** et une **citation exacte du
  code** qui la dément, aux lignes nommées ci-dessus. Je n'ai retenu aucun BLOCKING sur une prémisse
  non mesurable : B1 et B2 se démontrent entièrement dans le dépôt à HEAD, B3 se démontre dans le
  catalogue lui-même.
- Je n'ai PAS rouvert l'arbitrage f2 (retrait de l'`Echelle`), ni ce que la revue n°4 avait déclaré
  vérifié : les points I3/I4 de sa table n°3 (réserve = UNE place, G12 d'exécution) sont relus comme
  **fermés**, et je ne les recompte pas.
- Si l'auteur réfute un finding avec une mesure, je le lâche. Le plus réfutable est **B3** : il tient
  si et seulement si §II.0.a est lue par qui code le geste ; si l'auteur démontre que §I.4 est la
  **seule** source normative et que §II.0.a est de l'archive, B3 tombe en IMPORTANT — mais la ligne
  292 de §I.2.9 (une **contrainte**, pas une archive) reste à corriger.
- Ce que je **n'ai pas** fait, et qui n'est pas requis : aucune exécution Unity (aucun créneau pris,
  aucun typecheck lancé) ; les affirmations de comportement à l'exécution sont donc des lectures de
  source, pas des mesures de run — et je les ai marquées comme telles.
