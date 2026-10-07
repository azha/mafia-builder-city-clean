# Catalogue des mouvements diégétiques — écrans montés du client Unity (CLIENT-3, 07/10/2026) — v1

Statut : **PROPOSITION**. Rien n'est tranché ici. f2 puis l'user valident ; l'atelier dessine ce qui
doit l'être (§III) ; `coder` n'écrit rien avant. Ce fichier est la table `Catalogue` du design
(`design-couche-mouvement.md` §1 : `Entree { Id, Ecran, Source, Cause, G, M, Pistes, DegradeReduit }`)
rendue en prose : **une ligne de tableau = une `Entree`**, et rien de ce fichier ne vit hors de ce modèle.

Entrées lues : `design-couche-mouvement.md` (le mécanisme, les plafonds, §4 mouvement réduit, gardes
G1-G9) · `inventaire-animations.md` (les 44 paires de maquette : **référencées, jamais redéfinies**) ·
`Tools/juge-visuel/INDEX.md` (les 35 écrans, 26 contrôleurs montés) · `~/project/mafia-clean-city/front.md`
(la fiction, écran par écran) · le canon `docs/tech/08_ui_screens/` (25 fichiers — il spécifie déjà du
mouvement : §0.6) · les 24 contrôleurs eux-mêmes (ce qui existe RÉELLEMENT à l'écran).

Rulings qui cadrent : 27/08 soir, user — « animé le truc, tout en restant dans un univers dark/mafieux »,
animations **DIÉGÉTIQUES** seulement ; 07/10, user — « il y a 0 animation » ; 07/10, brief — ère
**fin 80s – début 90s**, ton sombre / napolitain / mafieux (⚠️ voir Q7 : front.md:343 porte encore
la décision O ⛔ ouverte).

---

## 0. Ce qu'il faut accepter avant de lire les tableaux

Les cinq décisions ci-dessous commandent tout le reste. Elles sont en tête parce qu'un « non » sur
l'une d'elles réécrit le catalogue, pas une ligne du catalogue.

### 0.1 La thèse : un écran vit parce qu'il RÉPOND, pas parce qu'il remue

**28 des 42 entrées proposées sont des `Transition`** — un geste du joueur, ou un état de jeu qui
change, et la matière qui répond : l'encre qui prend sur le papier, le tampon qu'on abat, la carte
qu'on distribue, le jeton qu'on pousse sur le zinc, le cartel qu'on glisse dans la plaque.
**Seules 6 sont des `Ambiance`** (la matière qui vit toute seule), et toutes les six ont une source
lumineuse ou un corps en mouvement réellement présent à l'écran.

Ce n'est pas de la prudence, c'est une lecture du territoire. J'ai relevé les 24 contrôleurs : hors
le décor de comptoir de ⑨/⑩/⑯ et les silhouettes de ㉙, **il n'existe à l'écran aucune lampe, aucun
voyant, aucune fumée, aucun liquide, aucune aiguille, aucune ficelle libre** — 0 `fillAmount`,
0 `Image.Type.Filled`, 0 `Animator`, 0 `ParticleSystem` dans tout `Assets/Scripts`. Les écrans sont
du texte et des traits de 1 à 2 px CSS. Une `Ambiance` posée là n'aurait pas de cause : ce serait du
décoratif, c'est-à-dire exactement ce que le ruling du 27/08 interdit.

⇒ **Le joueur doit sentir que le jeu lui répond.** C'est ce qui se voit en 3 secondes de jeu, et c'est
ce qui coûte le moins : une `Transition` dure ≤ 250 ms, ne tourne pas en régime, et ne consomme aucune
piste permanente.

### 0.2 Le canon spécifie DÉJÀ du mouvement, et il gagne

Avant de proposer, j'ai balayé les 25 fichiers de `~/project/mafia-lot-i18n/docs/tech/08_ui_screens/`.
**21 des 22 écrans canon y portent au moins une règle de mouvement.** Les entrées ci-dessous les
reprennent par référence au lieu de les réinventer.

> **Convention de citation** : dans tout ce fichier, `screen_14:71` abrège
> `~/project/mafia-lot-i18n/docs/tech/08_ui_screens/screen_14_settings.md:71` ; `global_conventions_core.md:124`
> le fichier de même nom du même dossier ; et un chemin `Assets/…` ou `Shell/…` est relatif à
> `~/project/mafia-unity-anim/`. Les 9 ancres les plus porteuses de ce catalogue
> (`AppShell.cs:1858-1863`, `DailyReviewScreenController.cs:658` et `:667`,
> `ConflitScreenController.cs:1345`, `ExceptionQueueController.cs:577`, `UiTimingTunables.cs:18-19`,
> `global_conventions_core.md:136`, `screen_14:71/:146/:208/:251/:298`) ont été **relues ligne à ligne
> avant citation**, pas reprises d'un relevé.

| règle canon | ancre | ce qu'elle impose à ce catalogue |
|---|---|---|
| durée max **bloquante** 250 ms | `global_conventions_core.md:124` | plafond de X8/G8 — mais il dit **bloquante** (⇒ Q2) |
| toutes les transitions interruptibles | `global_conventions_core.md:125` | aucune entrée ne retarde un `onClick` |
| **pas d'animation sur le chemin critique cold-open** | `global_conventions_core.md:126` | le PREMIER montage de la session est exclu de `shell.entree` |
| appui long destructif = **1 000 ms + arc ou barre de progression**, haptique, non bloquant | `global_conventions_core.md:136` ; arc : `screen_2a:279`, `screen_4:402`, `screen_10:314`, `screen_11:260`, `screen_13:285`, `screen_15:206` ; `aria-valuenow` 0→100 : `screen_2a:300` | `retour.appui-long` est un **REUSE**, pas une invention |
| réduit : l'arc devient **indicateur statique + compteur textuel** | `screen_2a:314`, `screen_13:308` | un remplissage fonctionnel **ne se gèle pas** (⇒ Q2) |
| swap animé de la carte à fort levier au Skip | `screen_1:386` | `accueil.carte-suivante` |
| `FlagItemCard` **flip-out** à la validation | `screen_11:255` | `revue.jeton-rendu` |
| `ProblemCardWidget` flip-out + décrément du budget | `screen_13:281`, `:372` | `semaine.jeton-depense` |
| fade-out de la ligne résolue | `screen_5:340` | `file.part` |
| fade-out d'écran à la résolution | `screen_5a:254` | couvert par `shell.entree` |
| transitions de l'arbre ≤ 250 ms | `screen_3:451` | `famille.rang-ouvre` |
| transition push/pop de navigation, interruptible | `screen_12:223` | `shell.entree` |
| ⑲ **porte le bouton « Mouvement réduit »**, rôle `switch`, bascule immédiate, `PATCH /v1/me/settings` | `screen_14:71`, `:146`, `:208`, `:251`, `:298` | **tranche la question 1 du design §4** (⇒ Q4) |
| interdits : spinner bloquant · `HealthBar`/`StatBar`/`ProgressBar` (R4.2) · countdown continu (P1/P4) · barre de progression continue · readout « 0 » | `global_conventions_core.md:112` · `screen_1:319` · `screen_13:120`, `:123` · `screen_3b:423` · `screen_12:193` | aucune entrée n'anime une jauge de stat ni un compte à rebours |

Le canon **ne spécifie aucune courbe d'aisance, nulle part** (0 occurrence de `ease`, `easing`,
`tween`, `lerp` dans les 12 638 lignes). Les aisances de ce catalogue sont donc des propositions,
mesurables contre l'oracle CSS de l'atelier (design §5, X7) quand une maquette existe.

### 0.3 L'unité, et le plancher de perceptibilité (un joueur, un téléphone, 1080×1920)

Vérifié dans le code, pas dans un document :

| repère | ancre | 1 unité vaut, à 1080 de large |
|---|---|---|
| canvas du shell, `referenceResolution = (1280, 720)`, `matchWidthOrHeight = 0` | `Assets/Scripts/Shell/AppShell.cs:1978`, `:1991`, formule `:1884-1886` | **0,844 px physique** |
| écrans de série 4/6 : `K = 1280f/300f`, `Px(css) = css × K` | 11 fichiers, p. ex. `Shell/DecisionDetailScreenController.cs:44`, `Economy/Shop/ShopScreenController.cs:63`, `ShellContracts/DecorAuComptoir.cs:40` | 1 px CSS = 4,267 u = **3,60 px** |
| ⑥ La Famille : `FX(v) = v × (largeur/560)` | `Operational/Lieutenant/LieutenantScreenController.cs:2243`, `:2185` | FX(1) ≈ 2,23 u = **1,88 px** |
| barre + bandeau : `TopBarEchelle.localScale`, repère 392 | `AppShell.cs:2060-2069`, `:2096` ; `ShellContracts/EchelleMaquette.cs:46` | 1 u bandeau = **2,76 px** |
| ④ Accueil et ㉔ Autonomie : unités de canvas **brutes** (pas de `Px()`) | `Operational/Dashboard/DashboardController.cs:675` ; `Operational/Autonomy/AutonomyInboxController.cs:418` | 1 u = **0,844 px** |

⚠️ L'ancre `AppShell.cs:588` citée par front.md:697 est **périmée** (le fichier a bougé) ; les deux
ancres ci-dessus sont celles d'aujourd'hui.

**Plancher adopté, et toute entrée sous ce plancher est écartée** (le brief : « un joueur doit
PERCEVOIR chaque entrée ») :

- déplacement (translation, ou course du point le plus éloigné sous rotation) : **≥ 3,0 px physiques**
  — soit ≥ 3,6 u de canvas, ≥ 0,84 px CSS de série 6, ≥ 1,6 FX de ⑥ ;
- `Alpha` : **Δ ≥ 0,15** sur un hôte dont la plus petite dimension ≥ 2,5 px ;
- `Teinte` : **Δ ≥ 0,12** sur un hôte d'au moins 20 × 20 px, ou sur un trait d'au moins 3 px d'épais.

Deux candidates ont été écartées par ce plancher, nommément : le balancement des deux brins d'une
ficelle rompue de ㉘ (±0,8° sur 100 u = 1,2 px) et la respiration du liseré `OrLisere` de ㉓
(4,27 u à α 0x40 : Δteinte invisible sous 25 % d'opacité).

### 0.4 La phase négative n'est pas héritée de la maquette : elle est à CHOISIR

Mesuré sur `mesure-ecrans-brennar-6.json` (554 animations réelles) : **8 paires sur 34 seulement
portent un `animation-delay` négatif** (les 6 `*6-scan` à −2,600 s et `mk-buee` à −2,1/−1,5/−0,9 s,
`mk-scan` à −2,600 s) — soit **45 instances sur 554**. Les 26 autres paires démarrent à un délai
≥ 0 : `mk-veille` 0/+0,9 s, `mk-lampe` 0, `sf` +0,02 à +4,97 s, `po` 0, `pe` 0, `sc` 0…

⇒ Le design impose `Reglage.PhaseS` **négatif obligatoire** pour tout `Ambiance`/`Alerte` (§1, garde
G3 « t0 riche »). **La maquette ne le fournit pas** : chaque entrée `Ambiance`/`Alerte` de ce catalogue
déclare donc sa propre phase négative, et elle est contrôlable à la main. Exemple ouvert, à vérifier
par le reviewer sur n'importe quelle autre ligne : pour la forme « lampe » (Alpha 0,82 → 1,00 → 0,82,
période 4,6 s, `ease-in-out`, `Repos = 1,00`, `PoseDeReposS = 2,30 s`), une phase de **−0,90 s** place
t0 à 0,90/2,30 = 39 % de la montée, soit Alpha ≈ 0,87 ≠ 1,00 — G3 passe, et la PNG à t=0 la voit.

### 0.5 La forme « lampe » est un REUSE mesuré, pas un nombre inventé

Cinq entrées partagent une seule cause physique — **une lampe à abat-jour sur un vieux circuit, dont
le filament ne tient pas une intensité fixe** — et donc une seule forme. Cette forme n'est pas
choisie par moi : c'est celle de la lampe de l'atelier, mesurée.

> `@keyframes mk-lampe{0%,100%{opacity:.82}50%{opacity:1}}`, `4.6s ease-in-out infinite`
> — `~/project/atelier3d-mafia/generateur-marche.py:112` et `:197` ; durée confirmée à **4 600 ms**
> sur 3 instances par `mesure-ecrans-brennar-6.json` (`mk-lampe`) ; paire d'inventaire
> `inventaire-animations.md:36` (« la lampe du tableau du Verge d'Or »).

Les entrées qui la reprennent portent `Source = PROPOSÉ · forme REUSE « ecrans-brennar-6: mk-lampe »`.
La paire d'inventaire elle-même **reste attachée à ㉑** (écran non monté) : je ne la déplace pas, je
réutilise sa forme sur des hôtes qui existent. Et puisque c'est **la même lampe dans la même pièce**,
toutes les cibles d'un même écran partagent **la même phase** — une seule source lumineuse ne bat pas
en désordre. La seule entrée à phases distinctes est `conflit.salle` (§II.㉙), où chaque phase est une
personne différente : la cause justifie la différence.

### 0.6 Ce que ce catalogue NE fait pas

- Il ne redéfinit **aucune** des 44 paires de l'inventaire : elles sont référencées en §I.3 par leur
  id (`ecrans-brennar-6: <keyframe>` / `hud-brennar-canon: <nom>`).
- Il ne tranche rien : 12 questions en §IV, chacune avec ma recommandation.
- Il ne maquille aucun trou : 9 entrées dépendent d'un hôte **à dessiner** (§III) ou d'un puits qui
  **n'existe pas** dans l'enum `Propriete` (Q3). Elles sont marquées, comptées, et nommées.

---

## I. Conventions de lecture des tableaux

### I.1 Les colonnes, et le champ d'`Entree` qu'elles portent

| colonne | champ du design §1 | règle |
|---|---|---|
| `id` | `Entree.Id`, forme `ecran.role` | unique dans tout le catalogue (G1) |
| `déclencheur / état` | — (contrat du contrôleur) | un identifiant RÉEL du code, avec son `file:line`, ou « en continu » |
| `mouvement` | `Entree.M` : `Mouvement { PeriodeS, Canaux[Propriete, ImageCle[]], Iterations, Direction, PoseDeReposS }` + `Reglage.PhaseS` | propriétés, amplitudes concrètes, durée ou période en secondes, aisance CSS, itérations, phase |
| `cause dans la fiction` | `Entree.Cause` (≥ 20 car., non « TODO », G1) | une phrase vraie, physique, vérifiable à l'écran |
| `genre` | `Entree.G` | `Alerte` \| `Ambiance` \| `Retour` \| `Transition` |
| `pistes` | `Entree.Pistes` | entier ≥ 1 ; Σ par écran ≤ 16 (G4) |
| `réduit` | `Entree.DegradeReduit` | appliqué du §4 du design, jamais inventé |
| `source` | `Entree.Source` | `PROPOSÉ` \| paire d'inventaire \| `REUSE <ancre>` |
| `question` | — | ce que l'atelier doit dessiner, ou ce que f2/l'user doivent trancher, ou « — » |

Un écran porte en plus les entrées **transverses** (§II.0) dont il est la cible : elles sont comptées
sur lui dans le récapitulatif (§V), et une seule fois dans le total par entrée. L'écart entre les deux
sommes est la somme de contrôle.

### I.2 Les contraintes dures, qui sont des gardes du design

Toutes les lignes de ce catalogue les respectent ; chaque violation possible est nommée là où elle
survient, jamais passée sous silence.

1. **Jamais de texte animé autre qu'`Alpha`** (G6 : une cible portant un `TMP_Text` refuse tout autre
   canal). Les six entrées dont l'hôte est un `TMP_Text` (`police.baton`, `autonomie.appel`,
   `premiere-fois.lecon`, `carnet.encre`, `appro.commande-partie`, et le volet « ACQUIS » de
   `vitrine.acquis`) sont **en `Alpha` seul**.
