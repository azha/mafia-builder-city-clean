# Design — arbitrages B1/B2 du gate ⊥ sur le HUD v3.1 (2026-08-21)

Tranche les 2 BLOCKING du gate ⊥ sur `65ecc28`. Réf. `Tools/nav-hud-design-v1.md` §6 (`:402-456`). **Aucun code écrit ici.** Chemins nus = client
`mafia-builder-city-clean` ; `docs/`, `gdd/`, `services/` = back `mafia-clean-city`. Chaque ancre a été ouverte dans le corps.

## 1. B1 — la session appartient au SHELL
### 1.1 Le sujet n'est pas la course, c'est l'identité
Les 5 maillons du ⊥ sont confirmés (`AppShell.cs:215` garde par égalité de chaîne · `:217` coroutine lancée sans annuler la précédente · `:118`
chaque activation démonte/remonte · `auth.service.ts:612` `const jti = randomUUID();` + `:718` `iat: nowSec,` ⇒ jeton neuf par signin ·
`DashboardController.cs:51` vs `CityMapController.cs:29`). Mais « les 2 comptes démo sont-ils une réalité de production ? » se tranche par un
verbatim : `Tools/seed_operational_demo.mjs:10` — *« Distinct players make the full PlayMode suite ORDER-INDEPENDENT »*, cause `:8-9` (la boucle
opérationnelle pousse la ville à `BURNING`, dont la heat *laverait* le gradient d3/d7/d11 du seeder City Map). **Les deux comptes désordonnancent
la suite PlayMode : ce n'est pas un besoin produit.** Trois compteurs ferment la question : **8** sites de signin démo sous `Assets/Scripts`
(compté en `$()`) — **7** `operational_demo`, **1** `citymap_demo` (seul dissident, `CityMapController.cs:29`) · **0** écran de connexion (motifs
`loginscreen|LoginController|SignupScreen|AuthScreen` ; contrôle positif : 33 fichiers matchent `Controller`) · `POST /v1/auth/signup` **est
livré** (`auth.controller.ts:238-241`) ⇒ l'énoncé daté du socle (« pas de `signup` », 2026-08-07) est **périmé**, re-mesuré ici. ⇒ Aucun chemin
de production où deux comptes coexistent, faute de **tout** chemin d'identité de production. Le « second publieur » est une fixture de test qui a
fui dans l'architecture — `AppShell.cs:74-75` l'acte d'ailleurs en non-choix (*« §6.1 ne prescrit rien de plus »*).

### 1.2 Décision
**Le SHELL possède la session** : un jeton, un `session/open`, un joueur. `AdoptToken(string)` **quitte** `IShellSessionSink` — la direction
locataire→shell meurt, la course avec elle. Le shell acquiert son jeton **une fois** dans `Start()` via le même `AuthClient`
(`Assets/Scripts/CityMap/AuthClient.cs:26`), sous une identité portée par un `[SerializeField]`. **Forme = l'idiome d'injection déjà établi deux
fois ici**, pas une inversion coûteuse : le shell *donne* son jeton au locataire dans la fenêtre synchrone de `MountTenant<T>`
(`AppShell.cs:275-277`, où `SetMountParent` est déjà appelé) ; le locataire qui reçoit un jeton **saute son `SignIn()`** et pose
`IsAuthenticated` comme il le fait déjà (`DashboardController.cs:190`). **Rien reçu ⇒ il signe comme aujourd'hui** — mot pour mot la clause de
repli d'`IShellTenant.cs:17-19`.

### 1.3 Conséquences — chiffrées
- **9 contrôleurs + leur `AuthClient`** : **zéro** — leur `SignIn()` reste, il est seulement *sauté*.
- **patron « bare »** : **zéro** — **36** `AddComponent<tenant>` dans **18** fichiers ; aucun n'injecte.
- **rayon entier** : **4** fichiers montent un `AppShell` (`Navigation`, `Hud`, `AppShell`, `DistrictInteriorDiorama` PlayModeTests).
  `HudPlayModeTests.cs:93` : l'isolation par `ActivateTab(More)` **devient inutile** ⇒ à retirer (son commentaire `:82-92` dit qu'elle n'existe
  que pour cette course). `NavigationPlayModeTests.cs:25,59,122` (seede citymap, asserte `IsAuthenticated`, entre en district 3) reste vert en
  posant l'identité du shell sur le compte citymap **via le champ sérialisé**.
- **les 2 seeders** : **inchangés** — leur raison d'être porte sur les tests *bare*, qui ne bougent pas.

