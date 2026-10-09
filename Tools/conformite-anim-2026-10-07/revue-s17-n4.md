# Revue ⊥ n°4, ciblée — §17 v4.7 (commit `174de2cc`), 67 boutons du retour d'appui

Dépôt `/home/erutheone/project/mafia-unity-F` (worktree), branche `lot/mots-client-2026-10-08`.
Lecture seule : rien écrit dans le dépôt hors ce rapport, aucun commit, **aucun Unity lancé, aucun run, aucun
test, aucun docker** (la porte est tenue). Analyse statique seule (`Read`, `grep`, `sed -n`, `git show`).
Auteur ≠ relecteur : je n'ai écrit ni le §17, ni le catalogue, ni `Regie.cs`, ni `Gardes.cs`.

## 1. Verdict et comptes

**NOT_APPROVED — 3 BLOCKING, 5 IMPORTANT, 4 mineurs.**

| compte | mesure (binaire) |
|---|---|
| points de n3 (1 B + 4 I + 5 m) | **10** |
| fermés proprement | **6** (I3, I4, m1, m2, m3 en partie, m5) |
| mal fermés / fermés par une affirmation FAUSSE | **2** (B1 → mon B1 ; I1 → mon I2) |
| fermés de travers (place ou portée) | **2** (I2 → mon I4 ; m4 → mon m2) |
| occurrences de `appui`/`Appui` dans `CatalogueHud.cs` | **0** ⇒ dette 24 part d'une prémisse fausse (mon I3) |
| appels de `AttacherRetourAppui(` dans `Assets/Scripts` | **1** (la déclaration, `Regie.cs:86`) |
| sites `ContentSizeFitter` dans `Assets/Scripts` | **75**, dans **22** fichiers (mon B3) |
| sites `<color=` dans `Assets/Scripts` | **7** en code (+1 en commentaire), 6 fichiers — le §17 en annonce **4** (mon I4) |
| `ignoreParentGroups` / `colorGradient` | **0** / **0** ⇒ les deux « 0 site mesuré » du §17 sont JUSTES |
| tables « Réponse à la revue ⊥ n°3 » dans le design | **0** (mon I5) |

Ce que je salue, vérifié ligne à ligne :

- **n3-I3 (la réserve est UNE place) est fermé net et juste.** `Regie.cs:520` `int plafondAutres =
  MouvementTunables.QuotaAlerteRetourTransition - (retourAppui ? 0 : MouvementTunables.PlacesReserveesRetourAppui);`
  puis `:523` `if (!amb && nAutres >= plafondAutres) return Refuser(…)`, avec `QuotaAlerteRetourTransition = 16`
  (`MouvementTunables.cs:17`) et `PlacesReserveesRetourAppui = 1` (`:20`). Le §17 dit maintenant exactement cela.