2. **Aucun montant exact animé ni affiché** (R2.2 : « le back projette des **bandes**, jamais de
   scalaire » — `~/project/mafia-lot-i18n/.claude/skills/juge-donnees/mandat-juge-donnees.md:63`).
   Aucune entrée n'anime un nombre. Les seuls chiffres touchés sont des **comptes d'items
   actionnables** (le « 1 » du jeton de ⑤, les 8 créneaux de ㉞), que le canon autorise explicitement
   (⑱ : « badge de count d'items ACTIONNABLES … jamais un scalaire de simulation », front.md:1568) —
   et même eux ne sont jamais animés : c'est leur support qui bouge.
3. **`Retour` et `Transition` ≤ 250 ms** (X8, G8). Trois entrées dépassent, toutes **non bloquantes**,
   toutes nommées : `retour.appui-long` (1 000 ms, = `UiTimingTunables.DestructiveLongpressMs`),
   `carnet.en-main` (500 ms, = `Operational/Carnet/AppuiLong.cs:10`), `semaine.aiguille` (700 ms, la
   valeur de la maquette, `inventaire-animations.md:62`). ⇒ **Q2**.
4. **Un `Alerte` en `Alpha`/`Teinte` ne varie pas plus de 3 fois par seconde** (période ≥ 0,4 s, G5).
   La plus rapide du catalogue est à **1,1 s** (`accueil.descente`, la période de `Pouls`).
5. **Tout `Ambiance`/`Alerte` démarre à une phase négative** (« t0 riche », G3) : chaque ligne la
   déclare. Voir le calcul ouvert en §0.4.
6. **Σ `Pistes` ≤ 16 par écran** (G4) et **48 pistes vivantes dans tout le client** (`MaxPistes`,
   design §3). Le pire cas simultané de ce catalogue : **㉙ à 9 pistes** + les 3 `Alerte` du chrome en
   descente (§8 du design) + 3 transverses = **15 sur 48**.
7. **Sous un `RectMask2D`, le canal de transformation est plafonné à 6 pistes** et aucun Canvas
   imbriqué n'est posé (design §3, **hypothèse à mesurer : spike E0**). Les écrans concernés de ce
   lot : ⑥ (`LieutenantScreenController.cs:1331`), ㉓ (`ShopScreenController.cs:406`),
   ㉜ (`DelegationScreenController.cs:979`), ㉝ (`DemolitionScreenController.cs:1185`),
   ㉞ (`CarnetScreenController.cs:810`), ㉙ (`ConflitScreenController.cs:1219`),
   ④ (`DashboardController.cs:639`, masque de décor, pas de liste), ⑱ (`AppShell.cs:1348`).
   **Entrées de ce catalogue qui posent un canal de transformation ou de couleur sous un masque : 5**
   (`famille.lampe-du-don` Alpha, `service.jeton` Teinte, `service.cartel` Teinte,
   `demolition.fiche-sortie` TranslationX, `demolition.offre-fermee` Teinte) — toutes ≤ 6 par écran,
   toutes suspendues au verdict d'E0.
8. **Le premier montage de la session n'est pas animé** (`global_conventions_core.md:126`, F4).

### I.3 Les 44 paires de l'inventaire : référencées, pas redéfinies

Elles sont **déjà au catalogue** (garde G2 : « une paire de `inventaire-animations.md` sans entrée »
rougit). Je ne les réécris pas ; je constate leur état d'hôte, parce que c'est ce qui décide si elles
sont câblables ou différées.

| bloc | paires | hôte côté client | verdict |
|---|---:|---|---|
| `hud-brennar-canon: pouls`, `tremble` | 2 | existent et **tournent** (`Shell/TopBarController.cs:763`, `:770`) | migrent au catalogue, design §8 — rien à faire ici |
| `hud-brennar-canon: gyroflip` | 1 | existe, **partiel** (`CityMap/Gyrophare.cs`, fond D seul) | design §8 |
| `hud-brennar-canon:` les 7 absentes (`monte`, fondu jour↔nuit, 3 virages braise, fondu du gyro, balayage de l'aiguille) | 7 | ① — hôtes présents, animations absentes | **E3 du design**, hors de ce lot. ⚠️ `monte` est le flotteur « + $320 » : **montant exact**, il heurte R2.2 (design §11.2) |
| `ecrans-brennar-6: hl` (③ le halo du pin) | 1 | **hôte absent** (`CityMap/DistrictCellView.cs:95` : pas de pin) | différé |
| `ecrans-brennar-6:` serre (`sf` ×202, `drip`, `derive`, `led`, `spl`, `respire`, `tg`, `clign`) | 8 | **0 scène de serre** dans `BuildingCardController` | différé → **E5** (de l'ART, pas du mouvement) |
| `ecrans-brennar-6:` labo (`bl` ×52, `vp`, `cd`, `fl`, `rl`, `ch`, `ec`, `rd`, `gt`) | 9 | pupitre **figé** (`BuildingCardController.AddPupitreLaboratoire:2242`) | différé → E5 |
| `ecrans-brennar-6:` Ash (`po` ×78, `sc`, `pe`, `am`, `ci`, `cl`) | 6 | `AddVitrineAsh:2318` **figé** | différé → E5 |
| `ecrans-brennar-6:` marché (`mk-veille`, `mk-buee`, `mk-scan`, `mk-lampe`) | 4 | **écran ㉑ NON MONTÉ** (aucun contrôleur) | différé. **`mk-eclat` n'a toujours aucun hôte** ⇒ demande **A1** |
| `ecrans-brennar-6: vnt6-scan`, `hrz6-scan`, `rep6-scan`, `jrn6-scan`, `dos6-scan`, `bln6-scan` | 6 | écrans ㉟ ㊱ ㊲ ㊳ ㊴ ㊵ **montés** ; la barre de balayage et sa piste masquée **non vérifiées** dans ce lot | mesuré : **7,500 s `linear infinite`, délai −2,600 s**, course `translateY(−6px → 184px)`, opacité 0 → .5 → 0, barre cyan de 2 px (`generateur-marche.py:117-118`, `:151-153`). ⇒ demande **A9**, cause à confirmer **Q10** |

**Contrôle : 2 + 1 + 7 + 1 + 8 + 9 + 6 + 4 + 6 = 44.** Présentes 2 · partielle 1 · absentes 41
(`inventaire-animations.md:87-89`, inchangé).

`mk-eclat` **n'est pas** l'une des 44 : l'inventaire le classe en §C (défini, 0 instance mesurée,
`inventaire-animations.md:69`) parce qu'aucun cadre ne montre son hôte. Il n'entre au catalogue que
par la demande **A1**.

⇒ Le `Catalogue` final comptera **42 entrées de ce fichier + 44 paires d'inventaire = 86 lignes**,
dont **38 non câblables aujourd'hui** : 28 des 44 sans aucun hôte (serre 8 · labo 9 · Ash 6 · ③ 1 ·
marché 4), 6 à hôte **non vérifié** (les `*6-scan`), et **4 des miennes** — 3 suspendues à un hôte à
dessiner (`semaine.aiguille` → A2, `vitrine.reflet` → A3, `distribution.photo` → A4) et 1 à un trou
du design (`distribution.ficelle-tendue` → Q3). C'est ce chiffre-là, pas le « 44 », qui dit où en est
la carte avant E1. **38 attendent quelque chose ; 48 sont câblables.**

---

# II. Le catalogue, écran par écran

## II.0 Les 8 entrées TRANSVERSES

Elles ne vivent pas sur un écran : elles vivent sur un **geste** (l'appui), sur le **shell** (le
montage, le bandeau), ou sur une **matière partagée** (le comptoir de ⑨/⑩/⑯, la bascule de ⑲/㉕).

⚠️ **`Entree.Ecran` est un `string` singulier** dans le design (§1 : « `string Ecran (sym ①…㊵)` »).
Ces 8 lignes ne tiennent donc pas dans le modèle tel qu'il est écrit. Convention adoptée ici, à
ratifier : `Ecran = "*"` pour une entrée qui suit un geste, et `Ecran = "⑨ ⑩ ⑯"` pour une entrée qui
suit une matière. ⇒ **Q1**.

### II.0.a Le retour d'appui — la demande de f2 (15 sites `Transition.None` sur 67 `Button`)

Compté à nouveau, et les deux nombres de l'inventaire se vérifient : `Selectable.Transition.None` est
posé sur **15 sites**, et `AddComponent<Button>()` apparaît **67 fois** dans `Assets/Scripts`
(34 fichiers ; détail du compte disponible, somme refaite à la main).

Ce lieu, c'est le doigt sur la matière : rien ne se passe à l'écran avant qu'on y touche.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `retour.appui` | `PointerDown` sur n'importe quel `Button` créé par le client (67 sites) ; relâchement ou sortie du doigt | **appui** : `Echelle` 1,00 → 0,97 et `Teinte` 1,00 → 0,85, **90 ms**, `ease-out`, une fois · **relâchement** : retour aux valeurs de repos, **140 ms**, `ease-out`, une fois. Total ≤ 230 ms. Le `onClick` reste émis au relâchement, inchangé | Un bouton est une pièce de bakélite montée sur ressort : il s'enfonce sous le pouce et remonte quand on le lâche — sans rebond, sans lueur. | `Retour` | 1 | `Teinte` seule, **sans échelle** (design §4) | `REUSE design §9` (`Retour.Poser(Button)`) | **Q6** : 10 des 15 sites sont des **cartes/rangées/panneaux entiers** (la racine de `HighestLeverageCard`, tout le bandeau, une rangée de ⑥, une plaque de ㉜, un bloc de ㉝, une cellule de bâtiment de ①, le texte vide de ⑯…). Un −3 % sur une feuille de 560 u déplace son bord de 8,4 u = 7 px : l'écran a l'air de sauter |
| `retour.appui-long` | `LongPressButton.IsPressing` (`ShellContracts/LongPressButton.cs:20`) ; 4 instances aujourd'hui : `Shell/DecisionDetailScreenController.cs:428`, `Shell/HighestLeverageCardController.cs:371`, `Shell/DailyReviewScreenController.cs:583` et `:1276` | `Remplissage` 0,00 → 1,00 sur **1 000 ms** (= `UiTimingTunables.DestructiveLongpressMs`, `ShellContracts/UiTimingTunables.cs:19`), `linear`, une fois · relâchement avant le seuil : retour à 0,00 en **120 ms**, `ease-out`. Hôte : un `ProceduralUI.Ring` (`ShellContracts/ProceduralUI.cs:241`) posé sur l'objet pressé, `Image.type = Filled`, `fillMethod = Radial360`. **Non bloquant** : le doigt n'est jamais retardé | On n'abat pas un tampon d'un coup de doigt : on appuie, l'encre prend, et c'est au bout de la seconde que la mention est portée. | `Retour` | 1 | **PAS un gel** : indicateur statique + compteur textuel de secondes (canon `screen_2a:314`, `screen_13:308`), et l'alternative saisie reste offerte (F2) | `REUSE canon global_conventions_core.md:136` + `screen_2a:279`, `:300` (`role="progressbar"`, `aria-valuenow` 0→100) + `UiTimingTunables.cs:19` | **Q2** : 1 000 ms > 250 ms ⇒ G8 rougit. Aujourd'hui `LongPressButton` **ne montre RIEN** pendant la seconde d'appui (aucun `Image`, aucun `fillAmount`) : le joueur maintient le doigt à l'aveugle sur une action irréversible |

### II.0.b Le shell — montage d'un écran, et le bandeau

Ce lieu, c'est le passage d'une pièce à l'autre : une porte, et une voix qui arrive par-dessus le
comptoir.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `shell.entree` | tout montage dans `ContentSlot` : `MountTenant<T>` (`Shell/AppShell.cs:1480`), `MonterLocataireEnSurimpression<T>` (`:1525`), `EnterDistrict` (`:329`), `MonterMenuPlus` (`:1328`). **Exclu : le premier montage de la session** | `Alpha` 0,00 → 1,00 sur le `CanvasGroup` de la racine du locataire (posé à l'`Attacher`), **160 ms**, `ease-out`, une fois. Pas de translation (voir question) | On ne se téléporte pas d'une pièce à l'autre : on pousse une porte, et ce qu'il y a derrière se découvre le temps du geste. | `Transition` | 1 | durée 0 (design §4) | `REUSE canon screen_12:223` (« Transition `T.ui.anim_max_block_ms` — interruptible ») | ⚠️ **La SORTIE n'est pas animable sans retouche** : `UnmountCurrentTenant` détruit l'ancien locataire **de façon synchrone** et vide tout `ContentSlot` (`AppShell.cs:1858-1863`). Je propose donc d'animer **l'entrée seule** — l'écran précédent disparaît d'un coup, comme aujourd'hui : une entrée, zéro retouche du shell. Et **F4 interdit l'animation au cold-open** (`global_conventions_core.md:126`) ⇒ l'exclusion du premier montage est une garde, pas une préférence. Glissement de ⑱ : le canon ne spécifie un `slide-up` que pour la bottom-sheet de ② (`screen_2a:258`) ; ⑱ est une liste plein cadre ⇒ **fondu seul, recommandé** |
| `bandeau.entree` | `BandeauEphemere.Annoncer(...)` (`Shell/BandeauEphemere.cs:261-275`) : aujourd'hui `groupe.alpha = 1f` d'un coup (`:269`) | `TranslationY` **−10 u de bandeau → 0** (= 27,6 px, le bandeau est ancré au bord haut, pivot haut, `BandeauEphemere.cs:204-206`) et `Alpha` 0,00 → 1,00, **200 ms**, `ease-out`, une fois | Une annonce descend de la barre comme un billet qu'on vous passe par-dessus le comptoir : elle arrive, elle n'était pas là. | `Transition` | 1 | durée 0 | `PROPOSÉ` (l'entrée du bandeau n'existe pas : seule la sortie est animée) | — |
| `bandeau.sortie` | la minuterie du bandeau, ou le toucher | `Alpha` 1,00 → 0,00, **400 ms**, **`linear`** (mesuré : `BandeauEphemere.cs:296-299`, `Time.unscaledDeltaTime`), une fois, après une tenue de **5,000 s** (`DureeParDefautS`, `:166`) | Une annonce ne se décroche pas : elle s'éteint, et le temps qu'elle met à s'éteindre dit qu'elle n'était pas importante. | `Transition` | 1 | durée 0 | `REUSE design §8` (la coroutine `Effacement` disparaît) | **Q2** : 400 ms > 250 ms ⇒ G8 rougit, alors que le canon ne plafonne que la durée **bloquante** (`global_conventions_core.md:124`) et que ce fondu ne bloque rien (`Toucher()` appelle `Effacer()` immédiatement, `:286-291`). **Q11** : la durée 5 s / 0,4 s est déclarée **non ratifiée** par le code lui-même (`:157-158`, « à ratifier au rendu ») |

### II.0.c Le comptoir du Verge d'Or — la matière partagée de ⑨, ⑩ et ⑯

Ce lieu, c'est le bar : un zinc, une étagère de bouteilles, trois tabourets, et une rampe au-dessus
du plateau. C'est **le seul décor réellement dessiné de tout le client** — une vraie texture de scène
(`Assets/Art/Scenes/Resources/Scenes/sprite_environment_bar_nuit.png` pour ⑨/⑩,
`…_verge_d_or_jour.png` pour ⑯), un dégradé, un zinc en trois couches, **7 bouteilles**, deux filets
de laiton. Tout est bâti par `ShellContracts/DecorAuComptoir.cs`, partagé (`Batir()` :62-128).

C'est donc le seul endroit du périmètre où une `Ambiance` a une cause physique à l'écran.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `comptoir.lampe` <br>`Ecran = ⑨ ⑩ ⑯` | en continu, tant que l'écran est monté | `Alpha` **0,82 → 1,00 → 0,82** sur un `CanvasGroup` posé sur `Plateau/FiletHaut` (`DecorAuComptoir.cs:124` : trait de `Px(2)` = **8,5 u = 7,2 px**, pleine largeur, or `#d9ab4e` à α 0x88), **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 2,300 s` | Au-dessus du zinc il y a une rampe, et le laiton du plateau est ce qui la rend : c'est le seul endroit du comptoir où l'on voit la lumière bouger. | `Ambiance` | 1 (par écran) | figé à `PoseDeReposS` = l'image riche (α 1,00), pas la 0 % (design §4) | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` (4 600 ms mesurés, §0.5) | — |
| `comptoir.bouteilles` <br>`Ecran = ⑨ ⑯` | en continu | `Alpha` **0,80 → 0,96 → 0,80** sur un `CanvasGroup` posé sur la rangée `Bouteilles` (`DecorAuComptoir.cs:236`, 7 bouteilles de `Px(9) × Px(32 ou 26)` = **38 × 136 ou 111 u**, dégradés braise/or et cyan/or à α 0,80, `:255-260`), **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s** (la même que `comptoir.lampe` : c'est la même rampe), `PoseDeReposS = 2,300 s` | Les bouteilles de l'étagère sont en verre : elles ne s'allument pas toutes seules, elles rendent la rampe du comptoir, en même temps qu'elle. | `Ambiance` | 1 (par écran) | figé à `PoseDeReposS` (α 0,96) | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` | ⑩ **n'en a pas** : son zinc est posé à `HauteurDos = 0f` (`Operational/Exceptions/ExceptionDetailController.cs:781`) ⇒ `dos.SetActive(false)` (`DecorAuComptoir.cs:135`) ⇒ **ni étagère, ni bouteilles** sur ⑩. Fait mesuré, pas un oubli |

### II.0.d La bascule — la matière partagée de ⑲ et ㉕

L'interrupteur existe en **deux copies à l'identique** : `Account/Settings/SettingsScreenController.cs:232-251`
et `Onboarding/TutorialScreenController.cs:344-363`. Mêmes dimensions, mêmes couleurs, même mécanique
(l'état est porté par la couleur de la piste et l'ancre du curseur — **aucun `Toggle` Unity**).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `bascule.course` <br>`Ecran = ⑲ ㉕` | le `Button` de la ligne entière (`SettingsScreenController.cs:256-258`, `TutorialScreenController.cs:365-370`) ; l'état d'arrivée est déjà calculé (`BasculeTutoriels.Allumee`, `ShellContracts/BasculeTutoriels.cs:11`) | `Curseur` : `TranslationX` d'un bout à l'autre de la piste, **course 42,7 u = 36,0 px** (piste `Px(22)` = 93,9 u, curseur `Px(5)` = 42,7 u, retrait `Px(1)` de chaque bord — `SettingsScreenController.cs:241-251`) · `Interrupteur` : `Teinte` de `Eteint` (blanc α 0,18) à `Or` `#d9ab4e`, ou l'inverse. **140 ms**, `ease-out`, une fois | Un interrupteur a une course : le curseur passe d'un bout de la piste à l'autre sous le pouce, et le laiton de la piste s'allume quand il arrive au bout. | `Transition` | 2 | durée 0 (les deux valeurs sont posées d'un coup — exactement le comportement d'aujourd'hui) | `PROPOSÉ` · les deux positions et les deux couleurs de repos sont **déjà dans le code** (`:240`, `:244-246`) : rien à inventer | — |

---

## ④ Accueil — l'ouverture de session

Ce lieu, c'est le bureau d'où l'on regarde la ville la nuit : une feuille sur la table, et derrière la
fenêtre le diorama de Brennar. — Fiction : `front.md:1605-1628`. ⚠️ **front.md ne nomme AUCUNE matière
pour ④** (balayage lexical sur 1600-1630 : 0 occurrence de zinc, papier, encre, laiton, lampe, cadran,
voyant…) ; la seule matière de cet écran vit dans le code : `FondDeVille`, le diorama de nuit
(`Operational/Dashboard/DashboardController.cs:646-655`) et `VoileDeScene`, son voile dégradé (`:657-662`).
Maquette : « ❌ aucune » (`front.md:1613`).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `accueil.carte-suivante` | `SkipButton` de la carte à plus fort levier (`Shell/HighestLeverageCardController.cs:376-384`), puis la carte suivante est rendue | `Alpha` 1,00 → 0,00 en **90 ms** `ease-in`, puis 0,00 → 1,00 en **110 ms** `ease-out`, sur le `CanvasGroup` de la racine de `AccueilHlCard` (`Shell/AppShell.cs:1701`). Total **200 ms**, une fois | On écarte la carte et on en distribue une autre : la main qui la pose met le temps de la poser, on ne voit pas deux cartes à la fois. | `Transition` | 1 | durée 0 | `REUSE canon screen_1:386` (« Swap animé `T.ui.anim_max_block_ms` (250 ms max) quand Skip remplace la card ») | — |
| `accueil.descente` | `CurrentHeat.escalated` (`DashboardController.cs:493-494`, la ligne « Descente ») | `Teinte` de l'`Image` de fond de `Row_descente` (`RowBg` `#232a2d`, `minHeight 32 u` = 27 px, pleine largeur, créée `:751-763`) : **1,22 → 1,00 → 1,22**, **période 1,100 s**, `ease-in-out`, **infini**, **phase −0,400 s**, `PoseDeReposS = 0,550 s`. Le fond seul : les `TMP_Text` de la ligne ne sont pas touchés (G6) | Quand la brigade est dans le quartier, la ligne bat au même rythme que le cerclage du médaillon et le filet de la barre — parce que c'est la même nouvelle, et qu'elle vient du même gyrophare. | `Alerte` | 1 | `Alerte` + `Teinte` ⇒ **conservé** (design §4 : « la pulsation d'un voyant reste ») | `PROPOSÉ` · **période REUSE** `hud-brennar-canon: pouls` (1,100 s, `Shell/TopBarController.cs:782`) | — |

**Pourquoi seulement deux.** J'ai écarté une `Ambiance` sur `FondDeVille` (teinter tout le diorama =
faire respirer une ville entière : aucune cause) et sur `VoileDeScene` (un voile qui bouge sans source
= décoratif). ④ est une feuille de texte devant une image fixe : il doit RÉPONDRE, pas remuer.

---

## ⑤ Décision du jour — la carte distribuée sur le zinc

Ce lieu, c'est une carte posée de travers sur le comptoir, avec un jeton de laiton à côté et un tampon
pour la trancher. — Fiction : `front.md:1366`, verbatim : « **la carte distribuée sur le zinc** (pips =
`impact_bucket`/`urgency_bucket`, **coin ♦** = `structural`, **jeton** = `structural_budget`) » ; 5 états
dont « le **sabot** » et « **après le tampon** ». Matière nommée : carte à jouer, sabot, zinc, jeton,
tampon, pips, coin ♦. Tout existe réellement : `Shell/DecisionDetailScreenController.cs:302-429`.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `decision.distribuee` | ouverture de l'écran avec une carte servie : `EtatSabot == false` (`DecisionDetailScreenController.cs:174`, `:179-184`) | `carteRoot` (`:302-328`) : `TranslationX` **−34 u → 0** (= −28,7 px), `Rotation` **+7,0° → +2,0°** (la rotation de repos, posée `:311`), `Alpha` 0,00 → 1,00. **220 ms**, `cubic-bezier(.2,.8,.3,1)`, une fois. Le point le plus éloigné de la carte parcourt ≈ 34 px | Une carte n'apparaît pas sur le zinc : elle est distribuée — elle glisse de la main vers vous et s'arrête de travers. | `Transition` | 1 | durée 0 | `PROPOSÉ` · l'angle de repos (+2°) est **lu dans le code**, pas choisi (`:82`, `:311`) | — |
| `decision.cachet` | `BoutonLire.OnLongPressCompleted` (le `LongPressButton` du tampon, `:428-429`) | sur `Tampon/Bord` (`RoundedRectOutline` rouge `#93402c`, trait `Px(2)` = **8,5 u = 7,2 px**, `:412-419`) : `Echelle` 1,00 → 1,06 → 1,00 et `Teinte` 1,00 → 1,35 → 1,00, **180 ms** (`ease-out` puis `ease-in`), une fois | Le tampon s'abat : le caoutchouc écrase l'encre une fraction de seconde, puis se relève — et la mention reste. | `Transition` | 1 | durée 0 | `PROPOSÉ` · précédé de `retour.appui-long` (§II.0.a), qui est le REUSE canon | **Q9** : le geste **referme l'écran**. Il faut ordonner la fermeture APRÈS les 180 ms (non bloquant), sinon la frappe n'est jamais vue et l'entrée doit être **retirée** — une transition qu'on ne voit pas est une dette, pas une animation |
| `decision.jeton` | `pris == false`, soit `budget.cap_reached` faux (`:198-201`) : la décision de structure du jour est encore libre | `Jeton` (`ProceduralUI.RadialDisc`, `Px(40)` = **170,7 u = 144 px** de laiton, `:356-363`) : `Teinte` **0,88 → 1,00 → 0,88**, **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 2,300 s` | La lampe à abat-jour du bureau est sur un vieux circuit : son filament bat lentement, et le laiton du jeton est la seule chose de la table qui le rende. | `Alerte` | 1 | `Alerte` + `Teinte` ⇒ **conservé** : tant qu'il reste une décision, on doit le voir même en mouvement réduit | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` (§0.5) | Pourquoi `Alerte` et non `Ambiance` : la cause est la lampe, mais **l'information est de jeu** (il reste une décision aujourd'hui). Un `Ambiance` serait gelé en mouvement réduit et l'information disparaîtrait |