Le champ sérialisé est la **migration déjà payée** : un futur écran de login l'écrit, rien d'autre. L'option (b) (« premier publieur gagne » +
annulation) ferait dépendre l'identité de session de **l'ordre de navigation** — même défaut rétréci, à défaire au premier login. **Promesse** :
« le HUD montre UN joueur » devient vraie **par construction**, et s'étend — le locataire monté montre **le même** joueur.

### 1.4 Falsifiable **hud-F7** (NEUVE) — même joueur à travers N alternances
**N'asserte PAS sur le cash** : deux comptes peuvent avoir le même solde, l'assertion serait alors aveugle à la course qu'elle traque. Asserte
sur le **callsign** (`TopBarController.cs:44` `CurrentMe`, rendu `:286`), unique par compte côté back (code d'erreur dédié
`SIGNUP_CALLSIGN_TAKEN`). (1) lire **indépendamment** les callsigns des 2 comptes démo (2 signins directs + `GET /v1/me`) ; (2)
`Assert.AreNotEqual` sur ces callsigns — **garde de dimensionnement**, elle prouve que le monde peut discriminer ; (3) monter le shell, alterner
Home↔City **3 fois** avec quiescence à chaque passe ; (4) à chaque palier : `TopBar.Loaded` **et** `RenderedCashText != "—"` **et**
`CurrentMe.callsign` égal à celui du **premier** palier ; (5) comparer le cash du TopBar au wallet lu indépendamment **pour ce callsign-là**.
*Mondes dégénérés* — **mêmes callsigns ⇒ test aveugle** : tué par (2), lue **avant** toute alternance · **aucun locataire ne publie ⇒ vrai à
vide** : tué par (4), ses trois clauses à **chaque** palier · **une seule alternance ne race pas** : tué par (3), `:217` étant un
dernier-arrivé-gagne · **cash coïncidant par hasard** : tué par (5), apparié au **callsign**, jamais au cash seul.

## 2. B2 — l'écrasement n'est pas « voulu » : c'est **la mauvaise paire**
### 2.1 Le collapse 4→3 EST canon
`global_conventions_core.md:205` — `SeverityEnum` — enum `{ MILD, MODERATE, SEVERE }` : **trois** membres, point. `:50-52` — `MILD` cyan
`#43e0c0`, `MODERATE` ambre `#ff9e3d`, `SEVERE` rouge `#ff5a4d`. `Assets/Scripts/Theme/DesignTokens.cs:66` titre *« Accents sémantiques (sévérité
mild/moderate/severe + CTA) »* et `:69-71` portent **exactement** ces 3 hex. `nav-hud-design-v1.md:449-450` : *« 3 zones peintes au cadran et 4
arrêts d'aiguille »*. ⇒ **4 buckets → 3 couleurs est la règle** ; la distinction du 4ᵉ passe par la **position** (angle), pas la teinte. Une 4ᵉ
couleur serait un **52ᵉ token** ⇒ casse `ExpectedTokenCount = 51` (`Assets/Tests/PlayMode/CanonPaletteBridgePlayModeTests.cs:46`, sourcé `gdd/14
@6e91edd1`) ⇒ **STOP**.

### 2.2 Mais le canon dit quelle paire fusionne — et ce n'est pas celle du code
`screen_2_city_map.md:148` : *« WARM = halo ambre léger ; HOT = halo ambre **intense** ; BURNING = halo rouge »*. `:405` (entrée **de
glossaire**, miroir verbatim `gdd/15_glossary.md:2726`) : *« WARM = ambre `#ff9e3d` léger ; HOT = ambre intense ; BURNING = rouge `#ff5a4d` »*.
`screen_2a_building_card.md:308` : *« Badge HeatBucket **HOT ambre `#ff9e3d`** »*. `screen_2a_building_card.md:182` : *« Heat `BURNING` → SEVERE
»* — **la seule** affectation bucket→severity explicite du corpus. ⇒ Canon : **{WARM, HOT} → MODERATE ; BURNING → SEVERE**.
`DashboardController.cs:492-493` fusionne **{HOT, BURNING} → AccentSevere** : **la mauvaise paire**. HOT doit être ambre, il est rouge.

### 2.3 Et le chunk vient d'en écrire une **troisième**
`TopBarController.cs:317-322`, `zoneColors` et ses commentaires : `accentSuccess // doux (COLD/WARM)` · `accentWarning // modéré (HOT)` ·
`accentDanger // sévère (BURNING)`.