- **n3-I4 (G12) est fermé avec une citation EXACTE au commit de rédaction.** À `174de2cc`, `Regie.cs:517-521` est
  bien le bloc de G12 d'exécution (`517 if (c.M == Mode.Absolu && q.occupant >= 0)` … `521 if (!q.occupantTransition)
  return Refuser(e, "G12 : deux Absolu sur …")`), pas celui de donnée. La prémisse remplace l'argument, comme demandé.
- **n3-m5 est fermé et vrai** : `Regie.cs:509` `if (e.EstSansHote) return Refuser(…)` et `:512` G8 existent bien, et
  `Gardes.cs:183` borne déjà les deux `Id` à `AnimMaxBlockMs`.
- **n3-m1 est fermé DANS LE CODE** (ce que n3 réclamait) : `Gardes.cs:309` dit aujourd'hui « Le plafond de **10**
  pistes `Melange` vivantes » ; `dettes:36` l'enregistre.
- **n3-m2 est fermé** : `PolitiqueMouvement.cs:20` est bien `public static class GelDeMouvement` (la méthode `Gele`
  est à `:22`, la règle `Retour` à `:30`) — citation acceptable.
- **Les deux « 0 site mesuré » sont des mesures, pas des arguments** : `grep -rn "ignoreParentGroups" Assets` ⇒ 0 ;
  `grep -rn "colorGradient\|enableVertexGradient\|VertexGradient" Assets` ⇒ 0. Et `grep -rn "<alpha=" Assets/Scripts`
  ⇒ **0** : le risque symétrique (un texte à `color` opaque rendu transparent par balise, qui ferait un faux cas 3)
  est nul aujourd'hui. Un trou mesuré à 0 et nommé se garde.
- **Les citations de prédicat tiennent à la source** : `RegieInterne.cs:102` `case Propriete.Melange: case
  Propriete.Hue: return rt.GetComponent<Graphic>() != null;` et `:124` `gr = rt.GetComponent<Graphic>();` — exactes.
  `Couleurs.cs:32` est bien la signature de `EcartRvb`, dont le résumé dit « l'alpha n'entre pas » : le §17 a raison
  sur ce point. Et le voile `Alpha` est réalisable sur n'importe quel `RectTransform` (`RegieInterne.cs:106`
  `default: return true`, `:118-121` pose un `CanvasGroup`) : les cas 3-4 sont faisables.
- **L'exemple de cas 4 est juste** : `DelegationScreenController.cs:1522-1528` crée bien une zone `Touche` étirée,
  `Image` à `new Color(0f,0f,0f,0f)`, `Button` posé dessus, `transition = None` ⇒ cas 1-2 impossibles, parent de
  même aire ⇒ voile sur la plaque. La chaîne décrite par le §17 est celle du code.

---

## 2. BLOCKING

### B1 — G14 v4.7 n'est toujours pas une garde écrivable : le motif qu'elle scanne ne peut pas exister, et §17:258-259 reste une affirmation que rien ne tient. (n3-B1 NON fermé)

*Où* : `design-couche-mouvement.md:141` (G14), `:258-259`, `dettes-design-mouvement.md:36` (dette 24).

*Citation* (`design:141`) : « (a) aucun `Attacher(`/`Transitionner(` **dont l'argument d'entrée soit l'une des deux
constantes `CatalogueHud.IdRetourAppui` / `IdRetourAppuiVoile`** hors `Regie.AttacherRetourAppui` ; (b)
`AttacherRetourAppui(` n'apparaît que dans `Retour.cs` (lot E2e) et `Regie.cs`, et **`Retour.cs` n'y passe que ces
deux constantes** ».

*Preuve* — les deux lectures possibles échouent, et je les prends toutes les deux :

1. **Lecture littérale : le motif est impossible, la garde est vide.** Les trois méthodes prennent une `Entree`, pas
   un `Id` :
   ```
   $ grep -n "public Handle Attacher\|public Handle Transitionner\|public Handle AttacherRetourAppui" Assets/Scripts/ShellContracts/Mouvements/Regie.cs
   86:        public Handle AttacherRetourAppui(Entree appui, RectTransform surface, Entree voile, RectTransform cibleVoile)
   156:        public Handle Attacher(Entree e, RectTransform cible, Reglage r, Action<Handle> quandFini = null)
   165:        public Handle Transitionner(Entree e, RectTransform cible, float de, float vers, Action<Handle> quandFini = null)
   ```
   Une constante d'`Id` (une `string`) ne peut **jamais** être « l'argument d'entrée » de `Attacher(` : le code qui
   violerait G14 s'écrit `regie.Attacher(CatalogueHud.RetourAppui, rt, Reglage.Defaut)` — avec le champ `Entree`,
   jamais avec l'`Id`. G14(a) est donc **verte par construction** et laisse passer exactement ce qu'elle prétend
   interdire.
2. **Lecture charitable (« l'entrée que ces constantes désignent ») : indécidable statiquement**, c'est-à-dire le
   point 2 de n3-B1 inchangé. Le catalogue n'expose pas d'`Id` au site d'appel et la régie n'offre **aucune**
   recherche par `Id` : API publique de `Regie` relevée en entier (`grep -n "public " Regie.cs`) = `Horloge`,
   `Politique`, `PistesVivantes`, `Refus`, `RefusMelange`, `PistesMelange`, `PlaceMelangeLibre`, `BasculesVoile`,
   `AttacherRetourAppui`, `SansRegie`, `Delestage`, `Evaluations`, `Ecritures`, `Admettre`, `Inspecter`,
   `ValeurEcrite`, `EstVivant`, `Attacher`, `Transitionner`, `Rebaser`, `Detacher`, `DetacherSous`, `Tick`. Aucune
   `Entree Trouver(string id)`. Le site d'appel ne peut donc pas porter la constante, même si on le voulait.
3. **Le trou de n3-B1 point 3 est intact.** `Regie.cs:89` : `if (appui.Genre != Genre.Retour) throw new
   ArgumentException("AttacherRetourAppui : une entrée Retour", nameof(appui));` — rien d'autre. N'importe quel
   `Retour` (`retour.appui-long`, `carnet.en-main`) prend encore la 16ᵉ place réservée. Et `design:258-259` affirme
   l'inverse : « **Seul `retour.appui` / `retour.appui-voile` passe par cette méthode** (G14) : la réserve est celle
   du geste du joueur, pas d'un `Retour` quelconque. »

*Pourquoi BLOCKING* : garde non écrivable (critère de gate), **plus** une affirmation du §17 que ni le code ni une
garde possible ne portent. La réponse v4.7 a changé la portée du scan (`Assets/Scripts` seul : bien) sans traiter la
raison pour laquelle la garde ne pouvait pas être de source.

*Correction (au choix, deux demi-lignes)* : (i) garde de source sur le **symbole d'entrée** — « aucun
`Attacher(`/`Transitionner(` dont le premier argument soit `CatalogueHud.RetourAppui` / `RetourAppuiVoile` hors
`Regie.AttacherRetourAppui` » — ce qui est scannable et non vide ; ou (ii) la garde d'exécution que M1 demandait,
avec la porte de test explicite (`Regie.AdmettreRetourDAppuiDeTest(Entree)` ou un `internal` visible des tests) ;
ou (iii) assumer le trou : retirer `design:258-259` et le consigner en dette (« la réserve est ouverte à tout
`Retour` ; une seule place, donc le risque est borné »). Ce que je refuse, c'est l'affirmation sans garde.

### B2 — L'`Echelle` « sous condition » du `retour.appui` n'est pas réalisable sous un seul `Id` : §8 (règle ratifiée par f2) et le catalogue §I.4 sont inimplémentables en E2e tels qu'écrits.

*Où* : `design:112` (§8), `design:260` (§17 cas 1), `catalogue-mouvements.md:343` (ligne `retour.appui`).

*Citations* : `design:112` « **Échelle seulement si la plus grande dimension du bouton ≤ 1/3 du cadre** ; au-delà,
mélange seul … — décision f2 ratifiée » ; `catalogue:343` colonne canaux : « `Echelle` Mult **(sous condition)** ·
`Melange` Abs » ; `design:260` « `Melange` `CouleurA = Cible` + `Echelle` **sous les conditions du §8 et de G11** ».

*Preuve* — la condition est **par bouton**, le jeu de canaux est une donnée **statique partagée**, et les trois
échappatoires sont fermées :

1. Les canaux vivent dans le `MouvementDefini` d'une `Entree` `static readonly` (`CatalogueHud.cs:52-67` pour le
   motif) : un même `Id` = un même tableau de canaux pour les 67 boutons.
2. **Fabriquer une variante au même `Id` lève.** `Regie.cs:115-116` : `if (admises.TryGetValue(e.Id, out Entree
   deja) && !ReferenceEquals(deja, e)) throw new ArgumentException("Id déjà admis pour une autre entrée : " +
   e.Id);` et, sans `Admettre`, `Regie.cs:476` : `if (!admises.TryGetValue(e.Id, out Entree admise) ||
   !ReferenceEquals(admise, e)) throw new ArgumentException("Entree hors catalogue (G1) : " + e.Id);`
   (l'admissibilité est par **identité de référence**, pas par `Id`).
3. **Aucun masque de canal à l'attachement.** `Modele.cs:192-204` : `Reglage` = `PhaseS, KAmp, KDuree, KDepl, Dx,
   Chute`. `KAmp` neutraliserait bien un canal `Multiplicatif` (`Regie.cs:330` `return 1f + (v - 1f) *
   p.reg.KAmp;`, sans toucher l'`Absolu` du `Melange`) — **mais `AttacherRetourAppui` impose `Reglage.Defaut`**
   (`Regie.cs:98` et `:102`, et dette 23 l'enregistre comme voulu) : le levier existe et n'est pas atteignable par
   le chemin du retour d'appui.
4. Un **second `Id`** (p. ex. `retour.appui-sans-echelle`) résoudrait tout — mais contredit G14 (« ces **deux**
   constantes », « avec ces deux `Id` seulement »), dette 24 (deux constantes) et la ligne unique du catalogue.

*Pourquoi BLOCKING* : une règle de donnée **ratifiée par f2** n'a aucun chemin d'implémentation dans le modèle
figé par E1, et le §17 ne nomme ni la variante, ni le paramètre, ni qui évalue la condition. E2e devra trancher
seul un conflit de canon (§8 vs G14 vs catalogue) : c'est un STOP, pas une déviation de coder.

*Correction* : nommer le mécanisme — soit un `Reglage` passé à `AttacherRetourAppui` (`KAmp = 0` quand l'échelle est
refusée, dette 23 amendée), soit un troisième `Id` au catalogue et à G14. Puis dire **qui** évalue « ≤ 1/3 du
cadre » et contre quel cadre (le `Canvas` ? le `RectMask2D` porteur ?) — non dit non plus.

### B3 — Un bouton sous un `ContentSizeFitter` perd la TOTALITÉ de son retour d'appui, en silence, et G9 tel que spécifié ne le voit pas. G11 manque à la liste que la v4.7 vient de déclarer FERMÉE.

*Où* : `design:253-256` (liste « ce qu'elle ne neutralise pas », réécrite par la v4.7), `design:284-293` (G9).

*Preuve* (binaire, chaîne complète) :

1. **La garde refuse l'ENTRÉE, pas le canal.** `Regie.cs:541-546`, dans la boucle sur les canaux de `Creer` :
   ```
   545:                string g11 = Gardes.G11(cible, c);   // E2a : une translation sous un LayoutGroup, une échelle sous un ContentSizeFitter
   546:                if (g11 != null) return Refuser(e, g11);
   ```
   `Refuser` rend `Handle.Nul` et compte un `Refus` (`Regie.cs:480-485`). Le `Melange` du retour disparaît avec
   l'`Echelle`.
2. **Le prédicat mord sur TOUS les ancêtres.** `Gardes.cs:211` : `else if (c.P == Propriete.Echelle &&
   cible.GetComponentInParent<ContentSizeFitter>(true) != null)`.
3. **Il existe des boutons concernés, nommés et vérifiés** (pas un argument : la chaîne de parenté lue) :
   `DelegationScreenController.cs:980` `GameObject contenu = NouveauUI("Contenu", fenetre.transform);` → `:999`
   `ContentSizeFitter csf = contenu.AddComponent<ContentSizeFitter>();` ; `:919` `zoneCentrale =
   ConstruireZoneCentrale(corpsGo.transform);` rend ce contenu (`:964-965` : « `zoneCentrale` est le CONTENU (ce qui
   défile) ») ; `:457`, `:508`, `:548` parentent chaque plaque à `zoneCentrale` ; `:1176-1177` rendent la plaque
   cliquable, `:1522` crée le `Button` sous la plaque. ⇒ **tout bouton de la liste défilante de ㉜ a un
   `ContentSizeFitter` ancêtre.** Ampleur à mesurer, pas à déduire : `grep -rn "ContentSizeFitter" Assets/Scripts`
   ⇒ **75** occurrences dans **22** fichiers (dont `Conflit`, `Filiere`, `Carnet`, `Reputation`, `Shop`, `Journal`,
   `Delegation`, `Forensic`, `DecisionDetail`, `BuildingCard`, `ExceptionQueue`, `DailyReview`, `Demolition`,
   `Lieutenant`, `Loi`, `Compression`, `LaSuite`, `HighestLeverage`, `AppShell`).
4. **G9 ne rougit pas dessus.** `design:289` : « il ROUGIT **si un bouton tombe en cas 5 sans déclaration** ». Un
   bouton refusé par G11 est en cas 1 ou 2 avec un handle nul : ni cas 5, ni déclaration, **pas de rouge**. Le §17
   dit pourtant `:274` « Aucun compte n'est affirmé ici : la répartition … se MESURE par G9 » — l'instrument ne
   mesure pas ce défaut-là.
5. Et la liste de `design:253-256`, que n3-m5 a fait **fermer** (`SansHote`, G8 ajoutés), ne cite pas G11, alors que
   G11 est dans la même séquence de `Creer`, deux lignes après `Couple.Realisable` qui, lui, y est cité.

*Honnêteté sur la chronologie* : l'appel `Gardes.G11` dans `Creer` est arrivé **après** le commit de design — à
`174de2cc`, la boucle de `Creer` (`:509-521`) enchaînait `Realisable` puis `Trouver`, sans G11 (vérifié sur
`git show 174de2cc:…/Regie.cs`). L'auteur du §17 ne pouvait pas le lire. Je le classe BLOCKING quand même : le §17
est la spec que E2e lira **à HEAD**, l'affirmation « Rien n'est évincé » / « jamais refusé par la régie » y est
désormais fausse, et le défaut passerait la garde censée l'attraper.

*Correction* : ajouter G11 à la liste de `design:253-256` ; **et** donner à G9 un rouge sur « handle nul hors cas 5 »
(sinon G9 ne mesure pas ce qu'il prétend) ; **et** trancher avec B2 (si l'`Echelle` est omise par `KAmp = 0`, G11
mord encore — `Gardes.G11` ne voit pas le `Reglage` ; il faut l'entrée sans canal `Echelle`).

---

## 3. IMPORTANT

**I1 — « `Gardes.cs:243` (G13) ne multiplie que l'alpha du `Graphic` » est FAUX, et c'est la phrase censée fermer
n3-I1 : elle inverse l'avertissement demandé.**
`design:239`. À `174de2cc`, `Gardes.cs:243` est exactement :
`return amp * Couleurs.EcartRvb(a, b) >= MouvementTunables.SeuilCouleurRendue;` (branche `Propriete.Melange` de
`FranchitLeSeuil`) — elle multiplie l'**amplitude des images clés**, et **aucun** alpha. L'alpha du `Graphic`
n'apparaît que dans la branche `Alpha`, `Gardes.cs:236` : `return amp * ctx.AlphaGraphic >= …`. (À HEAD ces deux
lignes sont `:272` et `:265`, le corps est identique.) n3-I1 demandait la phrase « `Gardes.FranchitLeSeuil` n'est
PAS ce prédicat (sa branche `Melange` ignore les alphas, sa branche `Alpha` ignore la couleur) » ; la v4.7 écrit le
contraire de sa première moitié et tait la seconde. Conséquence E2e exacte : un coder qui lit « il ne manque que les
alphas de groupe » réutilise `FranchitLeSeuil` en y ajoutant le seul `CanvasGroup`, laisse tomber `color.a`, et
obtient 0,15 × 0,851 = 0,128 ≥ 3/255 là où le §17 veut 0,15 × 0,851 × 0,18 = 0,023 — le classement « presque tout en
cas 2 » que n3 décrivait. *Correction* : « la branche `Melange` de `Gardes.FranchitLeSeuil` (`Gardes.cs:272`) ne
porte **aucun** alpha, la branche `Alpha` (`:265`) ne porte **aucune** couleur : ni l'une ni l'autre n'est ce
prédicat. »

**I2 — dette 24 part d'une prémisse fausse, et laisse `Gardes.cs:183` dériver du catalogue.**
`dettes:36` : « les deux `Id` sont aujourd'hui **des littéraux dans `CatalogueHud.cs`**. À introduire dans le lot
E2e avec `Retour.cs` ». Mesuré : `grep -n "appui\|Appui" Assets/Scripts/ShellContracts/Mouvements/CatalogueHud.cs`
⇒ **0 ligne** ; le fichier porte 10 entrées (`CatalogueHud.cs:149-152`), aucune n'est un retour d'appui, et il n'y a
aucune constante d'`Id` (les `Id` y sont des littéraux inline, `:53`, `:70`, `:87`…). Les seuls littéraux
`"retour.appui"` / `"retour.appui-voile"` de `Assets/Scripts` sont à **`Gardes.cs:183`**
(`if ((e.Id == "retour.appui" || e.Id == "retour.appui-voile") && dureeMs > UiTimingTunables.AnimMaxBlockMs)`).
Donc : (a) E2e doit **créer** les deux entrées, pas « extraire deux constantes » — la dette sous-estime le lot ;
(b) si les constantes naissent dans `CatalogueHud` sans que `Gardes.cs:183` les consomme, le cas spécial de G8 et
l'`Id` du catalogue peuvent dériver en silence (G8 deviendrait muette sur un `Id` renommé). *Correction* : réécrire
la dette (« les deux entrées sont à CRÉER ; `Gardes.cs:183` doit consommer les constantes »).
**Et dette 21 contredit maintenant G14** : `dettes:33` ordonne encore « ET l'inverse (aucun autre `Id` que ces deux
dans `AttacherRetourAppui`) », exactement la garde d'exécution que `design:141` déclare hors sujet (« pas
d'exécution — une garde d'exécution casserait les entrées synthétiques des tests »). Deux consignes vivantes et
opposées pour le même lot.

**I3 — « (`BandeauEphemere.cs:145`, 3 autres sites) » est un compte non mesuré : il en manque 3, et le §17 en fait la
liste des candidats cas 5.**
`design:241`. Mesure :
```
$ grep -rn "<color=" Assets/Scripts --include=*.cs
Assets/Scripts/Operational/Conflit/ConflitScreenController.cs:972
Assets/Scripts/Operational/Reputation/ReputationScreenController.cs:1176
Assets/Scripts/Operational/Forensic/ForensicScreenController.cs:527
Assets/Scripts/Operational/Forensic/ForensicScreenController.cs:704
Assets/Scripts/Operational/Journal/JournalScreenController.cs:944
Assets/Scripts/Shell/BandeauEphemere.cs:146
Assets/Scripts/Shell/DailyReviewScreenController.cs:537   (commentaire)
Assets/Scripts/Shell/DailyReviewScreenController.cs:546
```
⇒ **7 sites de code**, 6 fichiers. Le « 4 » du §17 recopie l'énumération partielle de n3 (qui citait de surcroît
`ReputationScreenController.cs:1235` : à `174de2cc` comme à HEAD, le site est `:1176` — `grep` ci-dessus). De plus
« peint **uniquement** par balise » n'est pas décidable : à `:527`, `:704`, `:944`, `:546`, `:1176`, la balise colore
un **fragment** (le reste de la chaîne garde la couleur du composant), à `:146` et `:972` toute la chaîne. Le §17
conclut que ces textes « peuvent tomber en cas 5 … et se déclarent » : la liste doit donc être nommée, pas comptée
à la louche. *Correction* : nommer les 7 sites (ou renvoyer le compte au relevé de G9, comme le §17 le fait très
bien pour les 67 boutons à `:274` — « Aucun compte n'est affirmé ici »).

**I4 — « `Retour.cs` (assembly de l'écran) » ne désigne aucune assembly existante, et G14(b) dépend de l'unicité du
fichier.**
`design:241`. Mesuré : il y a **12** assemblies de script (`find Assets -name '*.asmdef'`) et **8** d'entre elles
référencent `ShellContracts` (`Account, CityMap, CitySim, CoreLoops, Economy, Onboarding, Operational, Shell`). Les
67 boutons sont répartis sur plusieurs d'entre elles : un `Retour.Poser` unique ne peut pas vivre « dans l'assembly
de l'écran ». Le seul hôte possible est **`ShellContracts`** — hors `Mouvements/` (donc hors du scan de G7 :
`MouvementsGardesPlayModeTests.cs:478` `Path.Combine(Application.dataPath, "Scripts", "ShellContracts",
"Mouvements")`), et `ShellContracts.asmdef` référence déjà `Unity.TextMeshPro` : le `TMP_Text` de `Peint` y est donc
lisible, l'argument du §17 tient — mais seulement si le fichier est nommé. Sinon E2e peut poser un `Retour.cs` par
assembly d'écran, et G14(b) (« n'apparaît que dans `Retour.cs` et `Regie.cs` ») devient rouge par construction.
*Correction* : « `Assets/Scripts/ShellContracts/Retour.cs` (même assembly que `Mouvements/`, hors du dossier scanné
par G7) ».

**I5 — le §17 v4.7 n'est pas traçable : pas de table « Réponse à la revue ⊥ n°3 », et le document se dit encore
v4.5.**
`design:1` : « — **v4.5** — ✅ APPROUVÉ (revue ⊥ n°4 …) » ; `design:225` : « Ajout v4.3, réécrit **v4.5** » ;
`design:301` : la seule table de réponse est celle de n°2 (« v4.6 »). `grep -n "v4\.7"` sur le fichier ⇒ **0
occurrence**. Les 10 points de n3 ne sont donc rattachables à leur fermeture que par `git show 174de2cc` ; 5 le sont
par des retouches en ligne silencieuses, 2 par une dette. Le dépôt a pourtant la convention inverse (§13 pour n°1,
§14 pour n°2 du design, §15 pour n°4, table de `:301-313` pour n°2 du §17), et c'est elle qui rend un gate
vérifiable sans archéologie. *Correction* : une table n°3 de 10 lignes et un en-tête « v4.7 ».

---

## 4. mineurs

- **1** — unités, n3-m3 à moitié fermé : `design:239` juxtapose maintenant « en valeurs sRGB **0-255** telles que
  Unity les stocke dans `Color` » (faux : `Color` stocke 0..1) **et** la correction « en unités `Color` 0-1 le seuil
  vaut `SeuilCouleurRendue = 3f/255f` » (juste — `MouvementTunables.cs:76` : `public const float SeuilCouleurRendue
  = 3f / 255f;`). La même phrase dit les deux ; retirer la première moitié.
- **2** — n3-m4 fermé au mauvais endroit : l'incise `ignoreParentGroups` est logée dans la clause `TMP_Text` de
  `Peint` (`design:241`, « couleur des sommets et `ignoreParentGroups` hors périmètre : 0 site mesuré »), alors que
  la chaîne qu'elle qualifie est le cumul des `CanvasGroup` des **deux** prédicats (`design:239` et `:244`, « jusqu'à
  la racine du Canvas »). Le 0 est juste (mesuré) ; la place fait qu'un futur `ignoreParentGroups` casserait
  `RendSurface` sans avoir croisé l'avertissement.
- **3** — citations dérivées depuis `174de2cc` par les deux commits E2a (justes à la rédaction, fausses à HEAD) :
  `Gardes.cs:243` → **272** ; `Regie.cs:517-521` → **549-553** ; `BandeauEphemere.cs:145` → **146** (vérifié :
  `git show 174de2cc:…/BandeauEphemere.cs | grep -n "<color="` ⇒ 145 ; à HEAD ⇒ 146). À rafraîchir avant E2e, le
  §17 étant lu à HEAD.
- **4** — G14 scanne du **texte** : le jeton `AttacherRetourAppui(` ne touche rien aujourd'hui hors `Regie.cs:86`,
  mais le nom nu apparaît aussi en commentaire à `MouvementTunables.cs:18` et `Regie.cs:518`. Dire « occurrences de
  code, commentaires et résumés XML exclus » (G7 ne le dit pas non plus, d'où la précision utile ici).

---

## 5. Ce que la v4.7 n'a PAS cassé (vérifié)

- Les 4 appels de test de `AttacherRetourAppui` (`MouvementsRegiePlayModeTests.cs:105`, `:116`, `:145`, `:222`)
  passent bien des entrées synthétiques `t.*` (`t.appui`/`t.voile` à `:97`/`:101`, `t.appui.q`/`t.voile.q` à
  `:139`/`:143`) : l'exclusion `Assets/Tests` de G14 correspond à la réalité du harnais.
- Le chemin du voile reste gardé par G1 : `Regie.cs:93` `VerifierAdmise(appui);` précède le `if` de `:94`.
- `Reduit` garde toujours le voile : `GelDeMouvement.Gele` (`PolitiqueMouvement.cs:30`) rend `false` pour un
  `Retour`/`Alpha` sans pose déclarée, et `catalogue:344` laisse la colonne `PoseDeReposS` à « — ».

---

**NOT_APPROVED — 3 BLOCKING, 5 IMPORTANT, 4 mineurs.** Les quatre IMPORTANT et quatre des cinq mineurs de n3 ont été
traités, deux très bien (la réserve à UNE place, G12 d'exécution). Mais le BLOCKING de n3 revient entier : la garde
a changé de portée, pas de nature, et le motif qu'elle scanne ne peut pas exister dans du code qui compile. S'y
ajoutent deux trous que la source tranche sans ambiguïté : l'`Echelle` « sous condition » n'a aucun chemin
d'implémentation sous un `Id` unique, et un bouton sous un `ContentSizeFitter` perd tout son retour sans que G9 le
voie.

*Auto-audit* : j'ai lu à la source chaque ligne que j'oppose (`Regie.cs` 86-103, 112-118, 156-172, 473-485, 503-559 ;
`Gardes.cs` 169-214, 234-291, 308-309 ; `RegieInterne.cs` 90-145 ; `CatalogueHud.cs` en entier ; `Couleurs.cs`
25-37 ; `PolitiqueMouvement.cs` en entier ; `MouvementTunables.cs` 14-30, 70-80 ; `Modele.cs` 187-215 ;
`DelegationScreenController.cs` 958-1000, 1100, 1140-1180, 1510-1531 ; `MouvementsRegiePlayModeTests.cs` 95-160 ;
`MouvementsGardesPlayModeTests.cs` 460-492), et chaque compte annoncé ici vient d'une commande, pas d'un affichage
résumé. Les trois citations que j'accuse de dérive, je les ai relues **au commit `174de2cc`** avant de les classer
mineures plutôt que fausses. Aucun test, aucun run, aucun éditeur : la porte n'a pas été touchée.