---

## ⑥ La Famille — l'organigramme sous la lampe du bureau

Ce lieu, c'est le bureau du Don : un médaillon sous un halo de lampe, un rail de laiton qui descend
vers ses hommes, et une chemise par homme. — Fiction : `front.md:1376-1395`. ⚠️ **front.md ne nomme
aucune matière** pour ⑥ (le seul mot d'objet est « chips », un objet d'interface). La matière vit dans
le code : `Halo` (voile radial d'or α 0,14, 225 u, `Operational/Lieutenant/LieutenantScreenController.cs:2366-2384`),
`Anneau` de laiton (`:2414-2424`), `Rail` vertical en dégradé de laiton (`:1876-1911`, `:2103`),
`Tick` d'embranchement (`:1916-1929`), verre gravé (`:2308-2317`).

⑦ Lieutenant Detail et ⑧ Rule Editor **ne sont pas des écrans** : ce sont des sections de ce même
contrôleur (`front.md:1400` → `:177`, `front.md:1421` → `:186`), montées par l'onglet Famille. ⑳
Recrutement aussi (`front.md:1441` → `:117`, `:173`).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `famille.lampe-du-don` | en continu, tant que la rangée du Don est montée | `Halo` (le voile radial d'or du Don, **225 × 225 u = 190 × 190 px**) : `Alpha` **0,82 → 1,00 → 0,82** sur un `CanvasGroup` posé dessus, **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 2,300 s` | Le Don reçoit sous une lampe à abat-jour ; son halo est la lumière de cette lampe, et un vieux filament ne tient pas une intensité fixe. | `Ambiance` | 1 | figé à `PoseDeReposS` (α 1,00) | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` | ⚠️ L'hôte est **sous le `RectMask2D`** du défilement (`:1331`) : canal `Alpha` par `CanvasGroup`, donc hors du plafond de 6 pistes de transformation, mais le **coût** de `CanvasGroup.alpha` sous un masque est l'objet du **spike E0** (design §3) |
| `famille.rang-ouvre` | tap sur une rangée de lieutenant → `OpenLieutenant(id)` (`:2733`) ; aujourd'hui `MajVisibiliteDetail` pose `CanvasGroup.alpha = 0 ou 1` **en une affectation** (`:1849`, `:1860`) | le **même** `CanvasGroup` : `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`, une fois | On ouvre la chemise d'un homme : les pages ne sautent pas sous la main, elles viennent. | `Transition` | 1 | durée 0 (= le comportement d'aujourd'hui, à l'identique) | `REUSE canon screen_3:451` (« transitions arbre + `SplitFlapReadout` ≤ 250 ms ») · **l'hôte existe déjà** (`:1847-1848`) : zéro objet neuf | — |

**Écarté** : une `Alerte` sur `EstCuisinierAuRepos` (`:2742-2743` — un cuisinier à vous ne fait rien,
c'est une vraie information de jeu). Son seul hôte possible est l'encart d'équipe en pointillé, trait
`FXf(1)` = 2,23 u = **1,9 px** : sous le plancher de perceptibilité pour une variation de teinte
(§0.3). À reprendre si l'atelier donne un voyant à cette rangée.

---

## ⑯ Revue du jour — le matin au Verge d'Or

Ce lieu, c'est le comptoir au matin : un jeton de confiance posé sur le zinc par homme, un registre
ouvert, et un tampon pour clore la journée. — Fiction : `front.md:1479-1480`, verbatim : « le matin au
Verge d'Or, un **jeton de confiance posé sur le zinc** par homme (rendre = validate, garder en appui
long = dismiss, la réserve = `trust_budget_bucket`), le **registre tamponné** ».

Matière réellement dessinée, et c'est l'écran le mieux servi du périmètre : le décor de comptoir
(§II.0.c), 3 tabourets à `CanvasGroup` α 0,85, un `Medaillon` et une `Bulle` (à `CanvasGroup`) par
billet, un `Jeton` de laiton de `Px(34)` = **145 u = 122 px**, 3 pastilles de réserve, le `Registre`
en papier **incliné de +0,4°** avec sa `Tranche` rayée, le `Tampon` et son `Cachet` « SIGNÉ »
**incliné de +14°** — `Shell/DailyReviewScreenController.cs:410-634`, `:1146-1312`.

Porte aussi : `comptoir.lampe`, `comptoir.bouteilles` (§II.0.c).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `revue.jeton-rendu` | `verdict.token_returned` (`DailyReviewScreenController.cs:662`) ; aujourd'hui `Jeton.localRotation = +12°` (`:667`) et `Bulle.alpha = 0,72` (`:658`) sont posés **d'un coup** | `Jeton` : `Rotation` **0° → +12,0°**, **220 ms**, `ease-out` (le bord du disque de 122 px parcourt **12,7 px**) · `Bulle` (`CanvasGroup`, `:443`) : `Alpha` 1,00 → 0,72, **200 ms**, `ease-out`. Une fois | On rend le jeton : il est poussé sur le zinc et s'arrête de travers, et le billet de l'homme n'a plus besoin d'être lu. | `Transition` | 2 | durée 0 (= le comportement d'aujourd'hui) | `REUSE canon screen_11:255` (« card passe à l'état `VALIDATED`, animation flip-out ») · les deux valeurs d'arrivée sont **déjà dans le code** | ⚠️ Le canon se contredit sur le mot : `screen_11:255` et `:396` disent **flip**, `screen_11:280` dit **slide-out**. Je propose la rotation, qui est celle que le code pose déjà |
| `revue.cachet` | `TamponSigne` / `lotSigne > 0` (`:722`) ; aujourd'hui `tamponCachet.SetActive(true)` (`:735`) | `Cachet` (papier `#efe4c6cc` incliné de **+14°**, `:1286-1311`) : `Echelle` **1,14 → 1,00** en **160 ms** `ease-out`, et `Alpha` 0,00 → 1,00 en **120 ms** `ease-out`. Une fois | Le cachet est abattu d'un coup sec : il arrive plus large que sa marque, puis la marque reste. | `Transition` | 1 | durée 0 | `PROPOSÉ` · précédé de `retour.appui-long` sur `BatchConfirmButton` (`:1276`) | — |

**Pourquoi pas plus.** Les 7 bouteilles et le filet du plateau sont déjà pris par les deux entrées
transverses de §II.0.c ; les 3 tabourets portent un `CanvasGroup` à α 0,85 qui serait un hôte tentant,
mais un tabouret vide **ne bouge pas** : c'est précisément ce que dit le cadre « personne au comptoir ».

---

## ⑨ La file au comptoir — Exception Queue

Ce lieu, c'est le bar le soir : trois hommes font la queue au zinc, le premier parle, et ce qui est
tranché reçoit son cachet. — Fiction : `front.md:1512`, verbatim : « la file **au comptoir** (ordre
servi, **rail** = `severity_band`, **mot** = `priority_band`, le premier parle, la ville fait la queue
quand `lieutenant_id` est null), la **main de cartes** = le détail ⑩, **après le tampon** (`outcome`
**cacheté** — Q3 du juge, jamais dessiné) ». Matière nommée : le tampon, le cachet, la main de cartes,
le comptoir, le rail.

Réellement dessiné : le décor de comptoir de nuit, 3 places maximum (`places = ApresPresent ? 2 : 3`,
`Operational/Exceptions/ExceptionQueueController.cs:577`), un `Rail` de `Px(34) × Px(3)` = **145 × 12,8 u**
coloré par la gravité (`:632-634`, `:675-684`), un `Medaillon` par attendant, la bulle du parleur avec
sa queue carrée **inclinée de 45°** (`ParleurAuComptoir.cs:165`), le `Tampon` (`TamponAuComptoir`,
papier plein `#d9cca9`, bord d'encre `#93402c` de `Px(2)`, **angle 0°**) et le `Cachet`
**incliné de +8°** (`:482`), vert `#4f7f3f`.

Porte aussi : `comptoir.lampe`, `comptoir.bouteilles` (§II.0.c).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `file.cachet` | `ApresPresent` devient vrai (`:425`, posé par `trancheeIssue`/`garderTranchee` `:418-420`, bloc activé `:508`) | `Cachet` (conteneur incliné de **+8°**, qui **déborde** du verre, `:477-495`) : `Echelle` **1,12 → 1,00** en **160 ms** `ease-out`, `Alpha` 0,00 → 1,00 en **120 ms** `ease-out`. Une fois | La carte tranchée reçoit son cachet : on l'abat de travers sur le verre, et il reste là jusqu'à demain. | `Transition` | 1 | durée 0 | `PROPOSÉ` — le canon le réclamait sans le dessiner (`front.md:1512` : « `outcome` **cacheté** — Q3 du juge, **jamais dessiné** ») ; il **est** dessiné aujourd'hui, il n'est simplement pas abattu | — |
| `file.part` | un attendant devient `parti` (`:596`, `:610` : `CanvasGroup.alpha = 0,28`) | `CanvasGroup` de l'attendant : `Alpha` 1,00 → 0,28 et `TranslationY` **0 → −9 u** (= −7,6 px), **200 ms**, `ease-out`, une fois | L'homme qu'on vient de renvoyer s'écarte du comptoir : il recule d'un pas et s'efface dans l'ombre — il ne disparaît pas. | `Transition` | 1 | durée 0 (= le comportement d'aujourd'hui) | `REUSE canon screen_5:340` (« row disparaît, **fade out** `T.ui.anim_max_block_ms` ») · l'alpha d'arrivée (0,28) est **déjà dans le code** | — |

⚠️ **Chemin mort relevé au passage** (pas une animation, mais il mord le même code) : `headerText`
(`:46`) et `rowsArea` (`:47`) ne sont jamais assignés, et `RenderError()` les déréférence (`:1038-1039`).
Le voile d'erreur « Le comptoir n'a pas répondu » n'a aucun hôte vivant.

---

## ⑩ Le détail d'un raid — la main de cartes

Ce lieu, c'est la main qu'on vous tend au comptoir : trois cartes en éventail, la suggérée déjà
sortie du rang, et un talon qu'on peut déplier. — Fiction : `front.md:1512` (« la **main de cartes** =
le détail ⑩ ») et `front.md:1530` (« Exception — le détail d'un raid »).

Réellement dessiné : 3 cartes de `Px(100) × Px(150)` = **427 × 640 u**, chacune à son angle **statique**
(−5° risquée ♠ · 0° suggérée ♦ · +5° apprendre ♣) et à sa levée (la suggérée est **remontée de
`Px(8)`** = `CssCarteLeve`), `Operational/Exceptions/ExceptionDetailController.cs:380-385`, `:531-532` ;
un `Talon` rouge de `Px(34) × Px(50)` = **145 × 213 u** (`:392-401`) ; le même `Tampon` que ⑨ (`:449-453`,
`surTap: null` — **seul l'appui long agit**) ; le même décor de comptoir, zinc à 15 %, **sans étagère**.

Porte aussi : `comptoir.lampe` (§II.0.c — pas `comptoir.bouteilles`, voir sa question).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `main.distribuee` | ouverture de l'écran, la main est servie (`:365-373`, `:380-385`) | les 3 `Face` : `TranslationY` **+48 u → repos** (= +40,5 px), `Rotation` **−14,0° → repos** (−5° / 0° / +5°), `Alpha` 0,00 → 1,00. **150 ms** chacune, `ease-out`, une fois, **décalées de 0 / 45 / 90 ms** ⇒ la dernière finit à **240 ms** | On distribue une main : les trois cartes arrivent l'une après l'autre et s'arrêtent en éventail, chacune à son angle. | `Transition` | 3 | durée 0 | `PROPOSÉ` · les 3 angles et les 3 levées de repos sont **lus dans le code** (`:380-385`) | 240 ms au total, **non bloquant** : le décalage est une suite de 3 pistes de 150 ms, pas une animation de 240 ms. Si f2 préfère la lecture stricte de G8, supprimer le décalage (les 3 cartes arrivent ensemble) coûte la fiction du « distribué » |
| `main.levee` | le joueur choisit une autre carte (`selection`, `:70`, `:569-574`) : celle qui était levée redescend, la nouvelle monte | `TranslationY` **±34 u** (= ±28,8 px ; `Px(8)` = `CssCarteLeve`, `:319`, `:384`), **180 ms**, `ease-out`, une fois, sur les deux cartes concernées | On ne choisit pas une carte en la montrant du doigt : on la sort du rang — elle monte, et celle qu'on laisse retombe. | `Transition` | 2 | durée 0 | `PROPOSÉ` · la levée de repos est **dans le code** (`:384`) | — |

---

## ⑭ La semaine — Compression Week Board

Ce lieu, c'est le tableau de la semaine où la ville serre : un manomètre, des jetons de décision, et
des notes. — Fiction : `front.md:1557`, verbatim : « la ville serre (**manomètre** = `stress_bucket`,
**jetons** = `decisions_used/remaining`, **notes** = `entries[]`) ».

⚠️ **Le manomètre nommé par la fiction n'est pas construit** : `stress_bucket` est rendu en **texte**
(`CoreLoops/Compression/CompressionScreenController.cs:194-204`) et en plaque de texte (`:461-471`) ;
0 `ArcCuit`, 0 cadran, 0 aiguille dans ce fichier. Les jetons, eux, existent : `ProceduralUI.RadialDisc`
de `Px(13)` = **55,5 u = 47 px**, or si libre, `Eteint` si dépensé (`:231-239`).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `semaine.jeton-depense` | une décision est confirmée (`Decider`, `:322-335`) : un jeton passe de `Libre` (or) à `Depense` (`Eteint`, blanc α 0,18) | sur le jeton concerné (**47 px** de diamètre) : `Teinte` 1,00 → 0,42 en **200 ms** `ease-in`, `Echelle` 1,00 → 0,94 en **200 ms** `ease-out`. Une fois | Un jeton dépensé n'est pas effacé : on le retourne sur le tapis, il perd son or et s'enfonce d'un cheveu. | `Transition` | 1 | durée 0 — et le canon le demande explicitement (`screen_13:372` : « mouvement réduit = valeur statique ») | `REUSE canon screen_13:281` (« `ProblemCardWidget` … animation flip-out, `DecisionBudgetReadout` décrémente ») et `screen_13:372` (« ≤ 250 ms, **interruptible** ») | — |
| `semaine.aiguille` | `stress_bucket` change entre deux chargements (`:202-203` : `tendu` = `crushing` ou `compression_active`) | `Rotation` de l'aiguille, de l'angle de l'ancienne bande à celui de la nouvelle, **700 ms**, `ease-in-out`, une fois | Une aiguille ne saute pas d'une graduation à l'autre : elle balaie, et c'est le balayage qui dit que la ville a serré d'un cran. | `Transition` | 1 | durée 0 | **`hud-brennar-canon: aiguille`** = la paire d'inventaire **B10** (`inventaire-animations.md:62` : « transition `transform .7s` (aiguille) — l'aiguille du manomètre balaie jusqu'à sa nouvelle bande »), **absente côté client** | ⛔ **HÔTE À DESSINER** ⇒ demande **A2**. **Q2** : 700 ms > 250 ms, mais c'est la durée **mesurée de la maquette** et X7 exige la fidélité au moteur CSS réel ; elle ne bloque rien. Trancher entre fidélité (700 ms) et plafond (250 ms) |

---

## ⑮ Les inspections — le registre de dispatch

Ce lieu, c'est le tableau de dispatch de la police : dix-huit secteurs en colonnes, un voyant par
secteur, et un bouton pour déposer un signalement. — Fiction : `front.md:1768`, verbatim : « **le
tableau d'observation + le registre de dispatch** (**liège/punaises/fiches** pour les 6 commissariats
… **papier à bandes** pour les 18 districts … **le retour de bâton** = `backlash_triggered` ».

⚠️ **Ni liège, ni punaise, ni fiche, ni papier à bandes n'est construit** : l'écran est un registre
tabulaire de 18 lignes de texte (`CitySim/Inspection/InspectionScreenController.cs:286-331`), avec
**un glyphe de régime sprité par ligne** (`DispatcherIcons.Pour(...)`, `Px(9)` = **38 u = 32 px**,
teinté `Braise` si tendu, `:310-322`). Les « barres de présence » des origines sont des caractères
`▓` dans une chaîne de texte (`:351`), pas des Images.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `police.dispatch` | `tendu` (`dispatcher_regime == "SURGE"` ou `"BACKLOGGED"`, `:308`) — le répartiteur du secteur déborde | le glyphe `Regime` de chaque ligne tendue (**32 × 32 px**) : `Teinte` **1,28 → 1,00 → 1,28**, **période 1,600 s**, `ease-in-out`, **infini**, **phase −0,600 s**, `PoseDeReposS = 0,800 s`. **Même phase pour toutes les lignes** : c'est le même tableau | Un tableau de dispatch est un standard : quand un secteur déborde, son voyant n'est pas allumé fixe — il bat, et c'est comme ça qu'un répartiteur le repère d'un coup d'œil. | `Alerte` | **6** | `Alerte` + `Teinte` ⇒ **conservé** (G5 : 1,6 s ≥ 0,4 s, soit 1,25 variation/s) | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-veille` (la veille des voyants : `filter:brightness(1 → 1.35)`, **3 200 ms** mesurés, `generateur-marche.py:116`, `inventaire-animations.md:33`) — **période raccourcie à 1,6 s** et c'est un écart assumé : un voyant de dispatch qui déborde bat plus vite qu'un voyant de veille | Budget plafonné à **6** voyants, dans l'ordre de la liste : c'est le compte réel mesuré par la fiction (`front.md:1768` : « `belief` **mesuré HUNTING ×6 dès le J1** »). Au-delà, la régie refuse (design §3) : **pas de voyant**, jamais un voyant à moitié |
| `police.baton` | `baton` = `DernierRapport.backlash_triggered` (`:263`) | `batonTexte` (`TMP_Text`, `Px(9)` = **38 u = 32 px**, `Braise`, `:433-436`) : `Alpha` 0,00 → 1,00, **200 ms**, `ease-out`, une fois. **`Alpha` seul** (G6) | C'est une ligne qu'on vient d'ajouter au registre : l'encre paraît sous la plume, elle n'était pas là avant le geste. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

---

## ⑰ Le commissariat — ce qu'ils croient, et la patrouille

Ce lieu, c'est le tableau du commissariat : deux échelles de quatre crans, l'une pour ce que la police
croit, l'autre pour la patrouille dans les rues. — Fiction : `front.md:1783`, matière nommée :
**liège, punaises, fiches, papier à bandes** (partagée avec ⑮). ⚠️ **Aucune n'est construite** :
l'écran est fait de 2 cartouches de palier et 2 blocs « manque » en pointillé
(`CitySim/Precinct/PrecinctScreenController.cs:211-269`).

Les crans, en revanche, sont de vrais objets : `C0..C3`, `RoundedRectOutline` de
`Px(28) × Px(6)` = **119,5 × 25,6 u = 101 × 21,6 px**, allumés si `i < rang`, teintés `Braise` dès
`rang ≥ 3` (`:232-242`, seuil `:224`).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `commissariat.crans` | `CroyanceRang` ou `PatrouilleRang` monte entre deux chargements (`:271-272`, `:278-279`) | le cran qui vient de s'allumer (**101 × 21,6 px**) : `Alpha` 0,00 → 1,00 et `Teinte` **1,45 → 1,00**, **200 ms**, `ease-out`, une fois | Ce que la police croit vient de monter d'un cran : sur le tableau, c'est une encoche de plus qui prend la couleur, et elle la prend au moment où le greffier la marque. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

**Une seule entrée, et c'est une décision.** ⑰ est une lecture de deux états : pas de lampe, pas de
device, 9 textes (`front.md:1783`). Le seul moment où quelque chose **se passe** est l'escalade, et
c'est elle que j'anime. Les 2 blocs « manque » (pointillés, jamais cliquables) ne bougent pas : un
geste impossible n'a pas de retour.

---

## ⑲ Les réglages — les tiroirs du compte

Ce lieu, c'est la porte du coffre et ses tiroirs : « Le compte », « Le jeu ». — Fiction :
`front.md:1894` (« les tiroirs *Le compte* et *Le jeu* » ; la maquette de ⑲ est **fusionnée avec ㉒**
dans « LE PROFIL », cadres 45-47). Aucune autre matière n'est nommée pour ⑲.

Réellement dessiné : 7 lignes de réglage/geste sous 3 sections, dont **2 bascules** (l'interrupteur
de §II.0.d), 2 lignes de langue à pastille radiale, 1 geste vivant à contour or continu, 2 lignes
« manque » à contour pointillé (`Account/Settings/SettingsScreenController.cs:153-217`).
Aucun défilement, aucun `CanvasGroup`, aucune jauge.

Porte : `bascule.course` (§II.0.d) — sur `Bascule_Tutoriels` et `Bascule_Marche`.

**Aucune entrée propre.** La bascule est le seul objet de cet écran qui ait une course ; le reste est
du texte dans des contours de 4,27 u.

⚠️ **Cet écran doit GAGNER une ligne, et c'est le canon qui le dit, pas moi** : ⑲ est l'écran qui
porte le bouton « Mouvement réduit » (`screen_14:71` « Reduced motion `[ ] Off` », i18n
`settings.a11y.reduced_motion` → FR « Mouvement réduit » `:208`, rôle `switch` `:298`, « bascule
**immédiat**, tous les `Animator` coupés runtime, `PATCH /v1/me/settings` » `:251`), **plus un
second** (`settings.game.disable_autoplay`, `:78`, `:212`). ⇒ demande **A5**, question **Q4**.

---

## ㉒ Votre profil — **SANS MOUVEMENT**

Ce lieu, c'est une porte de coffre rivetée avec une molette de laiton et des plaques de compteur
frappées. — Fiction : `front.md:1821-1822`, verbatim : « porte de coffre rivetée, **molette de laiton**,
plaques de compteur frappées, **un réglage = un tiroir** avec sa poignée, **leviers de laiton** en bas ».

**Trois raisons, cumulatives :**

1. **La maquette est déclarée STATIQUE** par la fiction elle-même : `front.md:1820`, « v6 « LE PROFIL »
   … (2026-08-27, **STATIQUE**) ».
2. **La matière qui pourrait vivre n'est pas dessinée.** Le contrôleur ne crée que : un voile plein
   écran, 4 `TMP_Text`, 2 tiroirs en `RoundedRectOutline` de trait `Px(1)` = **4,27 u = 3,6 px**, et
   3 lignes « manque » en pointillé (`Account/Profile/ProfileScreenController.cs:138-214`). Ni molette,
   ni levier, ni plaque frappée, ni lampe, ni voyant.
3. **Il n'y a rien à toucher** : `AddComponent<Button>()` apparaît **0 fois** dans ce fichier — donc
   même `retour.appui` ne s'y applique pas. Et aucun état de jeu n'y change pendant qu'on le regarde
   (`lifecycle_state` : « ACTIVE » seul atteignable, `:227-228`).

⇒ Animer un contour de 3,6 px sans cause serait du décoratif. Si ㉒ doit vivre un jour, c'est l'atelier
qui doit lui donner sa molette ⇒ demande **A7**.

---

## ㉓ La vitrine — le comptoir de laiton et la vitre

Ce lieu, c'est une vitrine derrière une vitre : un comptoir de laiton, des étagères de velours, et des
jetons qu'on voit. — Fiction : `front.md:1861-1864`, verbatim : « **comptoir de laiton**, **vitre avec
ses reflets**, **étagères de velours** … **les articles sont des OBJETS** … les Marks sont des **jetons
de laiton** — une monnaie qu'on voit, pas un nombre ».

Réellement dessiné : un `Comptoir` à contour `OrLisere` `#d9ab4e40` (trait `Px(1)` = 4,27 u), le solde
(un `TMP_Text` de `Px(14)` = 59,7 u, qui passe en `Braise` à zéro), une liste **défilante**
(`RectMask2D` `Economy/Shop/ShopScreenController.cs:406`, `ScrollRect` `:409`, largeur de vue mesurée
**1 196 u**), et 9 articles portant chacun un `Objet` = `ProceduralUI.RadialDisc` de `Px(11)` =
**46,9 u = 40 px** (`:223-228`).

⚠️ Le solde est **un nombre** (`:369-370`) alors que la fiction veut « une monnaie qu'on voit, pas un
nombre ». Je ne l'anime pas (contrainte 2 de §I.2) et je ne le corrige pas : ce n'est pas mon objet.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `vitrine.acquis` | un achat aboutit : `Acheter()` → `Charger(token)` (`:327-335`, `:334`) ; au rendu suivant, `possede` est vrai pour ce `sku_id` (`:195`) | sur l'article acheté : `Objet` (le disque de laiton, **40 px**) `Echelle` **0,90 → 1,00**, **180 ms**, `ease-out` · `Possede` (le `TMP_Text` « ACQUIS », `:241`) `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`. **`Alpha` seul sur le texte** (G6). Une fois | L'article passe de la vitrine à votre poche : le commis le sort, le pose devant vous et retourne l'étiquette. | `Transition` | 2 | durée 0 | `PROPOSÉ` | ⚠️ `Rendre()` **détruit tous ses enfants** à chaque appel (`:171-172`) : la transition s'attache au rendu **qui suit** l'achat, et le contrôleur sait quel `sku_id` a été acheté. C'est la règle générale de ce catalogue (§VI.2) |
| `vitrine.reflet` | en continu | une bande de lumière oblique de **60 u de large** (≈ 51 px) traverse le comptoir : `TranslationX` **−60 u → 1 256 u**, **période 11,000 s**, `linear`, **infini**, **phase −4,200 s**, `PoseDeReposS = 3,700 s`. Bornée par une fenêtre de découpe à dessiner | Une vitre de comptoir prend la lumière de la rue : un phare passe dehors, et le reflet traverse le verre d'un bout à l'autre. | `Ambiance` | 1 | figé à `PoseDeReposS` (le reflet arrêté au tiers de sa course — visible sur une PNG) | `PROPOSÉ` | ⛔ **HÔTE À DESSINER** ⇒ demande **A3** : la vitre, la bande de reflet, et sa fenêtre de découpe. **Tant que l'hôte n'existe pas, ㉓ n'a qu'une entrée** (`vitrine.acquis`), et il faut le dire plutôt que de compter une ligne qui ne tourne pas |

---

## ㉔ Les rapports d'autonomie — le burner

Ce lieu, c'est un bippeur dans la poche : un afficheur LCD vert, des capitales sans accents, deux
softkeys, et un clavier où l'on tape un chiffre pour répondre. — Fiction : `front.md:1595`, verbatim :
« **LE BURNER** (ruling user 2026-08-26 : « je préfère un style bippeur/SMS … dans ma tête on est dans
les mêmes années que *The Wire* ») : **LCD vert**, capitales sans accents, **softkeys**, clavier ; les
deux options du back deviennent « 1 » / « 2 » et répondre = **taper un chiffre** ». Les trois cadres :
« deux rapports · rien · **un rapport qui traîne** » (`front.md:1594`).

⚠️ **Le burner n'est pas construit** : l'écran est une carte plate de **600 × 640 u** en unités de
canvas brutes (`Operational/Autonomy/AutonomyInboxController.cs:413-436`), avec des fonds plats, des
`TMP_Text` et des boutons à `minHeight 44`. Ni LCD, ni softkey, ni clavier. La **jauge de budget** de
la fiction n'existe ni au back ni au client (déférée, `:41` ; `front.md:1600-1601` : « la jauge de
budget n'a **aucune source** »).

En revanche l'état de jeu y est le plus riche du périmètre : `issue.decided` (`"A"|"B"|""`,
`AutonomyDtos.cs:17`, testé `:316`) et **`report.backlog_age_cycles`** (`AutonomyDtos.cs:26`, affiché
`:285` — c'est « le rapport qui traîne »).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `autonomie.appel` | le rapport **le plus vieux** par `backlog_age_cycles` (`AutonomyDtos.cs:26`), tant qu'au moins une de ses questions n'est pas décidée (`issue.decided` vide, `:316`) | son `ReportHeader` (`TMP_Text`, fontSize **24 u = 20 px**, `Bold`, `:285-289`) : `Alpha` **1,00 → 0,62 → 1,00**, **période 1,600 s**, `ease-in-out`, **infini**, **phase −0,600 s**, `PoseDeReposS = 0,800 s`. **`Alpha` seul** (G6) | Un bippeur ne dit pas une seule fois qu'un message attend : il répète son appel tant que personne n'a répondu, et c'est le plus vieux des rapports qu'il répète. | `Alerte` | 1 | `Alerte` + `Alpha` ⇒ **conservé** (G5 : 1,6 s = 1,25 variation/s) | `PROPOSÉ` | **Q8** : quel âge compte comme « qui traîne » ? Ma recommandation : **le plus vieux seulement, quel que soit son âge** — un standard n'allume pas douze voyants à la fois, et `backlog_age_cycles` n'a pas de seuil servi |
| `autonomie.reponse` | `Resolve` aboutit (`:192-215`) : `issue.decided` devient non vide | les deux blocs `Option_A`/`Option_B` (`:339-345`) : `Alpha` 1,00 → 0,00 en **120 ms** `ease-in` · puis `Decided` (« ✓ Décidé », `:319-322`) : `Alpha` 0,00 → 1,00 en **120 ms** `ease-out`. Total **240 ms**, une fois | On tape le chiffre sur le clavier : l'afficheur efface les deux choix et ne garde que la réponse — un bippeur n'affiche qu'une ligne à la fois. | `Transition` | 2 | durée 0 | `PROPOSÉ` | ⚠️ `ClearRows()` détruit tout (`:463-469`) : s'attache au rendu **qui suit** la réponse (§VI.2) |

---

## ㉕ La première fois — la leçon qu'on tourne

Ce lieu, c'est une leçon à la fois, et un interrupteur pour dire qu'on n'en veut plus. — Fiction :
`front.md:1800-1814`. ⚠️ **front.md ne nomme AUCUNE matière** pour ㉕ (balayage lexical : 0 hit) ; les
deux seuls objets évoqués sont abstraits — « la première **carte** » (`:1804`) et « la **bulle** de
tutoriel » (`:1805`, dont l'avertissement dit qu'elle n'a « AUCUNE clé i18n ni ancrage servis »).

Réellement dessiné : un voile, un titre, le texte servi de la leçon (`TMP_Text` de `Px(14)` = **59,7 u**,
en or), un bouton « Compris » à contour or, un compteur « N vu(s) · M disponible(s) », et
l'interrupteur de §II.0.d (`Onboarding/TutorialScreenController.cs:225-371`).

Porte : `bascule.course` (§II.0.d) — sur la ligne « On vous explique encore ».

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `premiere-fois.lecon` | `MarquerVu` aboutit (`:375`, lancé `:295`) et la leçon suivante est rendue (`PremierEligibleNonVu`, `:114-120`) | `Texte` (le `TMP_Text` de la leçon, **59,7 u = 50 px**, or, `:290-292`) : `Alpha` 1,00 → 0,00 en **90 ms** `ease-in`, puis 0,00 → 1,00 en **110 ms** `ease-out`. Total **200 ms**, une fois. **`Alpha` seul** (G6) | On tourne la page : le texte d'avant s'en va avant que celui d'après arrive — jamais les deux en même temps. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

---

## ㉘ La distribution — la ficelle sur le liège

Ce lieu, c'est une planche de liège avec deux punaises et une ficelle tendue entre elles. — Fiction :
`front.md:1240`, verbatim : « une **planche de liège**, deux punaises, une **ficelle** » ; et la
ligne-thèse `front.md:1242-1246` : « **LA GÉOGRAPHIE EST DESSINÉE, JAMAIS ÉCRITE.** La **forme de la
ficelle** porte `sinuosity_bucket` … Une route **`severed` est une ficelle ROMPUE** — deux brins qui
pendent, effilochés ; **`saturated`** l'épaissit et la jaunit. »

**C'est le seul écran du périmètre dont la matière est réellement implémentée en géométrie** :
`DistributionFicelleGraphic` (`Operational/Distribution/DistributionScreenController.cs:1340`) dérive
de `MaskableGraphic` et peint son maillage (`OnPopulateMesh`, `:1396`) : 32 segments, trait de
`Px(1,5)`, onde `Mathf.Sin(t·2π) × amplitude` avec **amplitude = `Px(6)`** (`:1392`, `:523`), trou de
rupture de 7 % centré (`:1350`, `:1410`), marques de franchissement (`:1417-1426`), et un disque
d'épingle rouge `#c4413a` de `Px(4,5)` à l'origine (`:1430`). Couleurs **mesurées au pixel** sur
`m-54.png` (`:1093-1099`). Liège `#7a5230` (`:1091`).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `distribution.ficelle-tendue` | `enTransit` devient vrai (un courrier `IN_TRANSIT`, `:394`, `:399`), puis `arrivee` (`transit_band == "ARRIVED"`, `:400`) | l'**amplitude** de l'onde de la ficelle : `Px(6)` → `Px(2)` (= 25,6 u → 8,5 u, soit un ventre qui passe de **21,6 px à 7,2 px**) au départ, et l'inverse à l'arrivée. **240 ms**, `ease-out`, une fois | Quand le chargement part, la ficelle se tend : le mou se résorbe entre les deux punaises, et il revient quand il est arrivé. | `Transition` | 1 | durée 0 | `PROPOSÉ` | ⛔ **DIFFÉRÉ, et c'est un trou du design, pas une préférence** : l'enum `Propriete` (design §1) n'a **aucun puits** pour un paramètre de graphe sur mesure. `Alpha`, `Teinte`, `Remplissage` et les canaux de `RectTransform` ne touchent pas `DefinirTrace(amplitude:)`. ⇒ **Q3**. Sans Q3, cette entrée **sort du catalogue** |
| `distribution.photo` | en continu, quand un coursier s'est fait prendre | la photo punaisée par un seul coin : `Rotation` **−2,5° → +2,5° → −2,5°** autour de la punaise, **période 7,400 s**, `ease-in-out`, **infini**, **phase −2,600 s**, `PoseDeReposS = 3,700 s`. Sur une photo de `Px(30)` = 128 u de haut, le coin libre parcourt **5,6 u = 4,7 px** | Une photo punaisée par un seul coin n'est jamais immobile : le courant d'air du hangar la fait battre contre le liège. | `Ambiance` | 1 | figé à `PoseDeReposS` (la photo arrêtée en bout de course, pas à plat) | `PROPOSÉ` | ⛔ **HÔTE À DESSINER** ⇒ demande **A4**. La fiction la réclame nommément : `front.md:1249`, « **Le cadre qui vaut l'écran : un coursier s'est fait prendre. Sa photo est punaisée, la ficelle pend derrière.** » Elle n'existe pas dans le code |

**Écarté par le plancher de perceptibilité** (§0.3) : le balancement des deux brins d'une ficelle
rompue. À ±0,8° sur un brin de 100 u, le bout parcourt **1,2 px** — sous-pixel. Et à ±3° ce n'est plus
un brin qui pend, c'est un drapeau.

---

## ㉚ La chaîne d'appro — le bon de commande

Ce lieu, c'est un bon de commande sur papier pelure, qu'on remplit une ligne à la fois. — Fiction :
`front.md:1216`, verbatim : « un **bon de commande** sur **papier pelure**, et la chaîne qu'on
**remonte un cran à la fois** ».

⛔ **Fait à consigner, parce qu'il contredit le titre de la section** : « la conduite qui refoule » du
titre (`front.md:1212`) **n'est reprise par aucune ligne « Matière »**, et le mot `refoule` n'apparaît
qu'**une seule fois dans tout front.md** — à cette ligne de titre. Les occurrences de `manomètre`
dans front.md (`:773`, `:1557`, `:2007`) désignent le manomètre de **chaleur du HUD** et celui de ⑭ —
**pas ㉚**. Et côté code : 0 conduite, 0 manomètre, 0 aiguille, 0 voyant dans tout `ChaineDAppro/`
(`backpressure` n'existe qu'en commentaire, `:610`, et comme champ **jamais rendu**,
`ChaineDApproDtos.cs:74`). ⇒ **je ne propose aucun manomètre ici** : ce serait inventer une matière
que ni la fiction ni le code ne portent.

Réellement dessiné : la `Fiche` en `Creme` (`Operational/ChaineDAppro/ChaineDApproScreenController.cs:753-761`),
4 à 5 lignes `Libelle`/`Valeur`, une bannière de pénurie rouge pleine (`:470-487`), un `Filet`
blanc à α 0,06 (`:526-533`), un bouton or (`:582-593`).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `appro.commande-partie` | `enCours` = `dto.has_pending_order` devient vrai (`:382`) : la 5ᵉ ligne `la_commande` apparaît sur le bon (`:466`) | ses deux `TMP_Text` `Libelle` et `Valeur` (`:498`, `:504`) : `Alpha` 0,00 → 1,00, **200 ms**, `cubic-bezier(.3,.7,.2,1)`, une fois. **`Alpha` seul** (G6) | La ligne de commande est portée au bon à la main : l'encre paraît sur le papier pelure au moment où on l'écrit. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

**Une seule entrée, et c'est une décision.** ㉚ n'a ni lampe, ni voyant, ni liquide, ni pièce mobile.
Le seul événement de l'écran est l'écriture d'une ligne sur un bon. Si f2 veut honorer le titre de la
section, il faut d'abord **dessiner la conduite** ⇒ ce serait une demande à l'atelier, mais je ne la
formule pas : la fiction ne la demande pas (voir ci-dessus), et une demande sans source est une
invention.

---

## ㉛ La loi — **SANS MOUVEMENT**

Ce lieu, c'est le parloir : le prévenu derrière la vitre, et devant vous la liste de ce qu'il sait. —
Fiction : `front.md:1187-1188`, verbatim : « le **parloir** — le prévenu derrière la **vitre**, et
devant vous la liste de ce qu'il sait ».

**Trois raisons, cumulatives :**

1. **La matière n'est pas dessinée, et pas « incomplètement » : pas du tout.** `LoiScreenController.cs`
   n'appelle **aucun** `ProceduralUI.*` et ne crée **aucune** forme : uniquement des aplats de couleur
   et du texte. Le mot `parloir` n'y existe qu'en **chaîne de caractères** (`:219`, `:465`). Ni vitre,
   ni grille, ni prévenu. Les 6 cadres de la maquette (m-67..72) ne sont pas construits (en-tête `:20-29`).
2. **L'état qui justifierait une alerte n'est pas servi.** La fiction tient sur une horloge —
   `front.md:1189-1190` : « **LE PRÉVENU SAIT DES CHOSES, ET IL EN LÂCHE AU FIL DU TEMPS** … `items_leaked`
   grossit à chaque tick » — et `front.md:1192` : « *C'est le seul écran du corpus où NE RIEN FAIRE
   coûte quelque chose d'irréversible, jour après jour.* » Or `LegalCaseDto` est un **placeholder vide,
   sans un seul champ** (`LoiDtos.cs:49-55`), avec un commentaire qui interdit explicitement d'inventer
   `chargeSeverity` / `daysRemaining` / `leak` / `burn_risk_score` (`:43-48`). Le contrôleur ne lit que
   `activeCases.Length` (`:422`).
3. **La fiction interdit elle-même le compteur** : `front.md:1201-1202` — « L'écran **DÉCLARE le
   manque** : « *Le jeu ne vous donnera jamais de chiffre là-dessus. Vous n'aurez que ce signe, et il
   arrive quand il arrive. C'est voulu.* » » Un mouvement qui dirait le temps qui court trahirait ce
   ruling, et un compte à rebours est de toute façon interdit par le canon (P1/P4).

⇒ Animer un `surfaceRow` plat serait du décoratif sur un écran dont la fiction entière est un silence
volontaire. ⇒ demande **A6** (le parloir et sa vitre) si ㉛ doit être construit depuis ses 6 cadres.

---

## ㉜ Ce que vous avez confié — le tableau de service

Ce lieu, c'est un tableau de service : une plaque par charge, un cartel au nom de l'homme qui la
tient, et un jeton de laiton pour la décision du jour. — Fiction : `front.md:1162-1163`, verbatim :
« le **tableau de service** — une **plaque** par charge, à vous ou au nom d'un lieutenant » ; et
`front.md:1166` : « L'écran en fait un **jeton** visible qui s'éteint une fois dépensé ».

Réellement dessiné : le jeton = `ProceduralUI.RadialDisc` de **16 px CSS = 68,3 u = 58 px**, or
`#d9ab4e` si disponible / `#2a2320` si dépensé, cerclé d'un `ProceduralUI.Ring`
(`Operational/Delegation/DelegationScreenController.cs:1051-1075`) ; 4 plaques de charge, chacune avec
son `cro` — un **cartel vertical** de `9 × 20` px CSS = **38 × 85 u**, `OrSombre` si confiée,
`CroLibre` `#46515c` sinon (`:1129-1141`) ; 8 plaques grises de réserve (« rien derrière », `:1254`).
Défilement : `RectMask2D` `:979`, `ScrollRect` `:980`.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `service.jeton` | `JetonDisponible` (`:735`, dérivé de `JetonDeStructure.Connu`/`PlafondAtteint`, `:360-362`) : la décision de structure du jour n'est pas prise | le `Rond` du jeton (**58 px** de laiton) : `Teinte` **0,88 → 1,00 → 0,88**, **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 2,300 s` | Le tableau de service est éclairé par une seule lampe à abat-jour, et le laiton du jeton est le seul objet de la planche qui la rende : tant que la décision du jour n'est pas prise, on la voit bouger dessus. | `Alerte` | 1 | `Alerte` + `Teinte` ⇒ **conservé** : l'information (il reste une décision) doit survivre au mouvement réduit | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` | ⚠️ Hôte **sous le `RectMask2D`** (`:979`) et canal de **couleur** ⇒ compte dans le plafond de 6 et dépend du **spike E0** (design §3). Le jeton dépensé **ne bat pas** : `Detacher`, et retour au `Repos` (`#2a2320`) |
| `service.cartel` | `Confier` aboutit (`:534`) : `delegation_state` passe de `SELF` au nom d'un homme | le `cro` de la plaque (**38 × 85 u = 32 × 72 px**) : `Teinte` de `CroLibre` `#46515c` à `OrSombre`, **200 ms**, `ease-out` · le `TMP_Text` `Qui` (`:1164`) : `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`. Une fois | On glisse un cartel au nom de l'homme dans la fente de la plaque : le laiton remplace le vide, et le nom est écrit dessus. | `Transition` | 2 | durée 0 | `PROPOSÉ` · les deux couleurs de cartel sont **dans le code** (`:1131-1140`) | ⚠️ Sous le masque (canal de couleur) ⇒ même dépendance E0 |

---

## ㉝ Raser un site — la fiche et la parcelle libérée

Ce lieu, c'est une fiche cartonnée qu'on sort du tiroir, et la parcelle qui reste quand on a rasé. —
Fiction : `front.md:1139`, verbatim : « la **fiche cartonnée** du site, puis la **parcelle libérée** et
ses deux offres » ; et `front.md:1152-1154` : « La parcelle libérée ouvre DEUX offres classées
(`rank: 1|2`) et elles se **FERMENT** … *Ce n'est pas une liste qui patiente* : le dernier cadre montre
la meilleure déjà partie. »

Réellement dessiné, et bien : la `Fiche` en carton crème `#e9e4d4` avec son **dos brun** `#8c7a3f` de
`Px(5)` sur toute la hauteur (`Operational/Demolition/DemolitionScreenController.cs:673-688`), 4 filets
de séparation `Px(1)`, un bloc `Verdict` rouge `#8c2f36` quand le rapport est `poor` (`:731-752`), la
`Parcelle` en **cadre pointillé `Tiled`** (`:786-808`), et 2 offres portant chacune un disque de rang
de `Px(20)` = **85 u = 72 px** (`:926-936`) et un badge `Tag` (« LE MIEUX PLACÉ » / « AUTRE OPTION » /
**« DÉJÀ PRISE »**, `:966-984`). Défilement : `RectMask2D` `:1185`, `ScrollRect` `:1186` — 17 sites
mesurés sur le compte de démo (`:30-32`).

⛔ **Aucun tampon ici, ni dans la fiction ni dans le code** : les mots `tampon`/`tamponné` de front.md
appartiennent à ⑤, ⑨, ⑯ et ⑳ — **jamais à ㉝**. Les deux seules mentions portées sur la fiche sont
l'étiquette « FICHE DU SITE » (`:708`) et le bloc `Verdict`. Je n'en invente pas un troisième.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `demolition.fiche-sortie` | `OuvrirFiche(b)` (lancé `:529` et `:609`) : l'état passe à `Fiche` (`:88`, `:418-430`) | la `Fiche` : `TranslationX` **−51 u → 0** (= −43 px, soit la largeur de son dos ×2), `Alpha` 0,00 → 1,00. **200 ms**, `ease-out`, une fois | On ne lit pas une fiche sans la sortir du tiroir : elle glisse sur la table avant de s'arrêter devant vous. | `Transition` | 1 | durée 0 | `PROPOSÉ` | ⚠️ Canal de **transformation sous un `RectMask2D`** (`:1185`) : c'est **le cas qui décide E0** (design §3 — « pas de Canvas imbriqué sous un masque, et le canal de transformation y est plafonné à 6 pistes »). Si E0 refuse, l'entrée tombe en `Alpha` seul |
| `demolition.offre-fermee` | `fermee` (`:778`, `:843`) : une offre se ferme (`REPLACEMENT_OPTION_ALREADY_CLOSED`) et son `Tag` devient « DÉJÀ PRISE » en `TagFerme` `#8b6a6a` (`:967`, `:981`) | le `Tag` : `Teinte` 1,00 → 0,70, **200 ms**, `ease-in` · le disque de `Rang` (**72 px**) : `Teinte` d'`OrSombre` à `BlocBord`, **200 ms**, `ease-in`. Une fois | L'offre est partie : quelqu'un a barré la ligne au crayon gras avant vous, et le numéro perd sa dorure. | `Transition` | 2 | durée 0 | `PROPOSÉ` · les deux couleurs d'arrivée sont **dans le code** (`:929`, `:967`) | ⚠️ Sous le masque (canal de couleur) ⇒ même dépendance E0 |

---

## ㉞ Les ordres du soir — le carnet réglé

Ce lieu, c'est un carnet d'ordres ouvert sur la table, huit créneaux numérotés, et une plume. —
Fiction : `front.md:1113`, verbatim : « le **carnet d'ordres réglé** (créneaux numérotés), puis le fil
des quartiers et le calendrier » ; et `front.md:1115` : « **ON NE DONNE PAS UN ORDRE : ON COMPOSE UNE
SOIRÉE.** `POST /v1/cue-stack/compose` valide **4 à 8 créneaux** ».

⚠️ **Le « carnet réglé » est un rectangle plat.** Ce fichier ne contient que **6 sites de création
d'`Image`** (`Operational/Carnet/CarnetScreenController.cs:461`, `:576`, `:593`, `:638`, `:779`, `:807`) :
aucune page, aucune reliure, aucune spirale, **aucune ligne réglée**, aucun signet, aucun filet,
aucune pastille. Le carnet est **une seule `Image`** de couleur papier (`CouleurPapier` = `(0,898 ;
0,878 ; 0,816)`, `:616`, posée `:807`), et le « réglage » n'est suggéré que par le `spacing` de 1 px
CSS entre les créneaux (`:819`). Les 8 créneaux sont **toujours** dessinés (`:411-422`). Défilement :
**`RectMask2D` seul** (`:810`), aucun `ScrollRect` — le carnet **coupe**, il ne défile pas.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `carnet.encre` | un créneau passe de « — rien — » (`:745-746`) à un ordre posé (`Titre` + `Sous`, `:756-760`) — le composeur vient de l'écrire | les `TMP_Text` `Titre` (11 px CSS serif gras) et `Sous` (8 px CSS) de la ligne : `Alpha` 0,00 → 1,00, **220 ms**, `cubic-bezier(.3,.7,.2,1)`, une fois. **`Alpha` seul** (G6) | On écrit l'ordre sur la ligne : l'encre prend sur le papier le temps d'un trait de plume, elle n'est pas là avant le geste. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |
| `carnet.en-main` | `AppuiLong` sur une ligne (`:463-464` ; `Operational/Carnet/AppuiLong.cs:15-20`, `Duree = 0.5f` `:10`) | le fond de la ligne (`Image`, transparente au repos, `CouleurEnMain` `(0,851 ; 0,824 ; 0,741)` en main, `:461`) : `Alpha` 0,00 → 1,00 sur **500 ms**, `linear`, une fois ; maintenu tant que la ligne est en main ; retour à 0,00 en **120 ms** si le doigt part avant le seuil | On appuie sur la ligne pour la décoller du carnet : le papier marque sous le pouce avant de céder. | `Retour` | 1 | **PAS un gel** : même règle que `retour.appui-long` — la marque apparaît d'un coup au seuil, et l'alternative reste accessible | `PROPOSÉ` · la couleur d'arrivée est **dans le code** (`:461`, `:620`) | **Q2** (500 ms > 250 ms) et **Q12** : le client porte **deux** durées d'appui long, `1 000 ms` nommée (`ShellContracts/UiTimingTunables.cs:19`) et **`0.5f` en littéral** (`AppuiLong.cs:10`) — R2.3 « tunables jamais inline » |

⚠️ Une demande d'atelier existe ici, mais elle ne bloque rien : le carnet **n'a pas ses lignes réglées**
(⇒ **A8**). `carnet.encre` fonctionne sans elles.

---

## ㉙ Le conflit — la table du fond

Ce lieu, c'est la table du fond d'un bar : quatre familles, une fiche posée sur la nappe de papier, et
la salle derrière vous. — Fiction : `front.md:1307-1309`, verbatim : « la table du bar. Les quatre
familles sont les **auréoles** laissées par les verres, le plan se trace **sur une serviette**, et un
homme envoyé est une **allumette** ».

⛔ **Et l'écran construit n'est pas celui-là, délibérément.** `front.md:1275-1278` est le ruling qui a
tué cette lecture : « **J'AVAIS FAIT UN RÉBUS** » … « **Une matière est une PEAU, pas un CODE.** »
L'en-tête du contrôleur déclare implémenter la **v2** ratifiée (cartes nommées, portraits, issues
écrites — `Operational/Conflit/ConflitScreenController.cs:14`). ⇒ **Je ne propose NI l'allumette qu'on
frotte, NI l'encoche dans le bois, NI l'auréole de verre** : ce serait rouvrir le rébus que l'user a
refusé. Ce refus est une contrainte de ce catalogue, pas un oubli.

Réellement dessiné, et c'est une vraie trouvaille pour ce lot : **`SceneHaute`** — le fond de salle,
avec **7 `Silhouette_0..6`** (`Image` plates `#05080d`/`#070a10`, chacune posée à **±3°**,
`:1335-1346`), hors du défilement (le `RectMask2D` et le `ScrollRect` sont sur `Corps`, `:1219-1220`).
Plus : 4 rangées de famille à liseré de laiton `#8a6a22` quand choisie (`:714-721`), un écusson de
`26 × 30` px CSS par famille (`:811-838`), un badge « CE SOIR » en or (`:788-804`), la fiche papier
`#f2ece0` (`:937-941`), des portraits ronds (`:613-653`).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `conflit.salle` | en continu | les 7 `Silhouette_*` : `Alpha` **0,82 → 1,00 → 0,82** et `TranslationX` **−5 → +5 px CSS** (= ±21,3 u, soit une course de **36 px**), **période 11,000 s**, `ease-in-out`, **infini**, `PoseDeReposS = 5,500 s`. **Phases distinctes** : −1,2 / −3,6 / −5,9 / −7,4 / −9,1 / −2,7 / −6,3 s | Au fond de la salle, les gens ne sont pas des statues : ils se déplacent lentement entre les tables, et leurs silhouettes passent devant la lumière du bar. | `Ambiance` | **7** | figé à `PoseDeReposS` — chaque silhouette arrêtée à sa propre place, pas toutes alignées | `PROPOSÉ` | **Les phases distinctes sont justifiées ici, et nulle part ailleurs** : chaque silhouette est une personne différente. Partout où la cause est **une lampe**, la phase est commune (§0.5). C'est contrôlable ligne à ligne |
| `conflit.envoi` | `EnvoyerCeSoirEtRecharger` aboutit (`:322`) : la famille choisie reçoit son badge « CE SOIR » (`:788-804`) et son liseré passe en laiton (`:714-721`) | `BordChoisi` (liseré `#8a6a22`, trait `Px(1)` = **4,27 u = 3,6 px**) : `Teinte` 1,00 → 1,55 → 1,00, **220 ms** (`ease-out` puis `ease-in`) · `CeSoirCadre` : `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`. Une fois | L'ordre est parti : le cartel « CE SOIR » est posé sur la rangée de la famille, et le laiton du cadre prend la lumière une fois, le temps qu'on le pose. | `Transition` | 2 | durée 0 | `PROPOSÉ` | ⚠️ Les deux hôtes sont **sous le `RectMask2D`** (`:1219`) — canal de couleur ⇒ dépendance **E0**. `conflit.salle`, lui, est **hors masque** (`SceneHaute`, `:1322-1330`) : sa translation ne dépend pas d'E0 |

---

# III. Demandes à l'atelier — ce qu'il faut DESSINER

Classées par ce qu'elles débloquent. Chacune nomme l'entrée qui l'attend et la ligne de fiction qui la
réclame — aucune demande n'est formulée sans source.

| id | écran | ce qu'il faut dessiner | ce que ça débloque | la fiction qui le réclame |
|---|---|---|---|---|
| **A1** | ㉑ Marché | **la tuile ASH et sa grappe de prismes** : le monticule de poudre `#8a8474`, **4 prismes** de 14 unités de large sur 39 / 57 / 33 / 24 de haut, et **4 éclats** (la facette supérieure gauche de chacun, blanc à α 0,45) — la géométrie exacte est déjà écrite : `~/project/atelier3d-mafia/generateur-marche.py:288-295` | **`mk-eclat`**, le seul `@keyframes` de la série 6 **sans hôte** : `0%,72%,100%{opacity:.16} 82%{opacity:.85}`, `5.2s ease-in-out infinite`, délais **−4,2 / −1,3 / −2,6 / −3,9 s** (`generateur-marche.py:115`, `:201-204`) — un scintillement bref (≈1,46 s actif sur 5,2 s), les quatre éclats à tour de rôle | `front.md:1715-1720` : « **LA MARCHANDISE REMPLACE LE PERSONNAGE** … ash→labo spécialisé, canal de luxe (**poudre → prismes**) » ; `inventaire-animations.md:69` : « **`mk-eclat` RESTE** (hôte = grappe de prismes de la tuile Ash du marché … qu'aucun cadre ne montre) » |
| **A2** | ⑭ La semaine | **le manomètre de « la ville serre »** : une face, un arc, une aiguille et son pivot. La géométrie existe déjà dans le chrome et se réutilise telle quelle — `Shell/TopBarController.cs:1315-1327` (face), `:1387` + `:1609-1625` (arcs `ProceduralUI.ArcCuit`), `:1515-1524` (aiguille, pivot `(0.5, 0)`), `:1526-1535` (pivot) | **`semaine.aiguille`** (§II.⑭) — et avec elle la paire d'inventaire **B10** | `front.md:1557` : « la ville serre (**manomètre** = `stress_bucket`… ) ». ⚠️ Écart mesuré : `stress_bucket` est aujourd'hui rendu **en texte** (`CompressionScreenController.cs:194-204`, `:461-471`) |
| **A3** | ㉓ La vitrine | **la vitre du comptoir, sa bande de reflet et sa fenêtre de découpe** : une bande oblique claire de ≈60 u de large, et un masque qui l'empêche de sortir du comptoir | **`vitrine.reflet`** (§II.㉓) | `front.md:1861` : « comptoir de laiton, **vitre avec ses reflets**, étagères de velours » |
| **A4** | ㉘ La distribution | **la photo punaisée du coursier pris**, épinglée par **un seul coin** (c'est le coin unique qui rend le battement possible) | **`distribution.photo`** (§II.㉘) | `front.md:1249` : « **Le cadre qui vaut l'écran : un coursier s'est fait prendre. Sa photo est punaisée, la ficelle pend derrière.** » |
| **A5** | ⑲ Les réglages | **une ligne « Mouvement réduit »** — rien à dessiner : le gabarit de bascule existe (`Account/Settings/SettingsScreenController.cs:220-259`), il faut une ligne de plus dans la section « Le jeu ». Le canon donne jusqu'au libellé : i18n `settings.a11y.reduced_motion` → FR « **Mouvement réduit** » (`screen_14:208`), rôle `switch` (`:298`), défaut **Off** (`:71`). Et il en veut **un second** : `settings.game.disable_autoplay` (`:78`, `:212`) | **tout le §4 du design** : sans ce bouton, `PolitiqueMouvement` n'a qu'une source (le réglage Android), et aucune sur iOS | `screen_14:71`, `:146`, `:251` ⇒ **Q4** |
| **A6** | ㉛ La loi | **le parloir** : la vitre, le prévenu derrière, la liste devant. 6 cadres de maquette existent (m-67..72), **0 est construit** | ㉛ sort de « sans mouvement » ; aucune entrée ne l'attend aujourd'hui | `front.md:1187-1188` ; le contrôleur ne crée **aucune forme** (`LoiScreenController.cs`, 0 appel à `ProceduralUI`) |
| **A7** | ㉒ Votre profil | **la molette de laiton, les leviers, les plaques de compteur frappées** de la porte de coffre | ㉒ sort de « sans mouvement » | `front.md:1821-1822` |
| **A8** | ㉞ Les ordres du soir | **les lignes réglées du carnet** (et sa reliure) : aujourd'hui le carnet est **une seule `Image` plate** (`CarnetScreenController.cs:807`) | rien — `carnet.encre` fonctionne sans ; c'est une dette de DA, pas un blocage | `front.md:1113` : « le **carnet d'ordres réglé** (créneaux numérotés) » |
| **A9** | ㉟ ㊱ ㊲ ㊳ ㊴ ㊵ | **vérifier, et dessiner si absente, la barre de balayage et sa piste masquée** : barre de **2 px**, `linear-gradient(90deg, transparent, #7fd4d9, transparent)`, course `translateY(−6px → 184px)` (`generateur-marche.py:117-118`, `:151-153`) | les **6 paires `*6-scan`** de l'inventaire : 7,500 s `linear infinite`, délai **−2,600 s** (mesuré sur 34 instances) | `inventaire-animations.md:37-42`. ⚠️ Les 6 écrans sont **montés**, mais la présence de l'hôte **n'a pas été vérifiée dans ce lot** — je ne l'affirme ni ne la nie. ⇒ **Q10** sur la cause |

**9 demandes. 3 débloquent une entrée de ce catalogue (A2, A3, A4), 1 débloque le §4 du design (A5),
1 débloque une animation d'inventaire sans hôte (A1), 1 en débloque six (A9), et 3 sont des dettes de
DA qui ne bloquent rien (A6, A7, A8).**

---

# IV. Questions pour f2 et pour l'user — avec ma recommandation

Ordonnées par ce que la réponse change : les quatre premières touchent le **mécanisme** (le design
doit bouger) ; les suivantes touchent une **valeur** ou un **périmètre**.

### Q1 — Une entrée peut-elle servir plusieurs écrans ?

`Entree.Ecran` est un `string` singulier (design §1 : « `string Ecran (sym ①…㊵)` »). **8 de mes 42
entrées sont transverses** (2 sur le geste d'appui, 3 sur le shell, 2 sur le décor de comptoir, 1 sur
la bascule). Les dupliquer donnerait 8 → 19 lignes pour **8 mécanismes**, et 11 `Id` à maintenir en
parallèle.
> **Reco** : `Ecran` accepte une liste (ou `"*"`), et **G4 (budget) compte par écran RÉSOLU**, jamais
> par chaîne. Sinon la garde de budget ne voit pas les pistes des entrées transverses.

### Q2 — Le 5ᵉ genre, ou le drapeau `Bloquante` ?

G8 rougit dès qu'un `Retour`/`Transition` dépasse 250 ms. **Quatre mouvements du périmètre dépassent,
et aucun ne bloque l'entrée** :

| mouvement | durée | d'où vient la durée |
|---|---|---|
| `retour.appui-long` | **1 000 ms** | `UiTimingTunables.DestructiveLongpressMs` (`:19`), lui-même `T.ui.destructive_longpress_ms` du canon |
| `carnet.en-main` | **500 ms** | `Operational/Carnet/AppuiLong.cs:10` (littéral) |
| `semaine.aiguille` | **700 ms** | la maquette, mesurée (`inventaire-animations.md:62`) |
| `bandeau.sortie` | **400 ms** | le code en place (`BandeauEphemere.cs:296-299`) |

Et le canon ne plafonne que la durée **bloquante** : « Durée max **bloquante** : `T.ui.anim_max_block_ms`
= 250 ms » (`global_conventions_core.md:124`), complété par « **Toutes les transitions sont
interruptibles** » (`:125`) et « Jamais de transition qui **bloque l'input** » (`:126`).
> **Reco** : ajouter `bool Bloquante` à `Entree` ; **G8 lit « `Bloquante` ET > 250 ms »** ; et le
> dégradé réduit d'un **remplissage fonctionnel** suit le canon — indicateur statique + compteur
> textuel de secondes (`screen_2a:314`, `screen_13:308`), **jamais un gel**. Geler l'arc d'un appui
> long destructif supprimerait le seul signal d'une action irréversible : ce serait un défaut d'a11y
> créé par la garde d'a11y.

### Q3 — `Propriete` n'a aucun puits pour un paramètre de graphe sur mesure

`DistributionFicelleGraphic.DefinirTrace(..., amplitude:)` (`DistributionScreenController.cs:518-523`)
est le paramètre qui porte **toute** la fiction de ㉘ (« LA GÉOGRAPHIE EST DESSINÉE, JAMAIS ÉCRITE »,
`front.md:1242`). Aucun membre de `Propriete` ne l'atteint : `Fonction` est une **source** de valeur
(design §1), pas un puits ; `Teinte` et `Remplissage` écrivent un `Graphic`, pas un champ.
> **Reco** : `Propriete.Parametre` + `interface IParametreAnime { void PoserParametre(int canal,
> float v); }` que le graphe implémente — **un seul point d'extension**, testable sans Unity (un faux
> implémenteur sous `[Test]`), et déjà couvert par la garde G7 (aucune réflexion). Si la réponse est
> non, **`distribution.ficelle-tendue` sort du catalogue** et ㉘ n'a plus qu'une entrée différée.

### Q4 — Le réglage de mouvement réduit : le design pose une question que le canon a déjà tranchée

Le design §4 la laisse ouverte (« **Question produit à f2** : (b) ajoute une ligne à ⑲ … ; alternative :
(a) seul »). Mais le canon l'a écrite, avec son libellé, son rôle ARIA, son défaut et sa route :
`screen_14:71` (« Reduced motion `[ ] Off` »), `:146` (« `reduced_motion = true` → coupe toutes les
transitions `Animator` non-critiques »), `:208` (i18n `settings.a11y.reduced_motion` → « Mouvement
réduit »), `:251` (« bascule **immédiat** … `PATCH /v1/me/settings` »), `:298` (rôle `switch`). Et il
en demande **un second** : `settings.game.disable_autoplay` (`:78`, `:212`).
> **Reco** : ce n'est pas un arbitrage produit, c'est un **REUSE** ⇒ livrer la ligne dans ⑲ sur le
> gabarit existant (demande A5). ⚠️ **Mais la persistance est un trou BACK** : il n'existe
> **aucun `GET /v1/me/settings`** (`Account/Settings/SettingsClient.cs:33`), et ⑲ relit ses
> préférences via `GET /v1/me` (`:114-115`) — `reduced_motion` n'y est pas servi.
> ⇒ **`PlayerPrefs` en attendant** (précédents du dépôt : `Shell/CycleDeSession.cs:161-182`,
> `Shell/CompteDeLAppareil.cs:41-44`), **consigné comme différé**, et le serveur comme un lot back —
> pas comme un choix d'architecture client.

### Q5 — G5 (période ≥ 0,4 s) contre le canon de ③

`screen_2_city_map.md:434` demande un flash d'`AuditPin` « **toutes les `T.ui.anim_max_block_ms`** »,
soit une période de **250 ms = 4 Hz**. G5 plafonne à 3 variations par seconde (période ≥ 0,4 s). C'est
le **seul endroit du canon** où ce tunable sert de *période* au lieu de *plafond*.
> **Reco** : garder G5 (c'est un plancher de confort et de photosensibilité) et lire le « toutes les
> 250 ms » comme un **mésusage** du plafond. ③ est hors de ce lot : rien n'est bloqué aujourd'hui,
> mais la contradiction doit être consignée **avant E3**, sinon elle sera tranchée par accident au
> moment de coder ①/③.

### Q6 — L'échelle 0,97 du retour d'appui sur un bouton plein écran

**10 des 15 sites `Transition.None` sont des cartes, des rangées ou des panneaux entiers** : la racine
de `HighestLeverageCard` (`Shell/HighestLeverageCardController.cs:343`), toute la surface du bandeau
(`BandeauEphemere.cs:253`), une rangée de lieutenant (`LieutenantScreenController.cs:2732`), un slot
d'équipe (`:2839`), le CTA « Recruter » (`:2880`), une plaque de ㉜ (`DelegationScreenController.cs:1534`),
un bloc de ㉝ (`DemolitionScreenController.cs:1460`), une cellule de bâtiment et la tête de fiche de ①
(`DistrictInteriorScreenController.cs:692`, `:2129`), le texte d'état vide de ⑯
(`DailyReviewScreenController.cs:1102`). Un −3 % sur une feuille de 560 u déplace son bord de **8,4 u
= 7,1 px** : l'écran entier a l'air de sauter sous le doigt.
> **Reco** : `Echelle` seulement si la plus grande dimension du bouton ≤ **1/3 du cadre** ; au-delà,
> **`Teinte` seule** — ce qui est exactement le dégradé réduit déjà écrit au §4 du design, donc zéro
> code en plus. (Note : `ReputationScreenController.cs:994` n'est pas un bouton mais une
> **`Scrollbar`** : il sort de la liste des 15 pour le retour d'appui, et doit rejoindre les
> exclusions nommées de G9.)

### Q7 — L'ère : la décision O est toujours ouverte, et tout ce catalogue repose dessus

`front.md:343` porte encore « **⛔ à trancher — impacte toute la DA** ». Le ruling du 26/08 dit « dans
ma tête on est dans les mêmes années que *The Wire* » (2000s) et **recommande de retraduire les
matières 1930** (`front.md:351` : « Les matières 1930 que j'ai dessinées (registre à plume, feutrine,
**laiton**, chaufferie, télégramme) tirent vers le pulp d'époque que le canon interdit »). Le brief de
ce catalogue (07/10) pose « **fin 80s – début 90s** » et nomme **laiton, bakélite, voyants de standard
téléphonique**.
> **Reco** : **la fin des années 80 réconcilie les deux**, et c'est pour cela qu'elle doit être
> consignée. Un commissariat de 1988 a du laiton au comptoir, de la bakélite aux boutons, un standard
> à voyants et un bar enfumé — sans glisser vers le pulp que `tone_bible.md` interdit (« Not Scarface,
> Not Godfather »), et sans contredire `art_direction.md:1` (« Brennar **industrial noir-adjacent** »).
> ⇒ **écrire « fin 80s – début 90s » dans front.md §O et clore la décision.** Les 42 entrées de ce
> fichier reposent sur cette réponse : la lampe à abat-jour, le laiton du plateau, les voyants de
> dispatch et le bippeur de ㉔ n'ont pas le même sens dans les trois ères.

### Q8 — Quel rapport « traîne » ? (㉔)

`report.backlog_age_cycles` est servi (`AutonomyDtos.cs:26`) et affiché (`:285`), mais **aucun seuil
n'est servi**. La fiction dit seulement « **un rapport qui traîne** » (`front.md:1594`).
> **Reco** : **le plus vieux seulement**, quel que soit son âge. Un standard n'allume pas douze
> voyants : s'il y a trois rapports, c'est le plus vieux qui appelle, et il cesse quand on l'a traité.
> Pas de seuil ⇒ pas de nombre inventé (R2.2), et la garde est triviale : exactement 1 piste.

### Q9 — La frappe du tampon de ⑤ est-elle jouable ?

`decision.cachet` dure 180 ms, mais le geste **referme l'écran** (`ResoudreLeChoix`,
`DecisionDetailScreenController.cs:429`).
> **Reco** : ordonner la fermeture **après** les 180 ms, non bloquant. Si f2 refuse de toucher à
> l'ordonnancement, **retirer l'entrée** : une transition qu'on ne voit jamais est une dette, pas une
> animation. Le même examen vaut pour `revue.cachet` (⑯), qui n'a pas ce problème (l'écran reste).

### Q10 — La cause diégétique du balayage `*6-scan` (6 paires)

L'inventaire la marque « **cause diégétique À CONFIRMER (écran de contrôle ?)** » sur les six lignes
(`inventaire-animations.md:37-42`). Mesuré : 7,500 s, `linear`, délai −2,600 s, barre cyan de 2 px.
> **Reco** : la seule cause honnête est **un tube** — un moniteur à balayage lent, au poste de
> contrôle. Si f2 refuse l'écran cathodique dans ces six fictions (㊳ « ce qui se dit ce matin », ㊴
> « ce qu'ils ont sur vous » : ce sont des **papiers**, pas des terminaux), alors **les 6 paires
> sortent du catalogue** au lieu d'être expliquées après coup. G1 exige une `Cause` ≥ 20 caractères
> non « TODO » : « écran de contrôle ? » ne la satisfait pas.

### Q11 — La durée du bandeau (5,000 s + 0,400 s) est-elle ratifiée ?

Le code le dit lui-même : « le canon n'en donne aucune ; l'atelier propose **5 s, ou jusqu'au
toucher** — prise telle quelle, **à ratifier au rendu** » (`BandeauEphemere.cs:157-158`).
> **Reco** : ratifier **5,000 s de tenue + 0,400 s de fondu linéaire** tel quel — c'est mesuré, c'est
> en place, et ça marche — et le déclarer **non bloquant** (Q2). Les deux nombres rejoignent alors
> `UiTimingTunables` sous les noms `Mouvement…` annoncés par `design-couche-mouvement.md:68`
> (« Toutes les constantes de ce tableau vivent dans `UiTimingTunables` … nommées `Mouvement…` »).
> ⚠️ Vérifié : **aucune constante `Mouvement*` n'existe aujourd'hui** dans `ShellContracts/`, et
> `AnimMaxBlockMs` (250) n'a **aucun consommateur** dans tout `Assets/Scripts` — seul
> `DestructiveLongpressMs` est lu (`LongPressButton.cs:18`).

### Q12 — Deux durées d'appui long dans le même client

**1 000 ms** nommée (`ShellContracts/UiTimingTunables.cs:19`) et **`0.5f` en littéral**
(`Operational/Carnet/AppuiLong.cs:10`). R2.3 : « tunables jamais inline ».
> **Reco** : 500 ms est **défendable** (déplacer une ligne de carnet n'est pas une action destructive,
> et le canon ne réserve le 1 000 ms qu'aux gestes destructifs,
> `global_conventions_core.md:136`) — mais pas en littéral. ⇒ `UiTimingTunables.AppuiLongDeplacementMs
> = 500`, et `AppuiLong` le lit. Une ligne, et la garde G7 (grep des motifs interdits) peut la voir.

---

# V. Récapitulatif — écran × entrées × pistes × genres, avec somme de contrôle

**Lecture** : « entrées » = les entrées **attachées** à cet écran, y compris les transverses de §II.0
(une entrée transverse est comptée sur **chaque** écran qu'elle sert). « pistes » = la somme des
`Entree.Pistes` sur cet écran, c'est-à-dire ce que G4 mesure. Les deux dernières lignes du tableau
donnent les deux totaux, et leur écart est la somme de contrôle.

| écran | entrées | pistes | Alerte | Ambiance | Retour | Transition | ≤ 16 ? |
|---|---:|---:|---:|---:|---:|---:|:---:|
| ④ Accueil | 2 | 2 | 1 | 0 | 0 | 1 | ✔ |
| ⑤ Décision du jour | 3 | 3 | 1 | 0 | 0 | 2 | ✔ |
| ⑥ La Famille (⑦ ⑧ ⑳ = ses sections) | 2 | 2 | 0 | 1 | 0 | 1 | ✔ |
| ⑨ Exception Queue | 4 | 4 | 0 | 2 | 0 | 2 | ✔ |
| ⑩ Exception Detail | 3 | 6 | 0 | 1 | 0 | 2 | ✔ |
| ⑭ La semaine | 2 | 2 | 0 | 0 | 0 | 2 | ✔ |
| ⑮ Les inspections | 2 | 7 | 1 | 0 | 0 | 1 | ✔ |
| ⑯ Revue du jour | 4 | 5 | 0 | 2 | 0 | 2 | ✔ |
| ⑰ Le commissariat | 1 | 1 | 0 | 0 | 0 | 1 | ✔ |
| ⑲ Les réglages | 1 | 2 | 0 | 0 | 0 | 1 | ✔ |
| ㉒ Votre profil | **0** | **0** | 0 | 0 | 0 | 0 | ✔ |
| ㉓ La vitrine | 2 | 3 | 0 | 1 | 0 | 1 | ✔ |
| ㉔ Les rapports d'autonomie | 2 | 3 | 1 | 0 | 0 | 1 | ✔ |
| ㉕ La première fois | 2 | 3 | 0 | 0 | 0 | 2 | ✔ |
| ㉘ La distribution | 2 | 2 | 0 | 1 | 0 | 1 | ✔ |
| ㉚ La chaîne d'appro | 1 | 1 | 0 | 0 | 0 | 1 | ✔ |
| ㉛ La loi | **0** | **0** | 0 | 0 | 0 | 0 | ✔ |
| ㉜ Ce que vous avez confié | 2 | 3 | 1 | 0 | 0 | 1 | ✔ |
| ㉝ Raser un site | 2 | 3 | 0 | 0 | 0 | 2 | ✔ |
| ㉞ Les ordres du soir | 2 | 2 | 0 | 0 | 1 | 1 | ✔ |
| ㉙ Le conflit | 2 | **9** | 0 | 1 | 0 | 1 | ✔ |
| `*` transverses (geste, shell, bandeau) | 5 | 5 | 0 | 0 | 2 | 3 | ✔ |
| **Σ par attachement** | **46** | **68** | **5** | **9** | **3** | **29** | max = 9 |
| **Σ par entrée distincte** | **42** | **63** | **5** | **6** | **3** | **28** | — |
| **écart = attachements en double** | **+4** | **+5** | 0 | **+3** | 0 | **+1** | — |

### Les trois sommes de contrôle

**1. Les entrées.** Σ par attachement (46) − entrées distinctes (42) = **+4**, et ces 4 sont nommés :
`comptoir.lampe` sert **3** écrans (⑨ ⑩ ⑯) ⇒ +2 · `comptoir.bouteilles` sert **2** écrans (⑨ ⑯) ⇒ +1 ·
`bascule.course` sert **2** écrans (⑲ ㉕) ⇒ +1. **2 + 1 + 1 = 4** ✔

**2. Les pistes.** Σ par attachement (68) − Σ par entrée (63) = **+5** : `comptoir.lampe` (+2 écrans
× 1 piste = 2) · `comptoir.bouteilles` (+1 × 1 = 1) · `bascule.course` (+1 × **2** pistes = 2).
**2 + 1 + 2 = 5** ✔

**3. Les genres.** Par entrée distincte : **5 + 6 + 3 + 28 = 42** ✔ (= le total des entrées).
Par attachement : **5 + 9 + 3 + 29 = 46** ✔ (= le total des attachements). Et l'écart par genre se
rattache aux mêmes 4 doublons : Ambiance +3 (les deux entrées de comptoir) et Transition +1
(`bascule.course`) ⇒ **+4** ✔

### Ce que ces nombres disent

- **28 des 42 entrées sont des `Transition`** (67 %) : le catalogue fait répondre les écrans, il ne les
  fait pas remuer (§0.1). **6 `Ambiance`** seulement, toutes sur une matière réellement dessinée ou
  explicitement demandée à l'atelier.
- **Pire écran : ㉙ à 9 pistes** (7 pour les silhouettes de la salle), soit **56 % du budget de 16**.
  Tous les autres sont ≤ 7.
- **Pire cas simultané dans tout le client** : ㉙ (9) + les 3 `Alerte` du chrome en descente (design
  §8) + 3 transverses = **15 pistes sur `MaxPistes` = 48**. La couche de mouvement n'approche jamais
  son plafond avec ce catalogue — le plafond protège contre ce qui viendra après (E5, les 202 pivots
  de feuilles de la serre).
- **Cadence** : les 6 `Ambiance` et les 5 `Alerte` tournent en régime ⇒ 11 pistes au plus en
  permanence, dont 6 à 30 Hz (`Ambiance`, design §3). Les 28 `Transition` et 3 `Retour` ne consomment
  rien hors du geste.
- **4 entrées ne sont pas câblables aujourd'hui** : `semaine.aiguille` (A2), `vitrine.reflet` (A3),
  `distribution.photo` (A4), `distribution.ficelle-tendue` (Q3). **38 le sont.**
- **5 entrées posent un canal de transformation ou de couleur sous un `RectMask2D`** et attendent le
  verdict du **spike E0** : `famille.lampe-du-don` (⑥), `service.jeton` et `service.cartel` (㉜),
  `demolition.fiche-sortie` et `demolition.offre-fermee` (㉝). Aucune ne dépasse 6 par écran. Celle
  qui décide est `demolition.fiche-sortie` : c'est la seule **translation** sous un masque.

---

# VI. Le reste du périmètre

## VI.1 Les écrans sans mouvement, et pourquoi

Restreindre est une décision de design : chacune de ces lignes est argumentée au §II de l'écran, pas
simplement omise.

| écran | état | la raison, en une ligne |
|---|---|---|
| **㉒ Votre profil** | **sans mouvement** (0 entrée) | Maquette déclarée **STATIQUE** (`front.md:1820`) · la matière qui pourrait vivre (molette de laiton, leviers, plaques frappées, `front.md:1821-1822`) **n'est pas dessinée** · **0 `Button`** dans le fichier, donc même le retour d'appui ne s'y applique pas · aucun état ne change pendant qu'on le regarde. ⇒ A7 |
| **㉛ La loi** | **sans mouvement** (0 entrée) | Le parloir et sa vitre **ne sont pas construits** (0 forme, 0 `ProceduralUI` dans `LoiScreenController.cs`) · l'état qui justifierait une alerte **n'est pas servi** (`LegalCaseDto` est un placeholder vide, `LoiDtos.cs:49-55`, avec interdiction écrite d'inventer ses champs) · et la fiction **interdit elle-même** de montrer le temps qui court (`front.md:1201-1202`). ⇒ A6 |
| ⑰ Le commissariat | **1 entrée** | Pas de lampe, pas de device, 9 textes : le seul moment où quelque chose se passe est l'escalade d'un cran, et c'est elle qui est animée |
| ㉚ La chaîne d'appro | **1 entrée** | Ni lampe, ni voyant, ni pièce mobile ; le seul événement est l'écriture d'une ligne sur le bon. Le « manomètre » du titre n'est **ni dans la fiction ni dans le code** (§II.㉚) |
| ⑲ Les réglages | **1 entrée, partagée** | La bascule est le seul objet à course de l'écran ; le reste est du texte dans des contours de 3,6 px |

## VI.2 Les trois règles générales que `coder` devra appliquer (et qu'un reviewer peut vérifier)

Elles ne sont pas des entrées : elles sont les conditions pour que les entrées marchent. Chacune sort
d'un fait mesuré, pas d'une préférence.

1. **Une `Transition` est déclenchée par le GESTE, jamais par une comparaison d'états.**
   **Sept** contrôleurs du périmètre **détruisent tous leurs enfants à chaque rendu** :
   `SettingsScreenController.cs:155-156` · `ProfileScreenController.cs:140-141` ·
   `ShopScreenController.cs:171-172` · `AutonomyInboxController.cs:463-469` ·
   `TutorialScreenController.cs:227-228` · `DelegationScreenController.cs` (`EtatCourant` rebâti) ·
   `CarnetScreenController.cs:480-485`. Un diff « avant/après » est donc impossible : l'objet d'avant
   n'existe plus. Mais le contrôleur **sait quel geste il vient d'envoyer** (`sku_id` acheté,
   `issue` répondue, `block_id` rasé…) ⇒ il attache l'entrée au rendu **qui suit**, sur la cible
   nommée. C'est la règle, et elle est testable : une entrée attachée sans geste préalable est un bug.
2. **La sortie d'un écran n'est pas animée.** `UnmountCurrentTenant` détruit l'ancien locataire **de
   façon synchrone** et vide tout `ContentSlot` (`AppShell.cs:1858-1863`). Animer une sortie
   demanderait de garder l'ancienne racine vivante pendant 160 ms — une retouche du shell, hors de ce
   catalogue. ⇒ `shell.entree` anime **l'entrée seule**.
3. **Aucune animation au premier montage de la session.** `global_conventions_core.md:126` : « pas
   d'animation sur chemin critique cold-open » (F4), et `:150` : « `SplitFlapReadout` interdit sur le
   chemin critique de premier rendu ». L'exclusion est une garde, pas un réglage.

## VI.3 Hors périmètre, et pourquoi (pour qu'on ne les cherche pas)

| écran | pourquoi il n'est pas ici |
|---|---|
| ① Intérieur de district · ② Fiche bâtiment · ③ Carte | couverts par l'inventaire (§I.3) et par **E3**/**E5** du design |
| ㉟ ㊱ ㊲ ㊳ ㊴ ㊵ | couverts par l'inventaire : les 6 paires `*6-scan` (§I.3, demande A9, question Q10) |
| ㉑ Marché | **maquette ratifiée et ANIMÉE, zéro ligne de code** (`front.md:1683`) — aucun contrôleur `Market` n'existe. Ses 4 paires restent à l'inventaire ; `mk-eclat` attend A1 |
| **⑪ Le coffre / Pipeline** | ⚠️ **`LaunderingController` n'existe pas** : seuls `Operational/Laundering/LaunderingDtos.cs` et `LaunderingClient.cs` sont là. `AppShell.cs:294` monte `FiliereScreenController` sur `Tab.Pipeline` (« ㊵ porte la filière (ruling de f2, 2026-09-23) ; **⑪ et ⑫ sortent du chemin joueur** »). ⇒ **`INDEX.md:15` et `:47` sont périmés sur cette ligne** (générés le 2026-09-22, la veille du ruling) |
| ⑦ Lieutenant Detail · ⑧ Rule Editor · ⑳ Recrutement | **ce ne sont pas des écrans** : des sections de `LieutenantScreenController` (`front.md:1400` → `:177` · `front.md:1421` → `:186` · `front.md:1441` → `:117`, `:173`). ⑳ est en outre **mis de côté par l'user** le 2026-08-26 (arbitrage **M**, recrutement par promotion, `front.md:1444`) ⇒ rien avant l'arbitrage |
| ⑬ Pile du jour | **ni construit ni monté** (`front.md:1544` : « `[ ]` construit · `[ ]` monté »), **mis de côté par l'user** le 2026-08-26 (arbitrage **N**) |
| ⑱ Plus | couvert par `shell.entree` : c'est une liste défilante plein cadre montée dans le même `ContentSlot` (`AppShell.cs:1328-1418`), sans matière propre. Le canon ne lui donne qu'une « transition push/pop » (`screen_12:223`) |

---

# VII. Ce qu'il faut faire de ce fichier

1. **f2** répond aux 12 questions du §IV. Quatre d'entre elles (Q1, Q2, Q3, Q4) **modifient le design**
   avant E1 : un champ `Bloquante`, un `Ecran` pluriel, un `Propriete.Parametre`, et une question
   produit qui n'en est pas une.
2. **l'user** tranche **Q7** (l'ère — tout le vocabulaire de matière en dépend) et **Q10** (la cause du
   balayage, qui décide si 6 paires restent au catalogue).
3. **l'atelier** prend les 9 demandes du §III ; **A5** (la ligne de ⑲) et **A2** (le manomètre de ⑭)
   sont les deux qui débloquent le plus.
4. **ensuite seulement** : `coder` écrit E1 avec un `Catalogue` de **86 lignes** (42 d'ici + 44 de
   l'inventaire), dont **48 câblables** — et les gardes G1 à G9 peuvent être vertes le premier jour,
   parce que chaque ligne porte déjà sa `Cause`, sa `Source`, son `Ecran`, son budget et son dégradé.

**Aucune ligne de ce fichier n'est une décision.** Je propose ; f2 et l'user valident ; et le juge ⊥
qui relira ceci n'a pas besoin de me faire confiance : chaque nombre porte son ancre.