| bucket | `DashboardController.cs:490-493` | `TopBarController.cs:319-321` | canon §2.2 |
|---|---|---|---|
| COLD | success | success | pas de halo → mild |
| WARM | **warning** | **success** | **moderate (ambre)** |
| HOT | **danger** | **warning** | **moderate (ambre)** |
| BURNING | danger | danger | severe |

Le HUD est juste sur HOT et faux sur WARM ; le Dashboard est faux sur les deux. C'est exactement la dérive que hud-F6 devait attraper — **elle
est LIVE, dans le texte NEUF du chunk**, pendant que hud-F6 mesure une propriété qui ne peut plus varier.

### 2.4 Prescription
**Résolveur de sévérité unique** dans `Assets/Scripts/ShellContracts/HeatBucketResolver.cs`, contre `ResolveRank` (`:32-42`) : `Severity(Rank) →
{ Mild, Moderate, Severe }`, mappé COLD→Mild, WARM→Moderate, HOT→Moderate, BURNING→Severe. `DashboardController.HeatAccent` (`:486-497`) **et**
`zoneColors` (`TopBarController.cs:317-322`) le consomment ; aucun `switch` de bucket ne survit ailleurs. **Zéro token neuf.** *Deviation
consignée* : le canon écrit `COLD = aucun halo` (`:405`) — un halo absent n'est pas une couleur de bande ; COLD prend `Mild`, seul membre non
alarmant des 3, que `DesignTokens.cs:69` nomme déjà *« mild/clean »*. *Dette canon (dépôt back)* : `screen_2_city_map.md:262` place HOT avec
BURNING en rouge, **contredisant `:148` et `:405` du même fichier** et `screen_2a:308` — tranché 3-contre-1 en faveur du glossaire pour ne pas
bloquer le lot ; la contradiction part en dette avec ces 4 ancres.

### 2.5 Falsifiable **hud-F6 refondue**
hud-F6 (`HudPlayModeTests.cs:232-251`) compare aujourd'hui `ResolveRank` à `Glyph` : **deux `switch` du même fichier**
(`HeatBucketResolver.cs:34-42` et `:60-68`) depuis que `DashboardController.cs:485` délègue. La refonte porte sur la **surface de sortie de
chaque écran** : pour les 4 buckets, la `Color` produite par `DashboardController.HeatAccent` (réflexion, comme `:234-236`) **et** la `Color` de
la bande TopBar correspondante doivent être **égales entre elles et au hex canon** de la sévérité du bucket ; plus la **monotonie NON STRICTE**
`Severity(COLD) ≤ WARM ≤ HOT ≤ BURNING`. *Mondes dégénérés* — **les 4 buckets rendent la même couleur** ⇒ monotonie non stricte trivialement
vraie : tué en exigeant **exactement 3** couleurs distinctes **et** `Severity(BURNING) > Severity(COLD)` en strict · **3 couleurs distinctes mais
pas celles du canon** : tué par l'égalité aux **3 hex** de `global_conventions_core.md:50-52`, jamais « distinctes » seulement · **une seule
surface testée** ⇒ la divergence §2.3 survit : tué en lisant les **deux** et en les comparant l'une à l'autre **et** au canon.

## 3. Gestes courts — cadrés, pas designés
**I1 — la capture ne prouve rien.** `COLD` est le défaut par **trois** chemins, pas deux : `heat-propagation.service.ts:237` (état neuf), `:266`
(joueur **sans bâtiment** — la réalité organique d'un compte frais), `:437` `?? 'COLD'` (joueur inconnu). Une capture `COLD` est indistinguable
de « rien n'a tourné ». **Le scénario dimensionné est déjà semé** : `seed_operational_demo.mjs:8` pousse la ville à `BURNING`, valeur
qu'**aucun** chemin de défaut ne produit. ⇒ La capture imprime la **transition** — bucket sondé, rang, angle avant/après `SetCitywideHeatBucket`
(`TopBarController.cs:196-203`) — sur le compte opérationnel, et montre `BURNING`. Un `COLD` y est un **échec**, plus une preuve.

**I2 — `FindShellSink` dupliqué.** Vérifié **octet pour octet** (md5 identique) : `DashboardController.cs:197-201` et
`CityMapController.cs:507-511`. Sa place est dans `ShellContracts`, contre `IShellSessionSink`, dont l'en-tête `:11-17` **documente déjà** cet
idiome et sa raison (contrainte `T : UnityEngine.Object`) ; `ShellContracts.asmdef` a `"noEngineReferences": false`. Garde : **2 → 1**
définition. ⚠️ Sous B1 ce helper perd son appelant `AdoptToken` et ne garde que `PublishCitywideHeat` — **ne pas le laisser sans consommateur**,
un garde-fou sans appelant se fait supprimer de bonne foi.

**M1 — hud-F2 laisse passer une aiguille inversée.** `HudPlayModeTests.cs:135` asserte `4 == angles.Distinct().Count()` : 4 constantes distinctes
**dans le mauvais ordre** passent. La propriété est canon, en prose, dans l'en-tête du résolveur — `HeatBucketResolver.cs:71-72` : *« Un balayage
-60°..+60° (COLD à gauche, BURNING à droite) »* (ancre `:71-72`, **pas** `:72-73` : la clause porteuse commence à `:71`). ⇒ Asserter la suite
**strictement croissante**, pas la distinction. *Monde dégénéré* : une suite croissante **par paliers constants** satisfait `≤`, d'où le
**strict**.

**M2 — le geste prescrit ne ferme pas le défaut en C#.** `NeedleAngleDegrees` (`HeatBucketResolver.cs:75-85`) a bien un `default: return 0f` sur
un enum fermé possédé par le fichier (`Rank`, `:23-30`). Mais **la « forme exhaustive sans `default` » n'existe pas ici** : un `switch`
*statement* sur enum sans `default`, dans une méthode qui retourne, est un **CS0161** ; une `switch` *expression* ne rend qu'un **avertissement**
CS8509, jamais une erreur — et **0** `switch` expression dans tout `Assets/Scripts`, donc aucun précédent maison. ⇒ Forme correcte : `case
Rank.Unknown: return 0f;` **explicite** (`:74` documente déjà ce contrat) puis `default: throw` — un 5ᵉ membre devient **bruyant** au lieu de
collisionner en silence avec le 0° d'`Unknown`. Et **le détecteur est un test, pas le compilateur** : scinder en `NeedleAngleDegrees(Rank)` +
surcharge `(string)`, énumérer `Enum.GetValues(typeof(Rank))`, asserter **autant d'angles distincts que de membres**. *Monde dégénéré* : tester 4
chaînes écrites à la main laisse `Unknown` et tout membre futur hors champ — d'où l'énumération de l'enum.

## 4. DÉDUIT vs COMPTÉ
**COMPTÉ** (corps ouvert, ancre vérifiée par moi) : les 5 maillons B1 · `jti = randomUUID()` `:612` + `iat` `:718` · `@Post('signup')` `:238` ·
**8** signins démo (7/1) · **0** écran de login (contrôle positif 33) · **36** montages bare / **18** fichiers · **4** fichiers montant un
`AppShell` · `seed_operational_demo.mjs:6-11` verbatim · `SeverityEnum` à **3** membres `:205` · les 3 hex `:50-52` · les 4 sites canon HOT=ambre
+ la ligne contradictoire `:262` · `DesignTokens` = **51** champs `Color` publics · `ExpectedTokenCount = 51` · md5 identique des 2
`FindShellSink` · les 3 chemins vers `COLD` · **0** `switch` expression dans `Assets/Scripts`.
**DÉDUIT** — test : *si ça se résolvait défavorablement, une décision changerait-elle ?*
- **E1** — l'interior du district **3** répond-il pour un joueur sans bâtiment là-bas (`NavigationPlayModeTests.cs:122`) ? **Ne décide pas —
  neutralisé par conception** : l'identité du shell étant un champ sérialisé, cette fixture pose le compte citymap et sa prémisse ne bouge pas.
  La mesure exigerait une stack ; la conception la rend indifférente.
- **E2** — rendre en `Mild` la bande COLD que le canon décrit « aucun halo » ? Ne décide pas : Deviation nommée §2.4, réversible dans le seul
  résolveur.
- **E3** — l'aiguille tombe-t-elle géométriquement **dans** la bande de sa sévérité ? Ne décide pas : juge fonctionnel pour ce chunk
  (`nav-hud-design-v1.md:452`, pixel-perfect différé #24). Différé **avec** détecteurs : hud-F6 épingle la couleur, hud-F2 l'ordre.
  **Aucun DÉDUIT décisif ne reste sans détecteur.**

## 5. Ce qui remonte à l'user
1. **La contradiction canon** `screen_2_city_map.md:262` contre `:148`/`:405`/`screen_2a:308` — tranchée 3-contre-1 ici pour ne pas bloquer, mais
   le canon reste incohérent, dans un autre dépôt.
2. **Aucune 4ᵉ couleur de sévérité n'est proposée** : elle exigerait un 52ᵉ token et casserait `ExpectedTokenCount = 51`. Si 4 teintes distinctes
   sont voulues, **c'est un STOP** — changement de palette canon (`gdd/14`), hors périmètre de ce lot.
