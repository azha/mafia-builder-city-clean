# Catalogue des mouvements diégétiques — écrans montés du client Unity (CLIENT-3, 07-08/10/2026) — v4

> **v4 (08/10)** : réponse à la revue ⊥ n°3 (NON APPROUVÉ : 8 BLOCKING, 6 MAJOR, 9 mineurs ; comptes de la v3 vérifiés justes). Table en §X. Trois lignes de plus retirées ou réduites parce que leurs deux bouts sont le même état dans le code (`accueil.carte-suivante`, l'`Objet` de ㉓, la moitié sortante de ㉕) ; `conflit.envoi` recalé sur le CHOIX de la famille ; les cachets perdent leur échelle (G11) ; la cible du retour d'appui suit un prédicat « rend » calculable et une surface nommée (design v4.4 §17) ; G11 a son prédicat exact ; §I.4 et §V sont désormais CALCULÉS l'un de l'autre.

> **v3 (08/10)** : réponse à la revue ⊥ n°2 (NON APPROUVÉ : 6 BLOCKING, 6 MAJOR, 8 mineurs ; les 7 BLOCKING de la n°1 vérifiés fermés). Table de traitement en §IX. Les cibles des `Melange` sont désormais MESURÉES (`retour.appui` choisit un `Graphic` qui rend, sinon `retour.appui-voile`) ; `main.levee` et le disque de `demolition.offre-fermee` sont retirés (aucun des deux ne bouge dans le code) ; G11 est appliquée dans ses deux moitiés (§I.2.9).

> **v2 (08/10)** : réponse à la revue ⊥ n°1 (NON APPROUVÉ : 7 BLOCKING, 17 MAJOR, 12 mineurs). Table de traitement en §VIII. Le canal `Teinte` n'existait pas dans le modèle : il est remplacé partout par `Melange` (avec `CouleurA`/`CouleurB` déclarées) ou par `Alpha` ; trois translations sous `LayoutGroup` sont retirées (G11) ; les signes de ⑩ sont en repère Unity ; les `PoseDeReposS` sont hors de l'identité (G3) ; chaque `Entree` est déclarée champ par champ en **§I.4**.

Statut : **PROPOSITION**. Rien n'est tranché ici. f2 puis l'user valident ; l'atelier dessine ce qui
doit l'être (§III) ; `coder` n'écrit rien avant. Ce fichier est la table `Catalogue` du design
(`design-couche-mouvement.md` **v4.2** §2 : `Entree { Id, Ecrans[], Source, Cause, Genre, MouvementDefini, Pistes, Bloquante, Hote }` ; le dégradé réduit suit la règle par genre du §5 du design ; les entrées sans hôte dans le client portent `Hote = SansHote:<raison>` ; gardes G1-G13)
rendue en prose : **une ligne de tableau = une `Entree` par cible** (une ligne qui nomme plusieurs cibles aux canaux différents porte plusieurs `Entree` d'Id `ligne/cible`, §I.1), et rien de ce fichier ne vit hors de ce modèle. La projection exacte, champ par champ, est la table **§I.4**.

Entrées lues : `design-couche-mouvement.md` (v4.2 : modèle §2, régie §3, plafonds §4, mouvement réduit §5,
seuils §6.2, gardes G1-G13 §10) · `inventaire-animations.md` (les 40 paires de maquette (44 à la rédaction, recalé le 08/10 : −6 balayages retirés, +1 `mk-eclat` désormais hébergé, +1 B11 l'aiguille de ⑭) : **référencées, jamais redéfinies**) ·
`Tools/juge-visuel/INDEX.md` (les 35 écrans ; **25** contrôleurs montés par `AppShell`, `INDEX.md:47`) · `~/project/mafia-clean-city/front.md`
(la fiction, écran par écran) · le canon `docs/tech/08_ui_screens/` (25 fichiers — il spécifie déjà du
mouvement : §0.2) · les contrôleurs montés eux-mêmes (ce qui existe RÉELLEMENT à l'écran).

Rulings qui cadrent : 27/08 soir, user — « animé le truc, tout en restant dans un univers dark/mafieux »,
animations **DIÉGÉTIQUES** seulement ; 07/10, user — « il y a 0 animation » ; 07/10, f2 — l'ÈRE est **2000-2010** (tranchée par l'user le 02/09, mémoire « DA silhouettes contemporaines » ; canon gdd/02 §Forbidden et gdd/01 « Not Scarface »), ton sombre / mafieux ; vocabulaire de matière : lampe de bureau, néon, écran LCD ou cathodique de fin de vie, pager, téléphone à clapet — PAS de bakélite, de standard à fiches ni de lampe d'époque, sauf objet ancien assumé dans le décor.

---


> ## Décisions de f2 du 07/10 (22h, reco) — ce fichier est mis à jour en conséquence
> **Q7 L'ÈRE** : tranchée, 2000-2010 (ci-dessus) — vocabulaire repassé au filtre. **Q10** : ㊳ ㊴ sont des papiers ; ㉟ ㊱ ㊲ ㊵ ne dessinent pas de terminal (mesuré : `.elast` = panneau de texte) → **les six `*6-scan` sont sortis de la maquette ET du catalogue** (atelier 9469d5a). **Q9** : la fermeture de ⑤ est ordonnée APRÈS les 180 ms du tampon (non bloquant). **Q8, Q11, Q6** ratifiés tels quels. **Q12** : `UiTimingTunables.AppuiLongDeplacementMs = 500`. **Q4** : ligne « Mouvement réduit » de ⑲ = REUSE du canon (demande A5, faite par CLIENT-3 sur la branche atelier), `PlayerPrefs` en attendant le lot back. **Q1-Q3** : intégrés au design v2.1 (entrée multi-écrans, drapeau `Fonctionnelle` — l'arc d'appui long ne se gèle pas —, puits `Parametre`). Aucune ligne de ce catalogue ne cite plus d'objet 1930-1990.

## 0. Ce qu'il faut accepter avant de lire les tableaux

Les cinq décisions ci-dessous commandent tout le reste. Elles sont en tête parce qu'un « non » sur
l'une d'elles réécrit le catalogue, pas une ligne du catalogue.

### 0.1 La thèse : un écran vit parce qu'il RÉPOND, pas parce qu'il remue

**28 des 42 entrées proposées sont des `Transition`** — un geste du joueur, ou un état de jeu qui
change, et la matière qui répond : l'encre qui prend sur le papier, le tampon qu'on abat, la carte
qu'on distribue, le jeton qu'on pousse sur le zinc, le cartel qu'on glisse dans la plaque.
**Seules 6 sont des `Ambiance`** (la matière qui vit toute seule), et toutes les six ont une source
lumineuse ou un corps en mouvement réellement présent à l'écran.

Ce n'est pas de la prudence, c'est une lecture du territoire. J'ai relevé les contrôleurs montés : hors
le décor de comptoir de ⑨/⑩/⑯ et les silhouettes de ㉙, **il n'existe à l'écran aucune lampe, aucun
voyant, aucune fumée, aucun liquide, aucune aiguille, aucune ficelle libre** — 0 **usage** de `fillAmount`,
d'`Image.Type.Filled`, d'`Animator` ou de `ParticleSystem` dans tout `Assets/Scripts` (12 occurrences textuelles, toutes en commentaire). Les écrans sont
du texte et des traits de 1 à 2 px CSS. Une `Ambiance` posée là n'aurait pas de cause : ce serait du
décoratif, c'est-à-dire exactement ce que le ruling du 27/08 interdit.

⇒ **Le joueur doit sentir que le jeu lui répond.** C'est ce qui se voit en 3 secondes de jeu, et c'est
ce qui coûte le moins : une `Transition` dure ≤ 250 ms, ne tourne pas en régime, et ne consomme aucune
piste permanente.

### 0.2 Le canon spécifie DÉJÀ du mouvement, et il gagne

Avant de proposer, j'ai balayé les 25 fichiers de `~/project/mafia-lot-i18n/docs/tech/08_ui_screens/`.
**21 des 22 écrans canon y portent au moins une règle de mouvement** (relevé de lecture, compte par fichier non joint : affirmation non porteuse pour le code). Les entrées ci-dessous les
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
| swap animé de la carte à fort levier au Skip | `screen_1:386` | **aucune entrée** : le client ne fait pas le swap — `RequestSkip` n'appelle ni rechargement ni rendu (`HighestLeverageCardController.cs:192-201`), la carte reste. Dette client (pas de mouvement sans second état) |
| `FlagItemCard` **flip-out** à la validation | `screen_11:255` | `revue.jeton-rendu` |
| `ProblemCardWidget` flip-out + décrément du budget | `screen_13:281`, `:372` | `semaine.jeton-depense` |
| fade-out de la ligne résolue | `screen_5:340` | `file.part` |
| fade-out d'écran à la résolution | `screen_5a:254` | couvert par `shell.entree` |
| transitions de l'arbre ≤ 250 ms | `screen_3:451` | `famille.rang-ouvre` |
| transition push/pop de navigation, interruptible | `screen_12:223` | `shell.entree` |
| ⑲ **porte le bouton « Mouvement réduit »**, rôle `switch`, bascule immédiate, `PATCH /v1/me/settings` | `screen_14:71`, `:146`, `:208`, `:251`, `:298` | REUSE porté par le design §5 (Q4 **résolue**) |
| interdits : spinner bloquant · `HealthBar`/`StatBar`/`ProgressBar` (R4.2) · countdown continu (P1/P4) · barre de progression continue · readout « 0 » | `global_conventions_core.md:209` · `screen_1:374` · `screen_13:120`, `:123` · `screen_3b:423` · `screen_12:193` | aucune entrée n'anime une jauge de stat ni un compte à rebours |

Le canon **ne spécifie aucune courbe d'aisance, nulle part** (0 occurrence de `ease`, `easing`,
`tween`, `lerp` dans les 12 638 lignes). Les aisances de ce catalogue sont donc des propositions,
mesurables contre l'oracle CSS de l'atelier (design §7, X7) quand une maquette existe.

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
- `Melange` (écart de couleur RGB rendu, design §2) : **Δ ≥ 0,12** sur un hôte d'au moins 20 × 20 px, ou sur un trait d'au moins 3 px d'épais.

Ce plancher est celui du **choix** des entrées. Une entrée dont le Δ **rendu** passe sous lui n'est gardée que si sa ligne le dit, chiffre à l'appui, avec son critère de retrait à la planche E4 (`comptoir.lampe`, `famille.lampe-du-don`) ; les autres ont été recalées au-dessus (v3 : `accueil.descente`, `decision.jeton`, `service.jeton`) ou ont perdu le canal trop faible (`conflit.salle`, son `Alpha`). La garde G13 (design §6.2 : ≥ 3/255 de couleur rendue, ≥ 0,5 px de déplacement) reste la borne exécutable. Un plancher se calcule sur la valeur **rendue**, pas sur le facteur : un `CanvasGroup` multiplie l'alpha du `Graphic` (design §9).

Deux candidates ont été écartées par ce plancher, nommément : le balancement des deux brins d'une
ficelle rompue de ㉘ (±0,8° sur 100 u = 1,2 px) et la respiration du liseré `OrLisere` de ㉓
(4,27 u à α 0x40 : Δteinte invisible sous 25 % d'opacité).

### 0.4 La phase négative n'est pas héritée de la maquette : elle est à CHOISIR

Mesuré sur `mesure-ecrans-brennar-6.json` (recompté le 08/10, après le dégel et le retrait des six
`*6-scan` : **529 animations, 29 paires**) : **3 paires seulement portent un `animation-delay` négatif**
(`mk-scan` ×6 à −2,600 s, `mk-buee` ×6 à −2,1/−1,5/−0,9 s, `mk-eclat` ×4 à −4,2/−3,9/−2,6/−1,3 s) — soit
**16 instances sur 529**. Les 26 autres paires démarrent à un délai ≥ 0 : `mk-veille` 0/+0,9 s,
`mk-lampe` 0, `sf` +0,02 à +4,97 s, `po` 0, `pe` 0, `sc` 0…

⇒ Deux choses distinctes, à ne pas confondre :
- **`PoseDeReposS`** (champ de `MouvementDefini`, design §2) est l'instant où le mouvement est FIGÉ
  sous `Reduit` (§5) et sous délestage (§4). **G3** (design §10) exige qu'il donne une valeur **≠ repos** —
  le repos étant l'état restitué par `Detacher` (design §3, « Fin de piste ») : α 1, facteur 1,
  `Melange` 0, `Eclat` 0, déplacement 0. Chaque `Ambiance`/`Alerte` de ce catalogue pose donc son
  `PoseDeReposS` sur un instant où **chaque** canal est hors de son repos ; pour une forme symétrique
  dont la crête vaut l'identité (la « lampe » 0,82 → 1,00 → 0,82), c'est le **creux** (`PoseDeReposS =
  0,000 s`, facteur 0,82), jamais la mi-période.
- **Le gel évalue le mouvement à `PoseDeReposS` SANS `PhaseS`** : toutes les pistes d'une même entrée se figent sur la même pose (les 7 silhouettes de ㉙ comprises), et c'est cette valeur que G3 juge.
- **`Reglage.PhaseS`** est un choix de mise en scène, pas une garde : une phase non nulle évite que
  tout l'écran batte à l'unisson à son montage. La maquette ne la fournit que pour 3 paires ; chaque
  entrée en régime de ce catalogue déclare la sienne, contrôlable à la main.

### 0.5 La forme « lampe » est un REUSE mesuré, pas un nombre inventé

Cinq entrées partagent une seule cause physique — **une lampe de bureau sur un vieux circuit, dont
le filament ne tient pas une intensité fixe** — et donc une seule forme. Cette forme n'est pas
choisie par moi : c'est celle de la lampe de l'atelier, mesurée.

> `@keyframes mk-lampe{0%,100%{opacity:.82}50%{opacity:1}}`, `4.6s ease-in-out infinite`
> — `~/project/atelier3d-mafia/generateur-marche.py:112` et `:197` ; durée confirmée à **4 600 ms**
> sur 4 instances par `mesure-ecrans-brennar-6.json` (`mk-lampe`, délais tous 0) ; paire d'inventaire
> `inventaire-animations.md:36` (« la lampe du tableau du Verge d'Or »).

Les entrées qui la reprennent portent `Source = PROPOSÉ · forme REUSE « ecrans-brennar-6: mk-lampe »`.
La paire d'inventaire elle-même **reste attachée à ㉑** (écran non monté) : je ne la déplace pas, je
réutilise sa forme sur des hôtes qui existent. Et puisque c'est **la même lampe dans la même pièce**,
toutes les cibles d'un même écran partagent **la même phase** — une seule source lumineuse ne bat pas
en désordre. La seule entrée à phases distinctes est `conflit.salle` (§II.㉙), où chaque phase est une
personne différente : la cause justifie la différence.

### 0.6 Ce que ce catalogue NE fait pas

- Il ne redéfinit **aucune** des 40 paires de l'inventaire : elles sont référencées en §I.3 par leur
  id (`ecrans-brennar-6: <keyframe>` / `hud-brennar-canon: <nom>`).
- Il ne tranche rien de neuf : les 12 questions de §IV sont **toutes résolues** (f2 07/10, ou portées
  par le design v4.1/v4.2) ; reste ouvert le seul flotteur « + $ » (R2.2, design §11).
- Il ne maquille aucun trou : 3 entrées dépendent d'un hôte **à dessiner** (§III : A2, A3, A4). Elles
  sont marquées, comptées, et nommées.

---

## I. Conventions de lecture des tableaux

### I.1 Les colonnes, et le champ du modèle qu'elles portent (design v4.2 §2)

| colonne | champ du design §2 | règle |
|---|---|---|
| `id` | `Entree.Id`, forme `ecran.role` ; **`ecran.role/cible`** quand la ligne nomme plusieurs cibles aux canaux différents | unique dans tout le catalogue (G1) |
| `déclencheur / état` | — (contrat du contrôleur : qui appelle `Attacher`/`Transitionner`/`Detacher`) | un identifiant RÉEL du code, avec son `file:line`, ou « en continu » |
| `mouvement` | `Entree.MouvementDefini` : `{ PeriodeS ; Canal[] { Propriete, Mode, ImageCle[] } ; Iteration ; Alterne ; PoseDeReposS ; CouleurA, CouleurB ; Fonctionnelle }` + `Reglage` (`PhaseS`, `Dx`, `KDepl`) | propriétés, mode, amplitudes concrètes, durée ou période en secondes, aisance CSS, itérations, phase |
| `cause dans la fiction` | `Entree.Cause` (≥ 20 car., non « TODO », G1) | une phrase vraie, physique, vérifiable à l'écran |
| `genre` | `Entree.Genre` | `Alerte` \| `Ambiance` \| `Retour` \| `Transition` |
| `pistes` | `Entree.Pistes` | entier ≥ 1, **une piste = une cible** (design §4) ; Σ par écran résolu ≤ 16 (G4) |
| `réduit` | **aucun champ** : le comportement sous `Reduit` est **dérivé** de `Genre`, `Fonctionnelle` et `PoseDeReposS` par la règle du design §5 ; la colonne l'écrit en clair, elle ne le stocke pas | appliqué du §5, jamais inventé |
| `source` | `Entree.Source` | `PROPOSÉ` \| paire d'inventaire \| `REUSE <ancre>` |
| `question` | — | ce que l'atelier doit dessiner, une dépendance (E0, hôte), ou « — » |

Les champs que les colonnes ne portent pas en clair — `Ecrans`, `Bloquante`, `Hote`, `Fonctionnelle`,
`Iteration`, `Alterne`, `CouleurA`/`CouleurB`, `PoseDeReposS` — sont déclarés **pour chaque `Entree`**
dans la table **§I.4**, qui est la projection exacte sur le modèle et la seule source pour E1.

**Trois conventions d'écriture, qui ferment les ambiguïtés relevées par la revue ⊥ n°1.**
1. **Une piste = une cible, une `Entree` = un `MouvementDefini`.** `Attacher(e, cible, …)` applique
   TOUS les canaux de `e` à `cible`. Une ligne qui anime deux cibles avec des canaux différents (un
   disque en `Echelle`, son étiquette en `Alpha`) est donc **deux `Entree`**, d'Id `ligne/cible`, de
   même `Cause` et de même `Genre`. Plusieurs cibles qui reçoivent le **même** mouvement (les 3 cartes
   de ⑩, les 6 voyants de ⑮, les 7 silhouettes de ㉙) restent **une** `Entree` attachée N fois.
2. **`Attacher` ou `Transitionner`.** Un mouvement à images clés (une fois ou en régime) est un
   `Attacher` ; ses canaux de transformation sont `Additif` et finissent à 0, ses `Alpha`/`Echelle`
   sont `Multiplicatif` et finissent à 1 — **la fin d'une `Transition` est l'état du propriétaire**,
   que le contrôleur a déjà posé (« la piste part de l'ancienne valeur »). Un passage **d'une valeur
   du propriétaire à une autre**, sur un seul canal (l'aiguille, le jeton de ⑯, la ficelle de ㉘),
   est un `Transitionner(de, vers)` (design §3).
3. **Couleurs.** `Melange` va de `CouleurA` (0) à `CouleurB` (1) et n'écrit que le RGB (design §2).
   `CouleurA = Cible` signifie « la couleur RGB de la cible lue à l'attachement » et `CouleurB =
   Cible × k` un facteur RGB par canal, borné à 1 (design **v4.2** §2, ajouté pour `retour.appui` et
   les cibles dont la couleur dépend de l'état) ; une couleur nommée (`OrSombre`…) est celle du code,
   avec son ancre. Un `Graphic` blanc dont la couleur est **cuite dans le sprite** (`RadialDisc`,
   `RoundedRectOutline` teinté) ne s'éclaircit pas par `Graphic.color` : il s'assombrit (`k < 1`), ou
   sa lumière passe par l'`Alpha`. Deux cas de plus, mesurés par la revue ⊥ n°2 : un sprite **déjà teinté**
   sous un `Image.color` de la même teinte rend la teinte au carré, et c'est ce carré qu'on fait varier
   (`commissariat.crans`, `CouleurB` = blanc) ; et un `Melange` exige une cible qui **rend** — un `Graphic`
   non texte d'alpha ≥ 0,1 —, sinon il n'écrit rien de visible : c'est la règle de cible de
   `retour.appui`, et son repli `retour.appui-voile` (design v4.3 §17). Le mot « Teinte » de la v1 n'est **pas** une `Propriete` et a
   disparu de ce fichier.

### I.2 Les contraintes dures, qui sont des gardes du design

Toutes les lignes de ce catalogue les respectent ; chaque violation possible est nommée là où elle
survient, jamais passée sous silence.

1. **Jamais de texte animé autre qu'`Alpha`** (G6 : une cible portant un `TMP_Text` refuse tout autre
   canal). Les six `Entree` dont la cible est un `TMP_Text` (`police.baton`, `autonomie.appel`,
   `premiere-fois.lecon`, `vitrine.acquis`, `service.cartel/qui`, `autonomie.reponse` → le
   `Decided`, `AutonomyInboxController.cs:319`), les deux dont la cible est un conteneur qui ne porte
   que des textes (`carnet.encre`, `appro.commande-partie`), et `retour.appui-voile` quand sa cible
   de voile est un texte (le `Button` de `DailyReviewScreenController.cs:1101`, posé sur
   `emptyStateText`) sont **en `Alpha` seul**. `retour.appui` n'atteint jamais un texte : « rend »
   (design §17) exclut le `TMP_Text`.
2. **Aucun montant exact animé ni affiché** (R2.2 : « le back projette des **bandes**, jamais de
   scalaire » — `~/project/mafia-lot-i18n/.claude/skills/juge-donnees/mandat-juge-donnees.md:63`).
   Aucune entrée n'anime un nombre. Les chiffres que portent les cibles animées sont des **comptes
   d'items actionnables** (le « 1 » du jeton de ⑤, les 8 créneaux de ㉞), que le canon autorise
   explicitement (⑱ : « badge de count d'items ACTIONNABLES … jamais un scalaire de simulation »,
   front.md:1568) — et même eux ne sont jamais animés : c'est leur support qui bouge.
   **Une exception, consignée** : `autonomie.appel` fait battre le `ReportHeader` de ㉔, dont le texte
   porte un scalaire servi exact (`"Oldest: " + report.backlog_age_cycles + " cycles"`,
   `AutonomyInboxController.cs:285`). L'affichage préexiste au catalogue, qui ne l'anime qu'en `Alpha`,
   sans toucher au nombre ; c'est une **dette R2.2 de ㉔** (comme `monte` au design §11), à porter au
   lot d'écarts, pas un mouvement à retirer.
3. **G8 (design §10) : une entrée `Bloquante` ET > `AnimMaxBlockMs` (250 ms) est refusée ; les `Retour`
   d'appui (`retour.appui`) ≤ 250 ms.** **Aucune** entrée de ce catalogue n'est `Bloquante` (§I.4).
   Quatre one-shots dépassent 250 ms (« durée » = celle d'une `Transition`/`Retour` ; les 11 entrées en régime
   ont des PÉRIODES de 1,1 à 11,0 s, hors de cette règle), toutes non bloquantes, toutes nommées : `retour.appui-long` (1 000 ms,
   = `UiTimingTunables.DestructiveLongpressMs`), `semaine.aiguille` (700 ms, la valeur de la maquette,
   `inventaire-animations.md:58`), `carnet.en-main` (500 ms, = `AppuiLong.Duree`, `Operational/Carnet/AppuiLong.cs:10`),
   `bandeau.sortie` (400 ms, `BandeauEphemere.cs:167`). Q2 est résolue par le design (`Bloquante`).
4. **G5 : au plus 3 extrema par seconde (période ≥ 0,667 s)**, toutes politiques, par piste d'alpha,
   de mélange ou d'éclat (design §5). La plus rapide du catalogue est à **1,1 s** (`accueil.descente`,
   la période de `Pouls`) ; les 11 entrées en régime sont toutes ≥ 1,1 s.
5. **G3 : le `PoseDeReposS` de toute `Ambiance`/`Alerte` donne, sur chaque canal, une valeur ≠ repos**
   (repos = l'état restitué par `Detacher`, design §3). Chaque ligne le déclare, §I.4 le recopie, et
   §0.4 dit pourquoi ce n'est jamais la crête d'une forme « lampe ».
6. **Σ `Pistes` ≤ 16 par écran résolu** (G4 : une `Entree` à plusieurs écrans compte sur **chacun**)
   et **48 pistes vivantes dans tout le client** (design §4). Le pire écran, transverses `*` résolues
   au pire cas (bandeau compris), est **㉙ à 14** (§V) ; le pire cas simultané : ㉙ 14 + les 4 `Alerte`
   du chrome en descente (pouls du cerclage, pouls du filet, tremblement, gyrophare : design §9) =
   **18 sur 48**.
7. **Sous un `RectMask2D`, le canal de transformation est plafonné à 6 pistes** et aucun Canvas
   imbriqué n'est posé (design §4, **hypothèse à mesurer : spike E0**). Les écrans concernés de ce
   lot : ⑥ (`LieutenantScreenController.cs:1331`), ㉓ (`ShopScreenController.cs:406`),
   ㉜ (`DelegationScreenController.cs:979`), ㉝ (`DemolitionScreenController.cs:1185`),
   ㉞ (`CarnetScreenController.cs:810`), ㉙ (`ConflitScreenController.cs:1219`),
   ④ (`DashboardController.cs:639`, masque de décor, pas de liste), ⑱ (`AppShell.cs:1348`).
   **Entrées de ce catalogue sous un masque (11 mesurées)** : ⑥ `famille.lampe-du-don` (`Alpha`) ;
   ㉓ `vitrine.acquis` (`Alpha` ; masque `:406`, `Etageres` enfant de la vue `:414`) ;
   ㉜ `service.jeton` (`Melange`), `service.cartel/cro` (`Melange`) et `/qui` (`Alpha`) ; ㉝
   `demolition.fiche-sortie` et `demolition.offre-fermee` (`Alpha`) ; ㉞ `carnet.encre` et
   `carnet.en-main` (`Alpha` ; masque `:810`, `contenu` `:812`, `listeRoot` `:824`, créneaux `:719`) ;
   ㉙ `conflit.envoi/bord` et `/cadre` (`Alpha`). Soit **11**. **Non mesuré** : `famille.rang-ouvre` (les 7 sections
   de ⑥ sont-elles dans le défilement de `:1331` ?), à vérifier en E4. **Aucune ne pose de canal de
   transformation sous un masque** depuis la v3 (`demolition.fiche-sortie` a perdu sa translation ;
   l'`Objet` de ㉓ n'est plus animé) ; leur coût (`CanvasGroup.alpha`, `Graphic.color`) est
   l'objet des mesures (a)-(b)-(d) d'E0.
8. **Le premier montage de la session n'est pas animé** (`global_conventions_core.md:126`, F4).
9. **G11, prédicat exact** (ce qu'un runner calcule) :
   - **translation** refusée si le **parent direct** porte un `LayoutGroup` et que la cible n'a pas
     `LayoutElement.ignoreLayout` — un `LayoutGroup` ne réécrit la position que de ses enfants
     DIRECTS (c'est pourquoi `ExceptionDetailController.cs:506-510` interpose la `Face`) —, ou si la
     cible porte elle-même un `ContentSizeFitter` ;
   - **échelle** refusée si la cible **ou n'importe quel ancêtre** porte un `ContentSizeFitter` (lecture
     stricte, gardée telle quelle).
   Translations restantes, **mesurées** sur leur parent direct : `bandeau.entree` (ancré à la main,
   `BandeauEphemere.cs:204-206`), `bascule.course` (`Curseur` sous `Interrupteur`, qui ne porte aucun
   groupe : `SettingsScreenController.cs:232-242`, `TutorialScreenController.cs:344-354` — le
   `HorizontalLayoutGroup` de la ligne, `:421` / `:430`, pilote `Interrupteur`, pas le curseur),
   `main.distribuee` (`Face` sous `carte`, sans groupe : `ExceptionDetailController.cs:523-527` ; le
   `VerticalLayoutGroup` de la `Face`, `:590`, pilote ses enfants, pas elle), `conflit.salle`
   (`SceneHaute`, sans groupe), `vitrine.reflet` et `distribution.photo` (hôtes à dessiner : la
   contrainte passe dans A3/A4). Échelles restantes, **mesurées** : `decision.cachet` et
   `semaine.jeton-depense` (0 `ContentSizeFitter` dans `DecisionDetailScreenController.cs` et dans
   `CompressionScreenController.cs`) ; `retour.appui`, conditionnée par sa règle. `revue.cachet` et
   `file.cachet` ont perdu leur échelle en v4 (`ContentSizeFitter` sur la cible, et sur `Comptoir` pour
   ⑨). Le dépôt porte **20 poses** de `ContentSizeFitter` dans 15 fichiers (55 lignes le nomment) :
   G11 se vérifie sur l'arbre, au créneau.

### I.3 Les paires de l'inventaire : référencées, pas redéfinies (G2)

Source : `inventaire-animations.md` §F — **40 paires** (29 `ecrans-brennar-6` mesurées dans Chromium +
11 lignes HUD/⑭) ; présentes 2 · partielle 1 · absentes 37. G2 (design §10) exige pour chacune une
`Entree` ou un `Hote = SansHote:<raison>` compté. Je ne les réécris pas ; je donne leur `Entree` ou leur
`SansHote`, parce que c'est ce qui décide si elles sont câblables.

| bloc | paires | `Entree` ou `SansHote` | câblable ? |
|---|---:|---|---|
| `hud-brennar-canon` B1 `pouls`, B2 `tremble` | 2 | présentes (`TopBarController.cs:763`, `:770`) ⇒ entrées du chrome, migrées au catalogue du HUD (design §9, E2) | oui (E2) |
| `hud-brennar-canon` B3 `gyroflip` | 1 | partielle (`Gyrophare.cs`, fond D seul) ⇒ piste `Alerte` `Hue` (design §9, E2) | oui (E2) |
| `hud-brennar-canon` B6 filet, B7 anneau, B8 lunette, B9 fondu du gyro, B10 aiguille du HUD | 5 | hôtes présents dans ① ⇒ entrées du chrome (`chrome.filet.virage`, `chrome.anneau.virage`, `chrome.aiguille.balayage`…, design §3/§7/§9, E3) | oui (E3) |
| `hud-brennar-canon` B4 `monte` | 1 | `SansHote:R2.2 — le flotteur « + $320 » est un montant exact` (design §11) | non : décision |
| `hud-brennar-canon` B5 fondu jour↔nuit de `.fond` | 1 | `SansHote:① hôte de fondu croisé à construire (deux couches de fond)` (design §7, E3) | non : hôte à construire |
| inventaire §B **B11** — l'aiguille du cadran TENSION de ⑭ (transition mesurée sur `ecrans-brennar-6`, cadres 14-19 ; comptée parmi les 11 lignes HUD/⑭) | 1 | **= `semaine.aiguille`** (§II ⑭, une ligne de ce fichier), `SansHote:⑭ cadran absent` jusqu'à E4 (design §7) | non : hôte à construire (E4) |
| `ecrans-brennar-6: hl` (③ le halo du pin) | 1 | `SansHote:③ pas de pin` (`CityMap/DistrictCellView.cs:95`) | non |
| `ecrans-brennar-6:` serre (`sf` ×202, `drip`, `derive`, `led`, `spl`, `respire`, `tg`, `clign`) | 8 | `SansHote:② 0 scène de serre` (`BuildingCardController`) | non : E5 (ART d'abord) |
| `ecrans-brennar-6:` labo (`bl` ×52, `vp`, `cd`, `fl`, `rl`, `ch`, `ec`, `rd`, `gt`) | 9 | `SansHote:② pupitre figé` (`BuildingCardController.AddPupitreLaboratoire:2242`) | non : E5 |
| `ecrans-brennar-6:` Ash (`po` ×78, `sc`, `pe`, `am`, `ci`, `cl`) | 6 | `SansHote:② vitrine Ash figée` (`AddVitrineAsh:2318`) | non : E5 |
| `ecrans-brennar-6:` marché (`mk-veille`, `mk-scan`, `mk-buee`, `mk-lampe`, `mk-eclat`) | 5 | `SansHote:㉑ écran non monté` (aucun contrôleur). `mk-eclat` a son hôte **dans la maquette** (cadre 146, 4 instances mesurées, `inventaire-animations.md:37`, `:65`) ; c'est l'écran client qui manque | non : ㉑ non monté |

**Contrôle : 2 + 1 + 5 + 1 + 1 + 1 + 1 + 8 + 9 + 6 + 5 = 40** · câblables **8** (B1-B3, B6-B10),
non câblables **32** (B4 · B5 · B11 · `hl` · 23 de la fiche · 5 du marché). Les six `*6-scan` (㉟-㊵)
ne sont **plus** des paires : retirés de la maquette (atelier 9469d5a) et de l'inventaire (Q10).

⇒ **Le `Catalogue` final** compte **41 lignes de ce fichier** (44 `Entree` après la règle « une piste =
une cible », §I.4) **+ 39 paires** d'inventaire (B11 est déjà la ligne `semaine.aiguille`) = **80 lignes
G2**, dont **34 non câblables aujourd'hui** : 31 paires (B4, B5, `hl`, 23 de la fiche, 5 du marché) et
**3 des miennes**, suspendues à un hôte à construire ou à dessiner (`semaine.aiguille` = B11 → E4,
`vitrine.reflet` → A3, `distribution.photo` → A4). **46 sont câblables** : 38 de mes lignes et les 8
paires du chrome. Contrôle : 34 + 46 = 80. **En `Entree`** (l'unité de E1) : 44 + 8 du chrome + 31
`SansHote` = **83 rangs G2**, dont **49 câblables** (41 + 8) et 34 non (31 + 3).

### I.4 La projection exacte sur le modèle — une ligne par `Entree` (44)

C'est la table que E1 recopie dans `Catalogue`. Les colonnes absentes valent la même chose pour toutes les
`Entree` : **`Bloquante = false`** (aucune entrée ne refuse l'entrée du joueur, X8, G8) · **`Alterne = false`**
· **`Source`, `Cause`** : celles de la ligne de §II. `Fonctionnelle = true` pour la seule `retour.appui-long`.
« Mult » = `Multiplicatif`, « Add » = `Additif`, « Abs » = `Absolu` (design §2). Toutes les valeurs sont en
repère Unity (u, degrés). `PoseDeReposS` « — » : une `Transition` ou un `Retour` sous `Reduit` saute à sa fin,
c'est-à-dire à l'état du propriétaire (§I.1, règle 2) ; seul `carnet.en-main` déclare le sien, parce qu'un
`Retour` est figé et non sauté (§5). Pour une `Ambiance`/`Alerte`, la parenthèse donne la valeur au gel, hors du
repos sur chaque canal (G3) ; le gel évalue le mouvement à `PoseDeReposS` **sans** `PhaseS` (§0.4).

| `Entree.Id` | `Ecrans` | `Genre` | cible | canaux (`Propriete` · `Mode`) | `Iteration`, durée ou période | `PoseDeReposS` (s) | `CouleurA` → `CouleurB` | `Hote` | `Pistes` |
|---|---|---|---|---|---|---|---|---|---:|
| `retour.appui` | `*` | Retour | la surface qui rend (nommée, sinon `targetGraphic`) | `Echelle` Mult (sous condition) · `Melange` Abs | appui 90 ms puis relâché 140 ms | — | `Cible` → `Cible × 0,85` | client | 1 |
| `retour.appui-voile` | `*` | Retour | le `Button`, ou son plus proche ancêtre qui rend | `Alpha` Mult | appui 90 ms puis relâché 140 ms | — | — | client | 1 |
| `retour.appui-long` | `*` (5 instances : ④ ⑤ ⑨ ⑩ ⑯) | Retour | un `Ring` `Filled` posé sur l'objet pressé | `Remplissage` Abs | Fois 1, 1 000 ms | — | — | client (anneau à créer) · **`Fonctionnelle`** | 1 |
| `shell.entree` | `*` | Transition | la racine du locataire | `Alpha` Mult | 160 ms | — | — | client | 1 |
| `bandeau.entree` | `*` | Transition | la racine du bandeau | `TranslationY` Add (+10 u → 0) · `Alpha` Mult | 200 ms | — | — | client | 1 |
| `bandeau.sortie` | `*` | Transition | le groupe du bandeau | `Alpha`, par `Transitionner` | 400 ms | — | — | client | 1 |
| `comptoir.lampe` | ⑨ ⑩ ⑯ | Ambiance | `Plateau/FiletHaut` | `Alpha` Mult | Infini, 4,6 s | 0,000 (0,82) | — | client | 1 |
| `comptoir.bouteilles` | ⑨ ⑯ | Ambiance | la rangée `Bouteilles` | `Alpha` Mult | Infini, 4,6 s | 0,000 (0,83) | — | client | 1 |
| `bascule.course` | ⑲ ㉕ | Transition | le `Curseur` | `TranslationX` Add | 140 ms | — | — | client | 1 |
| `accueil.descente` | ④ | Alerte | `Row_descente` | `Melange` Abs | Infini, 1,1 s | 0,000 (`Melange` 1) | `Cible` (`#232a2d`) → `#4a2a24` | client | 1 |
| `decision.distribuee` | ⑤ | Transition | « CarteDuJour » | `Rotation` Add · `Alpha` Mult | 220 ms | — | — | client | 1 |
| `decision.cachet` | ⑤ | Transition | le `Tampon` | `Echelle` Mult · `Melange` Abs | 180 ms | — | `Cible` → `Cible × 0,75` | client | 1 |
| `decision.jeton` | ⑤ | Alerte | le `Jeton` | `Melange` Abs | Infini, 4,6 s | 0,000 (`Melange` 1) | `Cible` (blanc) → `Cible × 0,82` | client | 1 |
| `famille.lampe-du-don` | ⑥ | Ambiance | le `Halo` du Don | `Alpha` Mult | Infini, 4,6 s | 0,000 (0,82) | — | client | 1 |
| `famille.rang-ouvre` | ⑥ | Transition | les `sectionsDetail` actives (≤ 7) | `Alpha`, par `Transitionner` | 160 ms | — | — | client | 7 |
| `revue.jeton-rendu/jeton` | ⑯ | Transition | le `Jeton` | `Rotation` Abs, par `Transitionner` | 220 ms | — | — | client | 1 |
| `revue.jeton-rendu/bulle` | ⑯ | Transition | la `Bulle` | `Alpha`, par `Transitionner` | 200 ms | — | — | client | 1 |
| `revue.cachet` | ⑯ | Transition | le `Cachet` | `Rotation` Add · `Alpha` Mult | 160 ms | — | — | client | 1 |
| `file.cachet` | ⑨ | Transition | le `Cachet` | `Rotation` Add · `Alpha` Mult | 160 ms | — | — | client | 1 |
| `file.part` | ⑨ | Transition | l'attendant parti | `Alpha`, par `Transitionner` | 200 ms | — | — | client | 1 |
| `main.distribuee` | ⑩ | Transition | les 3 `Face` | `TranslationY` Add · `Rotation` Add · `Alpha` Mult | 150 ms, `PhaseS` 0 / +0,045 / +0,090 s | — | — | client | 3 |
| `semaine.jeton-depense` | ⑭ | Transition | le jeton dépensé | `Echelle` Mult | 200 ms | — | — | client | 1 |
| `semaine.aiguille` | ⑭ | Transition | l'aiguille du cadran TENSION | `Rotation` Abs, par `Transitionner` | 700 ms | — | — | `SansHote:⑭ cadran absent` (E4) | 1 |
| `police.dispatch` | ⑮ | Alerte | le glyphe `Regime` de chaque ligne tendue (≤ 6) | `Melange` Abs | Infini, 1,6 s | 0,800 (`Melange` 1) | `Cible` (`Braise`) → `Cible × 1,35` | client | 6 |
| `police.baton` | ⑮ | Transition | `batonTexte` (`TMP_Text`) | `Alpha` Mult | 200 ms | — | — | client | 1 |
| `commissariat.crans` | ⑰ | Transition | le cran allumé | `Alpha` Mult · `Melange` Abs | 200 ms | — | `Cible` (teinte du rang) → blanc | client | 1 |
| `vitrine.acquis` | ㉓ | Transition | `Possede` (`TMP_Text`) | `Alpha` Mult | 160 ms | — | — | client | 1 |
| `vitrine.reflet` | ㉓ | Ambiance | la bande de reflet | `TranslationX` Add | Infini, 11,0 s | 3,700 (33,6 % de course) | — | `SansHote:㉓ vitre absente` (A3) | 1 |
| `autonomie.appel` | ㉔ | Alerte | le `ReportHeader` du plus vieux rapport (`TMP_Text`) | `Alpha` Mult | Infini, 1,6 s | 0,800 (0,62) | — | client | 1 |
| `autonomie.reponse` | ㉔ | Transition | `Decided` (`TMP_Text`) | `Alpha` Mult | 160 ms | — | — | client | 1 |
| `premiere-fois.lecon` | ㉕ | Transition | le `Texte` de la leçon suivante (`TMP_Text`) | `Alpha` Mult | 110 ms | — | — | client | 1 |
| `distribution.ficelle-tendue` | ㉘ | Transition | `DistributionFicelleGraphic` | `Parametre` canal 0 Abs, par `Transitionner` | 240 ms | — | — | client (`IParametreAnime` à implémenter ; second état prescrit) | 1 |
| `distribution.photo` | ㉘ | Ambiance | la photo punaisée | `Rotation` Add | Infini, 7,4 s | 3,700 (+2,5°) | — | `SansHote:㉘ photo absente` (A4) | 1 |
| `appro.commande-partie` | ㉚ | Transition | `Ligne_la_commande` | `Alpha` Mult | 200 ms | — | — | client | 1 |
| `service.jeton` | ㉜ | Alerte | le `Rond` du jeton | `Melange` Abs | Infini, 4,6 s | 0,000 (`Melange` 1) | `Cible` (`Or`) → `Cible × 0,82` | client | 1 |
| `service.cartel/cro` | ㉜ | Transition | le `Cro` | `Melange` Abs | 200 ms | — | `Cible` (`OrSombre`) → `CroLibre` | client | 1 |
| `service.cartel/qui` | ㉜ | Transition | `Qui` (`TMP_Text`) | `Alpha` Mult | 160 ms | — | — | client | 1 |
| `demolition.fiche-sortie` | ㉝ | Transition | la `Fiche` | `Alpha` Mult | 200 ms | — | — | client | 1 |
| `demolition.offre-fermee` | ㉝ | Transition | le `Tag` | `Alpha` Mult | 200 ms | — | — | client | 1 |
| `carnet.encre` | ㉞ | Transition | le `Corps` de la ligne | `Alpha` Mult | 220 ms | — | — | client | 1 |
| `carnet.en-main` | ㉞ | Retour | la `Marque` de la ligne | `Alpha` Mult | Fois 1, 500 ms | 0,000 (α 0) | — | client (`Marque` à créer) | 1 |
| `conflit.salle` | ㉙ | Ambiance | les 7 `Silhouette_*` | `TranslationX` Add | Infini, 11,0 s | 0,000 (−21,3 u) | — | client | 7 |
| `conflit.envoi/bord` | ㉙ | Transition | `BordChoisi` | `Alpha` Mult | 220 ms | — | — | client | 1 |
| `conflit.envoi/cadre` | ㉙ | Transition | `CeSoirCadre` | `Alpha` Mult | 160 ms | — | — | client | 1 |

**Contrôle** : 44 `Entree` = 41 lignes de §II + 3 lignes à deux cibles (`revue.jeton-rendu`, `service.cartel`, `conflit.envoi`). Σ `Pistes` par `Entree` distincte = **63** (= la ligne « Σ par ligne distincte » de §V). Genres : 5 `Alerte` · 6 `Ambiance` · 4 `Retour` · 29 `Transition` = 44. `Hote = SansHote` : 3 (`semaine.aiguille`, `vitrine.reflet`, `distribution.photo`).

---

# II. Le catalogue, écran par écran

## II.0 Les 8 entrées TRANSVERSES

Elles ne vivent pas sur un écran : elles vivent sur un **geste** (l'appui), sur le **shell** (le
montage, le bandeau), ou sur une **matière partagée** (le comptoir de ⑨/⑩/⑯, la bascule de ⑲/㉕).

Le modèle les porte tel quel : `Entree.Ecrans` est une liste (`string[]`, ou `"*"`), et une `Entree` à
plusieurs écrans compte, pour G4, sur **chacun des écrans résolus** (design §2 ; Q1 résolue). `Ecrans
= "*"` pour une entrée qui suit un geste ou le shell, `Ecrans = ["⑨","⑩","⑯"]` pour une entrée qui
suit une matière. Le §V les résout écran par écran.

### II.0.a Le retour d'appui — la demande de f2 (15 sites `Transition.None` sur 67 `Button`)

Compté à nouveau, et les deux nombres de l'inventaire se vérifient : `Selectable.Transition.None` est
posé sur **15 sites**, et `AddComponent<Button>()` apparaît **67 fois** dans `Assets/Scripts`
(34 fichiers ; détail du compte disponible, somme refaite à la main).

Ce lieu, c'est le doigt sur la matière : rien ne se passe à l'écran avant qu'on y touche.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `retour.appui` | `PointerDown` sur n'importe quel `Button` créé par le client (67 sites) ; relâchement ou sortie du doigt | **cible = la surface qui REND**, décidée par `Retour.Poser(Button, Graphic surface = null)` (design §17) : (1) la `surface` nommée par l'appelant si elle rend — c'est le cas des trois boutons dont le `targetGraphic` est un masque qui ne peint pas : `ExceptionDetailController.cs:570` (→ `Verre`, `:540-548`), `DistrictInteriorScreenController.cs:2312` (→ `Remplissage`, `:2263-2275`), `LaSuitePanelController.cs:223` (→ `Degrade`, `:212-219`) ; (2) sinon `button.targetGraphic` s'il rend ; (3) sinon **pas de `retour.appui`** : `retour.appui-voile` (ligne suivante). Jamais de recherche automatique parmi les enfants (elle retenait l'ombre portée de ⑥). **« rend »** (design §17) = un `Graphic` non texte, `enabled`, `gameObject.activeInHierarchy`, `color.a ≥ 0,1`, et sans `Mask` à `showMaskGraphic = false` sur son GameObject. **appui** : `Melange` 0 → 1 (`CouleurA = Cible`, `CouleurB = Cible × 0,85`), **90 ms**, `ease-out`, et `Echelle` 1,00 → 0,97 **seulement si** la plus grande dimension du bouton ≤ 1/3 du cadre (design §8) **et** qu'aucun `ContentSizeFitter` n'est posé sur la cible ni sur un ancêtre (G11) · **relâchement** : retour à `Melange` 0 et `Echelle` 1,00, **140 ms**, `ease-out`. Total ≤ 230 ms. Le `onClick` reste émis au relâchement, inchangé | Un bouton est une pièce de plastique dur (touche, bouton de pager) montée sur ressort : il s'enfonce sous le pouce et remonte quand on le lâche — sans rebond, sans lueur. | `Retour` | 1 | `Melange` seul, **sans échelle** (design §5 (i)) | `REUSE design §9` (`Retour.Poser(Button)`) | **Q6** : 10 des 15 sites sont des **cartes/rangées/panneaux entiers** (la racine de `HighestLeverageCard`, tout le bandeau, une rangée de ⑥, une plaque de ㉜, un bloc de ㉝, une cellule de bâtiment de ①, le texte vide de ⑯…). Un −3 % sur une feuille de 560 u déplace son bord de 8,4 u = 7 px : l'écran a l'air de sauter |
| `retour.appui-voile` | `PointerDown` sur un `Button` dont ni la surface nommée ni le `targetGraphic` ne rend (cas (3) de `retour.appui`). **Déduit** du classement bouton par bouton de la revue ⊥ n°3 (51 / 3 / 13 sous la règle v4.3), règle v4.4 : **16 des 67** — les 13 de son cas (3) (`DemolitionScreenController.cs:1459`, `SettingsScreenController.cs:256`, `ExceptionQueueController.cs:605`, `DelegationScreenController.cs:1533`, `TutorialScreenController.cs:365`, `DistrictInteriorScreenController.cs:2128`, `ExceptionQueuePanel.cs:249` et `:314`, `CarnetScreenController.cs:595`, `AppShell.cs:2349`, `DailyReviewScreenController.cs:1101`, `HighestLeverageCardController.cs:342`, `TopBarController.cs:940`) et les 3 qu'une recherche d'enfant avait mal résolus (`LieutenantScreenController.cs:2731`, `DistrictInteriorScreenController.cs:691`, `CityMapController.cs:894`). Le compte se vérifie au créneau (G9) | **appui** : `Alpha` `Multiplicatif` 1,00 → 0,80 sur un `CanvasGroup` posé sur la **cible du voile** = le `Button` lui-même si lui ou un de ses descendants porte un `Graphic` qui rend ; **sinon son plus proche ancêtre** dont la sous-arborescence en porte un (une zone de clic nue et transparente, sans enfant, ne voile rien : `DelegationScreenController.cs:1527-1535`, `DemolitionScreenController.cs:1453-1459`, `DistrictInteriorScreenController.cs:2125-2128` voilent leur plaque ou leur `corps`). **90 ms**, `ease-out` · **relâchement** : retour à 1,00, **140 ms**, `ease-out`. Pas d'`Echelle`. Un `Alpha` est permis sur un `TMP_Text` (G6) | Une surface sans bord ni plaque — une carte posée, une ligne de registre, une mention — ne s'enfonce pas : elle passe sous l'ombre de la main qui la touche. | `Retour` | 1 | **gardé** comme le `Melange` d'un `Retour` (design §5 (i), étendu en v4.3 : le voile est le canal de couleur d'un bouton sans `Graphic` coloré) ; sans échelle | `REUSE design §8` (cas (3) de `Retour.Poser`, design v4.3 §17) | — |
| `retour.appui-long` | `LongPressButton.IsPressing` (`ShellContracts/LongPressButton.cs:20`) ; **5 instances** : `Shell/DecisionDetailScreenController.cs:428` (⑤), `Shell/HighestLeverageCardController.cs:371` (④), `Shell/DailyReviewScreenController.cs:583` et `:1276` (⑯), `Operational/Exceptions/TamponAuComptoir.cs:102` (le tampon partagé de ⑨ et ⑩, `ExceptionQueueController.cs:837`, `ExceptionDetailController.cs:449`) | `Remplissage` 0,00 → 1,00 sur **1 000 ms** (= `UiTimingTunables.DestructiveLongpressMs`, `ShellContracts/UiTimingTunables.cs:19`), `linear`, une fois · relâchement avant le seuil : retour à 0,00 en **120 ms**, `ease-out`. Hôte : un `ProceduralUI.Ring` (`ShellContracts/ProceduralUI.cs:241`) posé sur l'objet pressé, `Image.type = Filled`, `fillMethod = Radial360` (**à créer** : 0 usage de `Filled` aujourd'hui). **`Fonctionnelle = true`, `Bloquante = false`** : le doigt n'est jamais retardé | On n'abat pas un tampon d'un coup de doigt : on appuie, l'encre prend, et c'est au bout de la seconde que la mention est portée. | `Retour` | 1 | **PAS un gel** (`Fonctionnelle`, design §5 (ii)) : indicateur statique + compteur textuel de secondes **rendu par le contrôleur, pas par la régie** (canon `screen_2a:314`, `screen_13:308`), et l'alternative saisie reste offerte (F2) | `REUSE canon global_conventions_core.md:136` + `screen_2a:279`, `:300` (`role="progressbar"`, `aria-valuenow` 0→100) + `UiTimingTunables.cs:19` | — |

### II.0.b Le shell — montage d'un écran, et le bandeau

Ce lieu, c'est le passage d'une pièce à l'autre : une porte, et une voix qui arrive par-dessus le
comptoir.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `shell.entree` | tout montage dans `ContentSlot` : `MountTenant<T>` (`Shell/AppShell.cs:1480`), `MonterLocataireEnSurimpression<T>` (`:1525`), `EnterDistrict` (`:329`), `MonterMenuPlus` (`:1328`). **Exclu : le premier montage de la session** | `Alpha` 0,00 → 1,00 sur le `CanvasGroup` de la racine du locataire (posé à l'`Attacher`), **160 ms**, `ease-out`, une fois. Pas de translation (voir question) | On ne se téléporte pas d'une pièce à l'autre : on pousse une porte, et ce qu'il y a derrière se découvre le temps du geste. | `Transition` | 1 | durée 0 (design §5) | `REUSE canon screen_12:223` (« Transition `T.ui.anim_max_block_ms` — interruptible ») | ⚠️ **La SORTIE n'est pas animable sans retouche** : `UnmountCurrentTenant` détruit l'ancien locataire **de façon synchrone** et vide tout `ContentSlot` (`AppShell.cs:1858-1863`). Je propose donc d'animer **l'entrée seule** — l'écran précédent disparaît d'un coup, comme aujourd'hui : une entrée, zéro retouche du shell. Et **F4 interdit l'animation au cold-open** (`global_conventions_core.md:126`) ⇒ l'exclusion du premier montage est une garde, pas une préférence. Glissement de ⑱ : le canon ne spécifie un `slide-up` que pour la bottom-sheet de ② (`screen_2a:258`) ; ⑱ est une liste plein cadre ⇒ **fondu seul, recommandé** |
| `bandeau.entree` | `BandeauEphemere.Annoncer(...)` (`Shell/BandeauEphemere.cs:261-275`) : aujourd'hui `groupe.alpha = 1f` d'un coup (`:269`) | `TranslationY` `Additif` **+10 u de bandeau → 0** (repère Unity : l'annonce part de 10 u au-dessus et DESCEND ; = 27,6 px ; le bandeau est ancré au bord haut, pivot haut, `BandeauEphemere.cs:204-206`) et `Alpha` 0,00 → 1,00, **200 ms**, `ease-out`, une fois | Une annonce descend de la barre comme un billet qu'on vous passe par-dessus le comptoir : elle arrive, elle n'était pas là. | `Transition` | 1 | durée 0 | `PROPOSÉ` (l'entrée du bandeau n'existe pas : seule la sortie est animée) | — |
| `bandeau.sortie` | la minuterie du bandeau, ou le toucher | `Alpha` 1,00 → 0,00, **400 ms**, **`linear`** (mesuré : `BandeauEphemere.cs:296-299`, `Time.unscaledDeltaTime`), une fois, après une tenue de **5,000 s** (`DureeParDefautS`, `:166`) | Une annonce ne se décroche pas : elle s'éteint, et le temps qu'elle met à s'éteindre dit qu'elle n'était pas importante. | `Transition` | 1 | durée 0 | `REUSE design §9` (la coroutine `Effacement` reste minuterie ; le fondu devient `Transitionner(bandeau.sortie, quandFini: Effacer)`) | **Q2** résolue : `Bloquante = false`, G8 ne lit que « `Bloquante` ET > 250 ms » ; le fondu ne bloque rien (`Toucher()` appelle `Effacer()` immédiatement, `:286-291`). **Q11** ratifiée (f2) : 5 s de tenue + 0,4 s de fondu (`:157-158`) |

### II.0.c Le comptoir du Verge d'Or — la matière partagée de ⑨, ⑩ et ⑯

Ce lieu, c'est le bar : un zinc, une étagère de bouteilles, trois tabourets, et une rampe au-dessus
du plateau. C'est **le seul décor réellement dessiné de tout le client** — une vraie texture de scène
(`Assets/Art/Scenes/Resources/Scenes/sprite_environment_bar_nuit.png` pour ⑨/⑩,
`…_verge_d_or_jour.png` pour ⑯), un dégradé, un zinc en trois couches, **7 bouteilles**, deux filets
de laiton. Tout est bâti par `ShellContracts/DecorAuComptoir.cs`, partagé (`Batir()` :62-128).

C'est donc le seul endroit du périmètre où une `Ambiance` a une cause physique à l'écran.

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `comptoir.lampe` <br>`Ecrans = ⑨ ⑩ ⑯` | en continu, tant que l'écran est monté | `Alpha` `Multiplicatif` **0,82 → 1,00 → 0,82** sur un `CanvasGroup` posé sur `Plateau/FiletHaut` (`DecorAuComptoir.cs:124` : trait de `Px(2)` = **8,5 u = 7,2 px**, pleine largeur, or `#d9ab4e` à α 0x88), **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 0,000 s` (facteur 0,82 : le creux du filament) | Au-dessus du zinc il y a une rampe, et le laiton du plateau est ce qui la rend : c'est le seul endroit du comptoir où l'on voit la lumière bouger. | `Ambiance` | 1 (par écran) | figé à `PoseDeReposS` (facteur 0,82, design §5). Pas la crête : la crête vaut 1,00, l'état sans piste (G3) | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` (4 600 ms mesurés, §0.5) | ⚠️ **Δ rendu sous le plancher §0.3, à MESURER** : 0,18 × 0,53 (α 0x88) ≈ **0,096** d'alpha, soit ≈ **24/255** (même conversion que `famille.lampe-du-don`). G13 (≥ 3/255) passe ; la planche E4 le mesure, et sous 3/255 l'entrée est **retirée** |
| `comptoir.bouteilles` <br>`Ecrans = ⑨ ⑯` | en continu | `Alpha` `Multiplicatif`, **facteur 0,83 → 1,00 → 0,83**, sur un `CanvasGroup` posé sur la rangée `Bouteilles` (`DecorAuComptoir.cs:236`, 7 bouteilles de `Px(9) × Px(32 ou 26)` = **38 × 136 ou 111 u**, dégradés braise/or et cyan/or ; base **mesurée** α 0,80 par bouteille, `:260` ⇒ **rendu 0,66 → 0,80 → 0,66** : un `CanvasGroup` ne dépasse pas l'alpha du `Graphic`, la crête est la base, design §9), **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s** (la même que `comptoir.lampe` : c'est la même rampe), `PoseDeReposS = 0,000 s` | Les bouteilles de l'étagère sont en verre : elles ne s'allument pas toutes seules, elles rendent la rampe du comptoir, en même temps qu'elle. | `Ambiance` | 1 (par écran) | figé à `PoseDeReposS` (facteur 0,83, rendu 0,66) | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` | ⑩ **n'en a pas** : son zinc est posé à `HauteurDos = 0f` (`Operational/Exceptions/ExceptionDetailController.cs:777`) ⇒ `dos.SetActive(false)` (`DecorAuComptoir.cs:135`) ⇒ **ni étagère, ni bouteilles** sur ⑩. Fait mesuré, pas un oubli |

### II.0.d La bascule — la matière partagée de ⑲ et ㉕

L'interrupteur existe en **deux copies à l'identique** : `Account/Settings/SettingsScreenController.cs:232-251`
et `Onboarding/TutorialScreenController.cs:344-363`. Mêmes dimensions, mêmes couleurs, même mécanique
(l'état est porté par la couleur de la piste et l'ancre du curseur — **aucun `Toggle` Unity**).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `bascule.course` <br>`Ecrans = ⑲ ㉕` | le `Button` de la ligne entière (`SettingsScreenController.cs:256-258`, `TutorialScreenController.cs:365-370`) ; l'état d'arrivée est déjà calculé (`BasculeTutoriels.Allumee`, `ShellContracts/BasculeTutoriels.cs:11`) | `Curseur` : `TranslationX` `Additif` **−Dx → 0**, `Dx` = ±42,7 u = ±36,0 px (`Reglage.Dx`, signe = sens de la course ; le contrôleur pose d'abord le curseur à sa position d'arrivée, la piste part de l'ancienne). Piste `Px(22)` = 93,9 u, curseur `Px(10)` = 42,7 u, retrait `Px(1)` de chaque bord (`SettingsScreenController.cs:241-251`). **140 ms**, `ease-out`, une fois. La couleur de l'`Interrupteur` (`Eteint` blanc α 0,18 ↔ `Or` `#d9ab4e`) **n'est pas animée** : elle change aussi d'alpha, que `Melange` ne porte pas ; le contrôleur la pose dans `quandFini`, quand le curseur touche le bout | Un interrupteur a une course : le curseur passe d'un bout de la piste à l'autre sous le pouce, et le laiton de la piste s'allume quand il arrive au bout. | `Transition` | 1 | durée 0 : la course est sautée, `quandFini` pose la couleur aussitôt (= le comportement d'aujourd'hui) | `PROPOSÉ` · les deux positions et les deux couleurs de repos sont **déjà dans le code** (`:240`, `:244-246`) : rien à inventer | — |

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
| `accueil.descente` | `CurrentHeat.escalated` (`DashboardController.cs:493-494`, la ligne « Descente ») | `Melange` de l'`Image` de fond de `Row_descente` (`RowBg` `#232a2d`, couleur pleine sans sprite, `minHeight 32 u` = 27 px, pleine largeur, créée `:751-763`) : `CouleurA = Cible` (`#232a2d`), **`CouleurB = #4a2a24`** (le fond réchauffé vers la braise de l'alarme ; Δ rendu **39/255 = 0,15** sur le rouge, ≥ plancher §0.3) ; **1 → 0 → 1**, **période 1,100 s**, `ease-in-out`, **infini**, **phase −0,400 s**, `PoseDeReposS = 0,000 s` (`Melange` 1 : la ligne réchauffée). Le fond seul : les `TMP_Text` de la ligne ne sont pas touchés (G6) | Quand la brigade est dans le quartier, la ligne bat au même rythme que le cerclage du médaillon et le filet de la barre — parce que c'est la même nouvelle, et qu'elle vient du même gyrophare. | `Alerte` | 1 | figé à `PoseDeReposS` (la ligne réchauffée, `#4a2a24`) : c'est l'état statique nommé de l'`Alerte` (design §5 : `Alerte` comprise) | `PROPOSÉ` · **période REUSE** `hud-brennar-canon: pouls` (1,100 s, `Shell/TopBarController.cs:782`) | — |

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
| `decision.distribuee` | ouverture de l'écran avec une carte servie : `EtatSabot == false` (`DecisionDetailScreenController.cs:174`, `:179-184`) | `carteRoot` = « CarteDuJour » (`:302-328`) : `Rotation` `Additif` **+5,0° → 0** au-dessus du repos de `:311` (repère Unity ; rendu : +7,0° → +2,0°), `Alpha` 0,00 → 1,00. **220 ms**, `cubic-bezier(.2,.8,.3,1)`, une fois. **Pas de `TranslationX`** : « CarteDuJour » est un enfant direct de « TableDeJeu » (`HorizontalLayoutGroup`, `:299-300`), `flexibleWidth = 1` (`:328`), sans `ignoreLayout` — G11 la refuse et la passe de layout l'écraserait | Une carte n'apparaît pas sur le zinc : elle y est jetée — elle arrive en tournant et s'arrête de travers. | `Transition` | 1 | durée 0 | `PROPOSÉ` · l'angle de repos (+2°) est **lu dans le code**, pas choisi (`:82`, `:311`) | — |
| `decision.cachet` | `BoutonLire.OnLongPressCompleted` (le `LongPressButton` du tampon, `:428-429`) | sur le `Tampon` (son `Image` `tf` : `RoundedRectOutline` rouge `#93402c` teinté `#d9cca9`, `:416-419`) : `Echelle` 1,00 → 1,06 → 1,00 et `Melange` 0 → 1 → 0 (`CouleurA = Cible`, `CouleurB = Cible × 0,75`), **180 ms** (`ease-out` puis `ease-in`), une fois. `Bloquante = false` | Le tampon s'abat : le caoutchouc écrase l'encre une fraction de seconde — elle fonce sous la pression —, puis se relève, et la mention reste. | `Transition` | 1 | durée 0 | `PROPOSÉ` · précédé de `retour.appui-long` (§II.0.a), qui est le REUSE canon | **Q9** : le geste **referme l'écran**. Il faut ordonner la fermeture APRÈS les 180 ms (non bloquant), sinon la frappe n'est jamais vue et l'entrée doit être **retirée** — une transition qu'on ne voit pas est une dette, pas une animation |
| `decision.jeton` | `pris == false`, soit `budget.cap_reached` faux (`:198-201`) : la décision de structure du jour est encore libre | `Jeton` (`ProceduralUI.RadialDisc` `#f2d9a0` → `#7a5a14` cuit dans le sprite, `Image.color` blanc, `Px(40)` = **170,7 u = 144 px**, `:356-363`) : `Melange` **1 → 0 → 1** (`CouleurA = Cible` = blanc, **`CouleurB = Cible × 0,82`** — le facteur de la lampe mesurée `mk-lampe`), **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 0,000 s`. Δ rendu sur le clair du disque (`#f2d9a0`) : 0,18 × 0,95 ≈ **0,17** (≥ plancher). Un `Graphic` blanc ne peut pas dépasser sa couleur : la lampe se lit en assombrissant le creux | La lampe de bureau du bureau est sur un vieux circuit : son filament bat lentement, et le laiton du jeton est la seule chose de la table qui le rende. | `Alerte` | 1 | figé à `PoseDeReposS` (design §5 : `Alerte` comprise). L'information de jeu ne dépend pas du battement : le jeton et son « 1 » restent affichés, c'est l'état statique nommé | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` (§0.5) | Pourquoi `Alerte` et non `Ambiance` : la cause est la lampe, mais **l'information est de jeu** (il reste une décision aujourd'hui) ; le battement s'arrête quand elle est prise (`Detacher`). Sous `Reduit` les deux genres gèlent (§5) : l'information tient au jeton lui-même |

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
| `famille.lampe-du-don` | en continu, tant que la rangée du Don est montée | `Halo` (le voile radial d'or du Don, `VoileRadial` à **α 0,14**, `LieutenantScreenController.cs:2381-2383`, **225 × 225 u = 190 × 190 px**) : `Alpha` `Multiplicatif` **0,82 → 1,00 → 0,82** sur un `CanvasGroup` posé dessus, **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 0,000 s` | Le Don reçoit sous une lampe de bureau ; son halo est la lumière de cette lampe, et un vieux filament ne tient pas une intensité fixe. | `Ambiance` | 1 | figé à `PoseDeReposS` (facteur 0,82) | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` | ⚠️ **Δ rendu faible, à MESURER** : 0,18 × 0,14 ≈ 0,025 au centre du voile (≈ 6/255), moins vers le bord. G13 (≥ 3/255) passe au centre ; la planche E4 le mesure, et sous 3/255 l'entrée est **retirée** comme le liseré de ㉓ (§0.3). Hôte **sous le `RectMask2D`** (`:1331`) : coût suspendu à E0 (design §4) |
| `famille.rang-ouvre` | tap sur une rangée de lieutenant → `OpenLieutenant(id)` (`:2733`) ; aujourd'hui `MajVisibiliteDetail` pose `CanvasGroup.alpha = 0 ou 1` **en une affectation** (`:1849`, `:1860`) | les `sectionsDetail` **actives** parmi les 7 (`:1404`, `:1418`, `:1433`, `:1447`, `:3258`, `:3275`, `:3283` ; trois naissent `SetActive(false)`, `:3257`, `:3274`, `:3282`, et ne s'allument que sous condition, `:3407-3411`), chacune son `CanvasGroup` (`MajVisibiliteDetail`, `:1841-1849`) : `Transitionner` `Alpha` **de 0,00 vers 1,00** (le propriétaire pose 1 en une affectation, `:1849`), **160 ms**, `ease-out`, une fois. Le contrôleur n'attache QUE les sections actives (4 à 7 pistes) ; **7 est le majorant** compté pour G4 | On ouvre la chemise d'un homme : les pages ne sautent pas sous la main, elles viennent. | `Transition` | 7 | durée 0 (= le comportement d'aujourd'hui, à l'identique) | `REUSE canon screen_3:451` (« transitions arbre + `SplitFlapReadout` ≤ 250 ms ») · **l'hôte existe déjà** (`:1847-1848`) : zéro objet neuf | — |

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
| `revue.jeton-rendu` | `verdict.token_returned` (`DailyReviewScreenController.cs:662`) ; aujourd'hui `Jeton.localRotation = +12°` (`:667`) et `Bulle.alpha = 0,72` (`:658`) sont posés **d'un coup** | **`revue.jeton-rendu/jeton`** — `Jeton` : `Transitionner` `Rotation` **de 0° vers +12,0°** (repère Unity : le code pose `+12°` à `:667`, son commentaire le dit « `rotate(-12deg)` en CSS »), **220 ms**, `ease-out` (le bord du disque de 122 px parcourt **12,7 px**) · **`revue.jeton-rendu/bulle`** — `Bulle` (`CanvasGroup` existant, `:443`) : `Transitionner` `Alpha` **de 1,00 vers 0,72** (la valeur que le code pose à `:658`), **200 ms**, `ease-out`. Une fois | On rend le jeton : il est poussé sur le zinc et s'arrête de travers, et le billet de l'homme n'a plus besoin d'être lu. | `Transition` | 2 | durée 0 (= le comportement d'aujourd'hui) | `REUSE canon screen_11:255` (« card passe à l'état `VALIDATED`, animation flip-out ») · les deux valeurs d'arrivée sont **déjà dans le code** | ⚠️ Le canon se contredit sur le mot : `screen_11:255` et `:396` disent **flip**, `screen_11:280` dit **slide-out**. Je propose la rotation, qui est celle que le code pose déjà |
| `revue.cachet` | `AppliquerLotSigne` pose `lotSigne` (`:719-724`, `:722`) et rend le cachet visible (`tamponCachet.SetActive(true)`, `:735`) ; `TamponSigne` (`:751`) le constate. ⚠️ `:395` `tamponRoot.SetActive(tamponDisponible)` peut éteindre tout le tampon au rendu suivant : la piste est alors libérée (cible inactive) | `Cachet` (papier `#efe4c6cc` incliné de **+14°**, `:1286-1311`, `ignoreLayout` `:1288`) : `Rotation` `Additif` **+6,0° → 0** autour de son inclinaison de repos et `Alpha` 0,00 → 1,00, **160 ms** / **120 ms**, `ease-out`. Une fois. **Pas d'`Echelle`** : le `Cachet` porte lui-même un `ContentSizeFitter` (`:1304-1306`), G11 | Le cachet est abattu d'un coup sec : il tombe en pivotant sur le registre, et la marque reste de travers. | `Transition` | 1 | durée 0 | `PROPOSÉ` · précédé de `retour.appui-long` sur `BatchConfirmButton` (`:1276`) | — |

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
| `file.cachet` | `ApresPresent` devient vrai (`:425`, posé par `trancheeIssue`/`garderTranchee`, champs déclarés `:418-420`, bloc activé `:517` `apresBloc.SetActive(montre)`) | `Cachet` (conteneur incliné de **+8°**, qui **déborde** du verre, `:477-495`) : `Rotation` `Additif` **+6,0° → 0** autour de son inclinaison et `Alpha` 0,00 → 1,00, **160 ms** / **120 ms**, `ease-out`. Une fois. **Pas d'`Echelle`** : un `ContentSizeFitter` est posé sur le `Cachet` (`:499-501`) et sur son ancêtre `Comptoir` (`:1132`), G11 | La carte tranchée reçoit son cachet : on l'abat de travers sur le verre — il pivote en tombant — et il reste là jusqu'à demain. | `Transition` | 1 | durée 0 | `PROPOSÉ` — le canon le réclamait sans le dessiner (`front.md:1512` : « `outcome` **cacheté** — Q3 du juge, **jamais dessiné** ») ; il **est** dessiné aujourd'hui, il n'est simplement pas abattu | — |
| `file.part` | un attendant devient `parti` (`:596`, `:610` : `CanvasGroup.alpha = 0,28`) | `CanvasGroup` de l'attendant : `Transitionner` `Alpha` **de 1,00 vers 0,28** (la valeur que le code pose, `:610`), **200 ms**, `ease-out`, une fois. **Pas de translation** : l'attendant est un enfant de `fileRoot` (`HorizontalLayoutGroup`, `ExceptionQueueController.cs:1149`) dont le `LayoutElement` n'a pas `ignoreLayout` (`:618`, `:1420-1430`) — G11 | L'homme qu'on vient de renvoyer s'écarte du comptoir et s'efface dans l'ombre — il ne disparaît pas. | `Transition` | 1 | durée 0 (= le comportement d'aujourd'hui) | `REUSE canon screen_5:340` (« row disparaît, **fade out** `T.ui.anim_max_block_ms` ») · l'alpha d'arrivée (0,28) est **déjà dans le code** | — |

⚠️ **Chemin mort relevé au passage** (pas une animation, mais il mord le même code) : `headerText`
(`:46`) et `rowsArea` (`:47`) ne sont jamais assignés, et `RenderError()` les déréférence (`:1038-1039`).
Le voile d'erreur « Le comptoir n'a pas répondu » n'a aucun hôte vivant.

---

## ⑩ Le détail d'un raid — la main de cartes

Ce lieu, c'est la main qu'on vous tend au comptoir : trois cartes en éventail, la suggérée déjà
sortie du rang, et un talon qu'on peut déplier. — Fiction : `front.md:1512` (« la **main de cartes** =
le détail ⑩ ») et `front.md:1530` (« Exception — le détail d'un raid »).

Réellement dessiné : 3 cartes de `Px(100) × Px(150)` = **427 × 640 u**, chacune à son angle **statique**
(en CSS −5° risquée ♠ · 0° suggérée ♦ · +5° apprendre ♣ ; en Unity, après la négation de `:532`, **+5° / 0° /
−5°**) et à sa levée **fixée par le RÔLE** (la suggérée est remontée, les deux autres descendues :
`translateYCss` −8 / +6 / +6, `:381-385`, appliqué `:531`), `Operational/Exceptions/ExceptionDetailController.cs:380-385`, `:531-532`.
**Choisir une autre carte ne déplace aucune carte** : `selection` ne change que la couleur du filet (`:562`) — la
v2 animait une levée qui n'existe pas (`main.levee`, retirée en v3) ;
un `Talon` rouge de `Px(34) × Px(50)` = **145 × 213 u** (`:392-401`) ; le même `Tampon` que ⑨ (`:449-453`,
`surTap: null` — **seul l'appui long agit**) ; le même décor de comptoir, zinc à 15 %, **sans étagère**.

Porte aussi : `comptoir.lampe` (§II.0.c — pas `comptoir.bouteilles`, voir sa question).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `main.distribuee` | ouverture de l'écran, la main est servie (`:365-373`, `:380-385`) | les 3 `Face` : `TranslationY` `Additif` **+48 u → 0** (repère Unity : la carte arrive d'au-dessus, du côté du donneur ; = 40,5 px), `Rotation` `Additif` **+9,0° → 0** autour du repos de chaque carte — repos en repère **Unity : +5° ♠ / 0° ♦ / −5° ♣** (`:532` applique `Euler(0,0,-rotationCss)` aux `rotationCss` −5 / 0 / +5 de `:381-385`) —, `Alpha` 0,00 → 1,00. **150 ms** chacune, `ease-out`, une fois, **décalées de 0 / 45 / 90 ms** (`Reglage.PhaseS` = 0 / +0,045 / +0,090 s, l'équivalent d'un `animation-delay` positif ; pendant le délai la carte tient sa première image clé, α 0) ⇒ la dernière finit à **240 ms**. `Bloquante = false` | On distribue une main : les trois cartes arrivent l'une après l'autre et s'arrêtent en éventail, chacune à son angle. | `Transition` | 3 | durée 0 | `PROPOSÉ` · les 3 angles et les 3 levées de repos sont **lus dans le code** (`:381-385`, appliqués `:532`) | 240 ms au total, **non bloquant** : le décalage est une suite de 3 pistes de 150 ms, pas une animation de 240 ms. Si f2 préfère la lecture stricte de G8, supprimer le décalage (les 3 cartes arrivent ensemble) coûte la fiction du « distribué » |

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
| `semaine.jeton-depense` | une décision est confirmée (`Decider`, `:322-335`) : un jeton passe de `Libre` (or) à `Depense` (`Eteint`, blanc α 0,18) | sur le jeton concerné (**47 px** de diamètre ; sa couleur `Libre` → `Depense` est **cuite dans le sprite** par le contrôleur, `Jeton(bool libre)`, `:231-239`, et change d'un coup) : `Echelle` **1,00 → 0,94 → 1,00**, **200 ms** (`ease-in` puis `ease-out`), une fois | Un jeton dépensé n'est pas effacé : on le retourne sur le tapis — il perd son or d'un coup — et il s'enfonce d'un cheveu sous le doigt. | `Transition` | 1 | durée 0 — et le canon le demande explicitement (`screen_13:372` : « mouvement réduit = valeur statique ») | `REUSE canon screen_13:281` (« `ProblemCardWidget` … animation flip-out, `DecisionBudgetReadout` décrémente ») et `screen_13:372` (« ≤ 250 ms, **interruptible** ») | — |
| `semaine.aiguille` | `stress_bucket` change entre deux chargements (`:202-203` : `tendu` = `crushing` ou `compression_active`) | `Rotation` de l'aiguille, de l'angle de l'ancienne bande à celui de la nouvelle, **700 ms**, `ease-in-out`, une fois | Une aiguille ne saute pas d'une graduation à l'autre : elle balaie, et c'est le balayage qui dit que la ville a serré d'un cran. | `Transition` | 1 | durée 0 | **`ecrans-brennar-6` : B11** = l'aiguille du cadran TENSION de ⑭ (`inventaire-animations.md:58` : transition `transform .7s`, 6 cadres 14-19, `transitions-brennar-6.json`), **absente côté client** : `SansHote:⑭ cadran absent` (design §7) jusqu'à E4. (B10, l'aiguille du HUD, est `chrome.aiguille.balayage`, design §9 — pas cette entrée) | ⛔ **HÔTE À CONSTRUIRE (client, E4)** : le cadran TENSION de ⑭ est dessiné par l'atelier (cadres 14-19, A2 faite côté atelier) mais le client rend `stress_bucket` en texte. 700 ms > 250 ms : **non bloquant** (`Bloquante = false`, G8 ; Q2 résolue) — c'est la durée mesurée de la maquette |

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
| `police.dispatch` | `tendu` (`dispatcher_regime == "SURGE"` ou `"BACKLOGGED"`, `:308`) — le répartiteur du secteur déborde | le glyphe `Regime` de chaque ligne tendue (**32 × 32 px**, `gl.color = Braise` = `hudGaugeArcHot`, `InspectionScreenController.cs:318`) : `Melange` **0 → 1 → 0** (`CouleurA = Cible`, `CouleurB = Cible × 1,35`, borné à 1 par canal), **période 1,600 s**, `ease-in-out`, **infini**, **phase −0,600 s**, `PoseDeReposS = 0,800 s` (le pic). **Même phase pour toutes les lignes** : c'est le même tableau | Un tableau de dispatch est une console de répartition (voyants LED) : quand un secteur déborde, son voyant n'est pas allumé fixe — il bat, et c'est comme ça qu'un répartiteur le repère d'un coup d'œil. | `Alerte` | **6** | figé à `PoseDeReposS` (le voyant à son pic) : état statique nommé de l'`Alerte` (design §5). G5 : 1,6 s ≥ 0,667 s | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-veille` (`brightness` **1,0 → 1,35 (p = 0,5) → 1,0**, mesuré dans `oracle-css-ecrans-brennar-6.json`, `durS` 3,2 dans l'oracle ; la paire : `inventaire-animations.md:33`) — **même ordre d'extrema** (pic à mi-période) ; **période raccourcie à 1,6 s**, écart assumé : un voyant de dispatch qui déborde bat plus vite qu'un voyant de veille | Budget plafonné à **6** voyants, dans l'ordre de la liste : c'est le compte réel mesuré par la fiction (`front.md:1768` : « `belief` **mesuré HUNTING ×6 dès le J1** »). Au-delà, la régie refuse (quota du design §4) : **pas de voyant**, jamais un voyant à moitié |
| `police.baton` | `baton` = `DernierRapport.backlash_triggered` (`:263`) | `batonTexte` (`TMP_Text`, `Px(9)` = **38 u = 32 px**, `Braise`, `:433-436`) : `Alpha` 0,00 → 1,00, **200 ms**, `ease-out`, une fois. **`Alpha` seul** (G6) | C'est une ligne qu'on vient d'ajouter au registre : l'encre paraît sous le stylo, elle n'était pas là avant le geste. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

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
| `commissariat.crans` | `CroyanceRang` ou `PatrouilleRang` monte entre deux chargements (`:271-272`, `:278-279`) | le cran qui vient de s'allumer (**101 × 21,6 px**) : `Alpha` 0,00 → 1,00 et `Melange` **1 → 0**, **`CouleurA = Cible`** (la teinte du rang, `im.color`, `PrecinctScreenController.cs:239`) et **`CouleurB` = blanc** : le sprite porte DÉJÀ la teinte (`:237`) et `Image.color` la multiplie une seconde fois, donc le cran s'allume d'abord à la teinte pure du sprite (couleur blanche) puis se pose à sa teinte de rang (teinte × teinte). Δ rendu = t − t² par canal, mesuré sur `DesignTokens.asset` (`:73`, `:77`, `:78`) : max **0,24** pour `Braise` (vert), **0,22** pour `Or` (vert), **0,17** pour `Creme` (bleu) — tous ≥ plancher. **200 ms**, `ease-out`, une fois | Ce que la police croit vient de monter d'un cran : sur le tableau, c'est une encoche de plus qui prend la couleur, et elle la prend au moment où le greffier la marque. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

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
| `vitrine.acquis` | un achat aboutit : `Acheter()` → `Charger(token)` (`:327-335`, `:334`) ; au rendu suivant, `possede` est vrai pour ce `sku_id` (`:195`) | `Possede` (le `TMP_Text` « ACQUIS », `:240-241`, rendu seulement quand `possede` est vrai) : `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`, une fois, au rendu qui suit l'achat. **L'`Objet` n'est pas animé** : le disque de laiton est construit pour TOUT article, sa couleur ne dépend pas de `possede` (`:223-228`) — rien ne change sur lui à l'achat. `Alpha` seul (G6) | L'article passe de la vitrine à votre poche : le commis retourne l'étiquette, et elle dit « acquis ». | `Transition` | 1 | durée 0 | `PROPOSÉ` | ⚠️ `Rendre()` **détruit tous ses enfants** à chaque appel (`:171-172`) : la transition s'attache au rendu **qui suit** l'achat, et le contrôleur sait quel `sku_id` a été acheté. C'est la règle générale de ce catalogue (§VI.2) |
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
| `autonomie.appel` | le rapport **le plus vieux** par `backlog_age_cycles` (`AutonomyDtos.cs:26`), tant qu'au moins une de ses questions n'est pas décidée (`issue.decided` vide, `:316`) | son `ReportHeader` (`TMP_Text`, fontSize **24 u = 20 px**, `Bold`, `:285-289`) : `Alpha` **1,00 → 0,62 → 1,00**, **période 1,600 s**, `ease-in-out`, **infini**, **phase −0,600 s**, `PoseDeReposS = 0,800 s`. **`Alpha` seul** (G6) | Un bippeur ne dit pas une seule fois qu'un message attend : il répète son appel tant que personne n'a répondu, et c'est le plus vieux des rapports qu'il répète. | `Alerte` | 1 | figé à `PoseDeReposS` (α 0,62 : l'en-tête du plus vieux rapport en demi-teinte), design §5 : `Alerte` comprise. G5 : 1,6 s ≥ 0,667 s | `PROPOSÉ` | **Q8** : quel âge compte comme « qui traîne » ? Ma recommandation : **le plus vieux seulement, quel que soit son âge** — une console de répartition n'allume pas douze voyants à la fois, et `backlog_age_cycles` n'a pas de seuil servi |
| `autonomie.reponse` | `Resolve` aboutit (`:192-215`) : `issue.decided` devient non vide | `Decided` (« ✓ Décidé », `TMP_Text`, `AutonomyInboxController.cs:319-322`) : `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`, une fois, au rendu qui suit la réponse. **Les deux blocs `Option_A`/`Option_B` ne s'effacent pas en fondu** : une question décidée est rebâtie SANS eux (`ClearRows()` `:463-469`, puis `return` avant `AddOptionBlock`, `:316-323`) — il n'y a rien à faire disparaître. `Alpha` seul (G6) | On tape le chiffre sur le clavier : l'afficheur efface les choix d'un coup et imprime la réponse — un bippeur n'affiche qu'une ligne à la fois. | `Transition` | 1 | durée 0 | `PROPOSÉ` | ⚠️ `ClearRows()` détruit tout (`:463-469`) : s'attache au rendu **qui suit** la réponse (§VI.2). v1 animait aussi la sortie des options : impossible, elles n'existent plus au rendu suivant |

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
| `premiere-fois.lecon` | `MarquerVu` aboutit (`:375`, lancé `:295`) et la leçon suivante est rendue (`PremierEligibleNonVu`, `:114-120`) | `Texte` de la leçon **suivante** (le `TMP_Text` NEUF, **59,7 u = 50 px**, or, `:290-292` ; `Rendre` détruit l'ancien, `:227-228`) : `Alpha` 0,00 → 1,00, **110 ms**, `ease-out`, une fois, au rendu qui suit `MarquerVu`. **La moitié sortante n'est pas animée** : l'ancien texte n'existe plus quand le nouveau est rendu (un fondu croisé ne s'attache pas « au rendu qui suit », §VI.2). `Alpha` seul (G6) | On tourne la page : la leçon d'après apparaît sur la page blanche, jamais par-dessus celle d'avant. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

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
| `distribution.ficelle-tendue` | `enTransit` devient vrai (un courrier `IN_TRANSIT`, `:394`, `:399`), puis `arrivee` (`transit_band == "ARRIVED"`, `:400`) | `Parametre`, canal 0 = l'**amplitude** de l'onde de la ficelle, `Absolu`, par `Transitionner(de, vers)` : **de** `Px(6)` (la valeur que le code passe aujourd'hui en constante, `amplitude: Px(6f)`, `:523`) **vers** `Px(2)` au départ, et l'inverse à l'arrivée (25,6 u ↔ 8,5 u, un ventre de **21,6 px ↔ 7,2 px**). ⚠️ **Le second état est PRESCRIT** : rien dans le code ne dérive l'amplitude de `enTransit` (`:394`) ni de `transit_band` (`:400`) ; E4 ajoute cette dépendance. **240 ms**, `ease-out`, une fois. Puits : `DistributionFicelleGraphic` (`:1340`) implémente `IParametreAnime.PoserParametre(0, v)` et relaie à `DefinirTrace(…, amplitude: v)` (signature `:1361-1363`) | Quand le chargement part, la ficelle se tend : le mou se résorbe entre les deux punaises, et il revient quand il est arrivé. | `Transition` | 1 | durée 0 | `PROPOSÉ` | Hôte : `DistributionFicelleGraphic` **existe** ; il lui manque l'implémentation d'`IParametreAnime` (une méthode, lot E4). Câblable |
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
| `appro.commande-partie` | `enCours` = `dto.has_pending_order` devient vrai (`:382`) : la 5ᵉ ligne `la_commande` apparaît sur le bon (`:466`) | la rangée `Ligne_la_commande` (`ConstruireLigne`, `:490-506` : un conteneur sans `Graphic` qui ne porte que les deux `TMP_Text` `Libelle` et `Valeur`, `:498`, `:504`) : `Alpha` 0,00 → 1,00, **200 ms**, `cubic-bezier(.3,.7,.2,1)`, une fois. La cible est le conteneur, pas un texte : `Alpha` seul, une piste (G6) | La ligne de commande est portée au bon à la main : l'encre paraît sur le papier pelure au moment où on l'écrit. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |

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
| `service.jeton` | `JetonDisponible` (`:735`, dérivé de `JetonDeStructure.Connu`/`PlafondAtteint`, `:360-362`) : la décision de structure du jour n'est pas prise | le `Rond` du jeton (**58 px**, `RadialDisc` blanc, `disque.color = Or`, `DelegationScreenController.cs:1051-1054`) : `Melange` **1 → 0 → 1** (`CouleurA = Cible` (`Or`), **`CouleurB = Cible × 0,82`**, le facteur de `mk-lampe`), **période 4,600 s**, `ease-in-out`, **infini**, **phase −0,900 s**, `PoseDeReposS = 0,000 s` (le creux). Δ rendu ≈ 0,18 × 0,85 ≈ **0,15** sur le canal le plus clair de l'or (≥ plancher) | Le tableau de service est éclairé par une seule lampe de bureau, et le laiton du jeton est le seul objet de la planche qui la rende : tant que la décision du jour n'est pas prise, on la voit bouger dessus. | `Alerte` | 1 | figé à `PoseDeReposS` (design §5 : `Alerte` comprise) ; l'information (il reste une décision) tient au jeton disponible lui-même | `PROPOSÉ` · forme **REUSE** `ecrans-brennar-6: mk-lampe` | ⚠️ Hôte **sous le `RectMask2D`** (`:979`) et canal de **couleur** : son coût dépend du **spike E0** (design §4). Le jeton dépensé **ne bat pas** : `Detacher`, et retour au `Repos` (`#2a2320`) |
| `service.cartel` | `Confier` aboutit (`:534`) : `delegation_state` passe de `SELF` au nom d'un homme | **`service.cartel/cro`** — le `Cro` de la plaque (**38 × 85 u = 32 × 72 px**, `croImg.color`, `:1133`) : `Melange` **1 → 0** (`CouleurA = Cible` = `OrSombre` `#8a6a22`, posé par le contrôleur à l'arrivée ; `CouleurB = CroLibre` `#46515c`), **200 ms**, `ease-out` · **`service.cartel/qui`** — le `TMP_Text` `Qui` (`:1164`) : `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`. Une fois | On glisse un cartel au nom de l'homme dans la fente de la plaque : le laiton remplace le vide, et le nom est écrit dessus. | `Transition` | 2 | durée 0 | `PROPOSÉ` · les deux couleurs de cartel sont **dans le code** (`:1131-1140`) | ⚠️ Sous le masque (canal de couleur) ⇒ coût suspendu à E0 |

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
| `demolition.fiche-sortie` | `OuvrirFiche(b)` (lancé `:529` et `:609`) : l'état passe à `Fiche` (`:88`, `:418-430`) | la `Fiche` : `Alpha` 0,00 → 1,00, **200 ms**, `ease-out`, une fois. **Pas de `TranslationX`** : la `Fiche` (`:673`) est un enfant de « Contenu » (`zoneCentrale`), qui porte un `VerticalLayoutGroup` (`:1202`) **et** un `ContentSizeFitter` (`:1210`) ; seul son `Dos` a `ignoreLayout` (`:682`) — G11 | On ne lit pas une fiche sans la sortir du tiroir : elle remonte de l'ombre de la table avant de s'arrêter devant vous. | `Transition` | 1 | durée 0 | `PROPOSÉ` | ⚠️ Sous le `RectMask2D` (`:1185`) : `Alpha` par `CanvasGroup`, coût suspendu à E0 (design §4) |
| `demolition.offre-fermee` | `fermee` (`:778`, `:843`) : une offre se ferme (`REPLACEMENT_OPTION_ALREADY_CLOSED`) et son `Tag` devient « DÉJÀ PRISE » en `TagFerme` `#8b6a6a` (`:967`, `:981`) | le `Tag` (son `Image`, `tb.color = TagFerme` `#8b6a6a` posé par le contrôleur, `:967-972`) : `Alpha` 0,00 → 1,00 (le `CanvasGroup` du `Tag` emporte son texte enfant « DÉJÀ PRISE » : la cible est l'`Image`, pas le texte — G6), **200 ms**, `ease-in`, une fois. **Le disque de `Rang` n'est pas animé** : sa couleur dépend du RANG (`premiere = o.rank == 1`, `:911` ; `:929`), pas de la fermeture — il garde `OrSombre` sur une offre n°1 fermée, il n'y a donc aucun virage à montrer | L'offre est partie : quelqu'un a barré la ligne au crayon gras avant vous, et la mention arrive comme le trait. | `Transition` | 1 | durée 0 | `PROPOSÉ` · la couleur d'arrivée du `Tag` est **dans le code** (`:967`, `DemolitionResolvers.TagFerme` `:1549`) | ⚠️ Sous le masque ⇒ coût suspendu à E0 |

---

## ㉞ Les ordres du soir — le carnet réglé

Ce lieu, c'est un carnet d'ordres ouvert sur la table, huit créneaux numérotés, et un stylo. —
Fiction : `front.md:1113`, verbatim : « le **carnet d'ordres réglé** (créneaux numérotés), puis le fil
des quartiers et le calendrier » ; et `front.md:1115` : « **ON NE DONNE PAS UN ORDRE : ON COMPOSE UNE
SOIRÉE.** `POST /v1/cue-stack/compose` valide **4 à 8 créneaux** ».

⚠️ **Le « carnet réglé » est un rectangle plat.** Ce fichier ne contient que **6 sites de création
d'`Image`** (`Operational/Carnet/CarnetScreenController.cs:461`, `:576`, `:593`, `:638`, `:779`, `:807`) :
aucune page, aucune reliure, aucune spirale, **aucune ligne réglée**, aucun signet, aucun filet,
aucune pastille. Le carnet est **une seule `Image`** de couleur papier (`CouleurPapier` = `(0,898 ;
0,878 ; 0,816)`, `:616`, posée `:807`), et le « réglage » n'est suggéré que par le `spacing` de 1 px
CSS entre les créneaux (`:819`). Les 8 créneaux sont **toujours** dessinés (`:411-422`). Défilement :
**`RectMask2D` seul** (`:810`), aucun `ScrollRect` — le carnet **coupe**, il ne défile pas ; son `Contenu` porte un `ContentSizeFitter` (`:822`) : aucune translation ni échelle n'y est posée (G11).

| id | déclencheur / état | mouvement | cause dans la fiction | genre | pistes | réduit | source | question |
|---|---|---|---|---|---:|---|---|---|
| `carnet.encre` | un créneau passe de « — rien — » (`:746-747`) à un ordre posé (`Titre` + `Sous`, `:756-760`) — le composeur vient de l'écrire | le conteneur `Corps` de la ligne (`:736`, il ne porte que les `TMP_Text` `Titre` — 11 px CSS serif gras — et `Sous` — 8 px CSS —, `:756-760`) : `Alpha` 0,00 → 1,00, **220 ms**, `cubic-bezier(.3,.7,.2,1)`, une fois. La cible est le conteneur, pas un texte : `Alpha` seul, une piste (G6) | On écrit l'ordre sur la ligne : l'encre prend sur le papier le temps d'un trait de stylo, elle n'est pas là avant le geste. | `Transition` | 1 | durée 0 | `PROPOSÉ` | — |
| `carnet.en-main` | `AppuiLong` posé sur chaque ligne du carnet par `BrancherLigne` (`CarnetScreenController.cs:463-464`), son `Action` = `PrendreEnMain(index)` ; la marque suit l'appui (`OnPointerDown` → minuterie `Duree = 0.5f`, `AppuiLong.cs:10-20`) | la **`Marque`** de la ligne — une `Image` enfant **à créer** par `BrancherLigne` (`:455-466`), étirée, `ignoreLayout`, couleur `CouleurEnMain` `(0,851 ; 0,824 ; 0,741)` (`:461`) : `Alpha` 0,00 → 1,00 sur **500 ms**, `linear`, une fois ; retour à 0,00 en **120 ms** si le doigt part avant le seuil. **Pas sur la ligne elle-même** : un `CanvasGroup` posé sur la ligne ferait fondre ses textes (design §3, « Application »). `Bloquante = false` | On appuie sur la ligne pour la décoller du carnet : le papier marque sous le pouce avant de céder. | `Retour` | 1 | figé à `PoseDeReposS = 0,000 s` (design §5 : l'exception (i) d'un `Retour` est bornée au `Melange` et au voile de `retour.appui-voile` ; cet `Alpha`-ci n'en est pas) : pendant l'appui rien ne bouge ; au seuil, `PrendreEnMain` re-rend la ligne avec son fond `CouleurEnMain` — la marque apparaît d'un coup, et l'alternative reste accessible | `PROPOSÉ` · la couleur d'arrivée est **dans le code** (`:461`, `:620`) | **Q12** résolue (f2) : `AppuiLong.Duree = UiTimingTunables.AppuiLongDeplacementMs / 1000f`, constante **à créer** (500) |

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
| `conflit.salle` | en continu | les 7 `Silhouette_*` : `TranslationX` `Additif` **−21,3 u → +21,3 u → −21,3 u** (= ±5 px CSS, une course de **36 px** à l'écran), **période 11,000 s**, `ease-in-out`, **infini**, `PoseDeReposS = 0,000 s` (−21,3 u, hors repos, G3). **Phases distinctes** : −1,2 / −3,6 / −5,9 / −7,4 / −9,1 / −2,7 / −6,3 s. **Plus de canal `Alpha`** : à 0,82 → 1,00 sur des silhouettes déjà sombres, son Δ rendu était ≈ 1,6/255, sous G13 ; le mouvement tient à la translation | Au fond de la salle, les gens ne sont pas des statues : ils se déplacent lentement entre les tables, et leurs silhouettes passent devant la lumière du bar. | `Ambiance` | **7** | figé à `PoseDeReposS` — **les 7 à la même pose** (−21,3 u) : le gel évalue le mouvement à `PoseDeReposS` **sans** `PhaseS` (§0.4) | `PROPOSÉ` | **Les phases distinctes sont justifiées ici, et nulle part ailleurs** : chaque silhouette est une personne différente. Partout où la cause est **une lampe**, la phase est commune (§0.5). C'est contrôlable ligne à ligne |
| `conflit.envoi` | `ChoisirFamille(cle)` (`:111-116`, `ChoixFamille = cle` `:114`) : au rendu qui suit, la rangée choisie naît avec son liseré `BordChoisi` (`:708`, `:714-721`) et son badge `CeSoirCadre` (`:786-804`). ⚠️ **Pas l'envoi** : `EnvoyerCeSoirEtRecharger` remet `ChoixFamille = null` avant de recharger (`:364`), et les deux objets disparaissent | **`conflit.envoi/bord`** — `BordChoisi` (liseré `#8a6a22` **cuit dans le sprite**, `Image.color` blanc, trait `Px(1)` = 3,6 px, `ignoreLayout`, `:714-721`) : `Alpha` **0,35 → 1,00**, **220 ms**, `ease-out` · **`conflit.envoi/cadre`** — `CeSoirCadre` : `Alpha` 0,00 → 1,00, **160 ms**, `ease-out`. Une fois. (Un sprite cuit sous un `Image.color` blanc ne s'éclaircit pas : la lumière se lit en montant l'alpha du liseré) | On désigne la famille pour ce soir : le cartel « CE SOIR » est posé sur sa rangée, et le laiton du cadre prend la lumière, le temps qu'on le pose. | `Transition` | 2 | durée 0 | `PROPOSÉ` | ⚠️ Les deux hôtes sont **sous le `RectMask2D`** (`:1219`) ⇒ coût suspendu à **E0**. `conflit.salle`, lui, est **hors masque** (`SceneHaute`, `:1322-1330`) : sa translation ne dépend pas d'E0 |

---

# III. Demandes à l'atelier — ce qu'il faut DESSINER

Classées par ce qu'elles débloquent. Chacune nomme l'entrée qui l'attend et la ligne de fiction qui la
réclame — aucune demande n'est formulée sans source.

| id | écran | ce qu'il faut dessiner | ce que ça débloque | la fiction qui le réclame |
|---|---|---|---|---|
| **A1** | ㉑ Marché | ✅ **FAIT (atelier, cadre 146)** : la tuile Ash du marché porte sa grappe de prismes et **4 éclats** (4 instances `mk-eclat` mesurées, `dur` 5 200 ms, délais −4,2 / −3,9 / −2,6 / −1,3 s, `inventaire-animations.md:37`, `:65`). Rien de plus à dessiner | la paire `mk-eclat` a son hôte **dans la maquette** ; côté client elle reste `SansHote:㉑ écran non monté` (§I.3) | `front.md:1715-1720` : « **LA MARCHANDISE REMPLACE LE PERSONNAGE** … ash→labo spécialisé, canal de luxe (**poudre → prismes**) » |
| **A2** | ⑭ La semaine | ✅ **Côté atelier, FAIT** : les cadres 14-19 dessinent le cadran TENSION (trois arcs, aiguille et pivot, six angles), et son aiguille balaie en transition CSS `.7s`. **Ce qui reste est du client** : construire le manomètre (étape E4 du design §11, à CLIENT-3) en réutilisant la géométrie du chrome — `Shell/TopBarController.cs:1315-1327` (face), `:1387` + `:1609-1625` (arcs `ProceduralUI.ArcCuit`), `:1515-1524` (aiguille, pivot `(0.5, 0)`), `:1526-1535` (pivot) | **`semaine.aiguille`** (§II.⑭) = la paire d'inventaire **B11** | `front.md:1557` : « la ville serre (**manomètre** = `stress_bucket`… ) ». ⚠️ Écart mesuré : `stress_bucket` est aujourd'hui rendu **en texte** (`CompressionScreenController.cs:194-204`, `:461-471`) |
| **A3** | ㉓ La vitrine | **la vitre du comptoir, sa bande de reflet et sa fenêtre de découpe** : une bande oblique claire de ≈60 u de large, et un masque qui l'empêche de sortir du comptoir | **`vitrine.reflet`** (§II.㉓) | `front.md:1861` : « comptoir de laiton, **vitre avec ses reflets**, étagères de velours » |
| **A4** | ㉘ La distribution | **la photo punaisée du coursier pris**, épinglée par **un seul coin** (c'est le coin unique qui rend le battement possible) | **`distribution.photo`** (§II.㉘) | `front.md:1249` : « **Le cadre qui vaut l'écran : un coursier s'est fait prendre. Sa photo est punaisée, la ficelle pend derrière.** » |
| **A5** | ⑲ Les réglages | ✅ **FAIT (atelier, cadres 147-148)** : la ligne « Mouvement réduit » est dessinée sur le gabarit de bascule existant (`Account/Settings/SettingsScreenController.cs:220-259`), section « Le jeu ». Canon : i18n `settings.a11y.reduced_motion` → FR « **Mouvement réduit** » (`screen_14:208`), rôle `switch` (`:298`), défaut **Off** (`:71`). Le canon en veut **un second** (`settings.game.disable_autoplay`, `:78`, `:212`) : hors de ce lot | **le §5 du design** : la seconde source de `PolitiqueMouvement` (avec Android), la seule sur iOS ; persistance `PlayerPrefs` (E2) | `screen_14:71`, `:146`, `:251` (Q4 résolue) |
| **A6** | ㉛ La loi | **le parloir** : la vitre, le prévenu derrière, la liste devant. 6 cadres de maquette existent (m-67..72), **0 est construit** | ㉛ sort de « sans mouvement » ; aucune entrée ne l'attend aujourd'hui | `front.md:1187-1188` ; le contrôleur ne crée **aucune forme** (`LoiScreenController.cs`, 0 appel à `ProceduralUI`) |
| **A7** | ㉒ Votre profil | **la molette de laiton, les leviers, les plaques de compteur frappées** de la porte de coffre | ㉒ sort de « sans mouvement » | `front.md:1821-1822` |
| **A8** | ㉞ Les ordres du soir | **les lignes réglées du carnet** (et sa reliure) : aujourd'hui le carnet est **une seule `Image` plate** (`CarnetScreenController.cs:807`) | rien — `carnet.encre` fonctionne sans ; c'est une dette de DA, pas un blocage | `front.md:1113` : « le **carnet d'ordres réglé** (créneaux numérotés) » |
| **A9** | ㉟ ㊱ ㊲ ㊳ ㊴ ㊵ | ⛔ **SANS OBJET** : les six `*6-scan` sont retirés de la maquette (atelier 9469d5a) et de l'inventaire (Q10) | — | — |

**9 demandes, dont 3 faites par l'atelier (A1, A2 côté atelier, A5) et 1 sans objet (A9).** Restent **2
qui débloquent une entrée** de ce catalogue (A3 → `vitrine.reflet`, A4 → `distribution.photo`) et **3
dettes de DA** qui ne bloquent rien (A6, A7, A8). `semaine.aiguille` n'attend plus l'atelier : elle
attend le manomètre de ⑭, que le client construit en E4.

---

# IV. Questions pour f2 et pour l'user — avec ma recommandation

> **État au 08/10 : les 12 questions sont RÉSOLUES.** Q1, Q2, Q3 et Q4 sont portées par le design
> v4.1 (`Ecrans[]` §2, `Bloquante` §2 et G8, `Parametre` §2, REUSE de ⑲ §5) ; Q5 est consignée au
> design §5 ; Q6, Q8, Q9, Q11 et Q12 sont ratifiées par f2 (07/10, 22 h) ; Q7 et Q10 sont tranchées.
> Le texte des questions est gardé pour la trace ; aucune ne bloque E1. Rien ici ne modifie plus le
> design.

### Q1 — Une entrée peut-elle servir plusieurs écrans ? — RÉSOLUE (design v4.1 §2 : `Ecrans[]`, G4 par écran résolu)

*Texte de la v1* : `Entree.Ecran` était un `string` singulier dans le design v1. **8 de mes 42
entrées sont transverses** (2 sur le geste d'appui, 3 sur le shell, 2 sur le décor de comptoir, 1 sur
la bascule). Les dupliquer donnerait 8 → 19 lignes pour **8 mécanismes**, et 11 `Id` à maintenir en
parallèle.
> **Reco** : `Ecran` accepte une liste (ou `"*"`), et **G4 (budget) compte par écran RÉSOLU**, jamais
> par chaîne. Sinon la garde de budget ne voit pas les pistes des entrées transverses.

### Q2 — Le 5ᵉ genre, ou le drapeau `Bloquante` ? — RÉSOLUE (design v4.1 : `Entree.Bloquante`, G8 « `Bloquante` ET > 250 ms », §5 (ii) `Fonctionnelle`)

G8 rougit dès qu'un `Retour`/`Transition` dépasse 250 ms. **Quatre mouvements du périmètre dépassent,
et aucun ne bloque l'entrée** :

| mouvement | durée | d'où vient la durée |
|---|---|---|
| `retour.appui-long` | **1 000 ms** | `UiTimingTunables.DestructiveLongpressMs` (`:19`), lui-même `T.ui.destructive_longpress_ms` du canon |
| `carnet.en-main` | **500 ms** | `Operational/Carnet/AppuiLong.cs:10` (littéral) |
| `semaine.aiguille` | **700 ms** | la maquette, mesurée (`inventaire-animations.md:58`, B11) |
| `bandeau.sortie` | **400 ms** | le code en place (`BandeauEphemere.cs:296-299`) |

Et le canon ne plafonne que la durée **bloquante** : « Durée max **bloquante** : `T.ui.anim_max_block_ms`
= 250 ms » (`global_conventions_core.md:124`), complété par « **Toutes les transitions sont
interruptibles** » (`:125`) et « Jamais de transition qui **bloque l'input** » (`:126`).
> **Reco** : ajouter `bool Bloquante` à `Entree` ; **G8 lit « `Bloquante` ET > 250 ms »** ; et le
> dégradé réduit d'un **remplissage fonctionnel** suit le canon — indicateur statique + compteur
> textuel de secondes (`screen_2a:314`, `screen_13:308`), **jamais un gel**. Geler l'arc d'un appui
> long destructif supprimerait le seul signal d'une action irréversible : ce serait un défaut d'a11y
> créé par la garde d'a11y.

### Q3 — `Propriete` n'a aucun puits pour un paramètre de graphe sur mesure — RÉSOLUE (design v4.1 §2 : `Parametre` et `IParametreAnime`, « la ficelle de ㉘ »)

`DistributionFicelleGraphic.DefinirTrace(..., amplitude:)` (`DistributionScreenController.cs:518-523`)
est le paramètre qui porte **toute** la fiction de ㉘ (« LA GÉOGRAPHIE EST DESSINÉE, JAMAIS ÉCRITE »,
`front.md:1242`). Dans le design v1, aucun membre de `Propriete` ne l'atteignait : `Alpha`, `Melange` et `Remplissage`
écrivent un `Graphic`, pas un champ. Le design v4.1 a ajouté le puits ; `distribution.ficelle-tendue`
est câblable.
> **Reco** : `Propriete.Parametre` + `interface IParametreAnime { void PoserParametre(int canal,
> float v); }` que le graphe implémente — **un seul point d'extension**, testable sans Unity (un faux
> implémenteur sous `[Test]`), et déjà couvert par la garde G7 (aucune réflexion). Si la réponse est
> non, **`distribution.ficelle-tendue` sort du catalogue** et ㉘ n'a plus qu'une entrée différée.

### Q4 — Le réglage de mouvement réduit — RÉSOLUE (design v4.1 §5 : REUSE du canon, `PlayerPrefs` ; atelier cadres 147-148)

Le design v1 la laissait ouverte (« **Question produit à f2** : (b) ajoute une ligne à ⑲ … ; alternative :
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

### Q5 — G5 (au plus 3 extrema/s, période ≥ 0,667 s) contre le canon de ③ — CONSIGNÉE (design §5 : « G5 gagne, contradiction consignée avant E3 »)

`screen_2_city_map.md:434` demande un flash d'`AuditPin` « **toutes les `T.ui.anim_max_block_ms`** »,
soit une période de **250 ms = 4 Hz**. G5 plafonne à 3 extrema par seconde (période ≥ 0,667 s). C'est
le **seul endroit du canon** où ce tunable sert de *période* au lieu de *plafond*.
> **Reco** : garder G5 (c'est un plancher de confort et de photosensibilité) et lire le « toutes les
> 250 ms » comme un **mésusage** du plafond. ③ est hors de ce lot : rien n'est bloqué aujourd'hui,
> mais la contradiction doit être consignée **avant E3**, sinon elle sera tranchée par accident au
> moment de coder ①/③.

### Q6 — L'échelle 0,97 du retour d'appui sur un bouton plein écran — RATIFIÉE (f2 07/10 ; design §8)

**10 des 15 sites `Transition.None` sont des cartes, des rangées ou des panneaux entiers** : la racine
de `HighestLeverageCard` (`Shell/HighestLeverageCardController.cs:343`), toute la surface du bandeau
(`BandeauEphemere.cs:253`), une rangée de lieutenant (`LieutenantScreenController.cs:2732`), un slot
d'équipe (`:2839`), le CTA « Recruter » (`:2880`), une plaque de ㉜ (`DelegationScreenController.cs:1534`),
un bloc de ㉝ (`DemolitionScreenController.cs:1460`), une cellule de bâtiment et la tête de fiche de ①
(`DistrictInteriorScreenController.cs:692`, `:2129`), le texte d'état vide de ⑯
(`DailyReviewScreenController.cs:1102`). Un −3 % sur une feuille de 560 u déplace son bord de **8,4 u
= 7,1 px** : l'écran entier a l'air de sauter sous le doigt.
> **Reco** : `Echelle` seulement si la plus grande dimension du bouton ≤ **1/3 du cadre** ; au-delà,
> **`Melange` seul** — ce qui est exactement le dégradé réduit d'un `Retour` (design §5 (i)), donc zéro
> code en plus. (Note : `ReputationScreenController.cs:994` n'est pas un bouton mais une
> **`Scrollbar`** : il sort de la liste des 15 pour le retour d'appui, et doit rejoindre les
> exclusions nommées de G9.)

### Q7 — L'ère — RÉSOLUE (f2, 07/10)

Tranchée par l'user le 02/09 : **2000-2010** (mémoire « DA silhouettes contemporaines » ; canon gdd/02 §Forbidden, gdd/01 « Not Scarface »). `front.md` §O était périmé (BACK-1 le réécrit). **Nuance de f2** : l'ère vaut pour les OBJETS du décor et de la fiction (lampes, écrans, téléphones, papiers). Le **laiton et l'or du CHROME d'interface** (cerne laiton, filets, boutons cernés d'or) sont la direction artistique ratifiée de l'interface et RESTENT ; ce catalogue n'y touche pas. Vocabulaire de ce fichier repassé : lampe de bureau, néon, console de répartition à voyants LED, stylo, plastique dur, pager ; plus de bakélite, de standard à fiches ni de lampe d'époque.

### Q8 — Quel rapport « traîne » ? (㉔) — RATIFIÉE (f2 07/10 : le plus vieux seulement)

`report.backlog_age_cycles` est servi (`AutonomyDtos.cs:26`) et affiché (`:285`), mais **aucun seuil
n'est servi**. La fiction dit seulement « **un rapport qui traîne** » (`front.md:1594`).
> **Reco** : **le plus vieux seulement**, quel que soit son âge. Une console de répartition n'allume pas douze
> voyants : s'il y a trois rapports, c'est le plus vieux qui appelle, et il cesse quand on l'a traité.
> Pas de seuil ⇒ pas de nombre inventé (R2.2), et la garde est triviale : exactement 1 piste.

### Q9 — La frappe du tampon de ⑤ est-elle jouable ? — RATIFIÉE (f2 07/10 : fermeture ordonnée APRÈS les 180 ms, non bloquant)

`decision.cachet` dure 180 ms, mais le geste **referme l'écran** (`ResoudreLeChoix`,
`DecisionDetailScreenController.cs:429`).
> **Reco** : ordonner la fermeture **après** les 180 ms, non bloquant. Si f2 refuse de toucher à
> l'ordonnancement, **retirer l'entrée** : une transition qu'on ne voit jamais est une dette, pas une
> animation. Le même examen vaut pour `revue.cachet` (⑯), qui n'a pas ce problème (l'écran reste).

### Q10 — Balayage `*6-scan` — RÉSOLUE (f2 07/10 + mesure)

`.elast` est le panneau de TEXTE du châssis (mesuré : conteneur de liste, pas un écran dessiné) ; ㊳ ㊴ sont des papiers ; ㉟ ㊱ ㊲ ㊵ ne dessinent pas de terminal. **Les six paires sont retirées de la maquette (atelier 9469d5a) et du catalogue.** Seul `mk-scan` du marché reste (hôte : `.tablo`, le tableau de voyants).

### Q11 — La durée du bandeau (5,000 s + 0,400 s) est-elle ratifiée ? — RATIFIÉE (f2 07/10)

Le code le dit lui-même : « le canon n'en donne aucune ; l'atelier propose **5 s, ou jusqu'au
toucher** — prise telle quelle, **à ratifier au rendu** » (`BandeauEphemere.cs:157-158`).
> **Reco** : ratifier **5,000 s de tenue + 0,400 s de fondu linéaire** tel quel — c'est mesuré, c'est
> en place, et ça marche — et le déclarer **non bloquant** (Q2). Les deux nombres rejoignent alors
> `MouvementTunables`, la classe que le design §4 pose « voisine de `UiTimingTunables` ».
> ⚠️ Vérifié : **aucune constante `Mouvement*` n'existe aujourd'hui** dans `ShellContracts/`, et
> `AnimMaxBlockMs` (250) n'a **aucun consommateur** dans tout `Assets/Scripts` — seul
> `DestructiveLongpressMs` est lu (`LongPressButton.cs:18`). Le design §4 le fait consommer par G8.

### Q12 — Deux durées d'appui long dans le même client — RATIFIÉE (f2 07/10 : `AppuiLongDeplacementMs = 500`, à créer)

**1 000 ms** nommée (`ShellContracts/UiTimingTunables.cs:19`) et **`0.5f` en littéral**
(`Operational/Carnet/AppuiLong.cs:10`). R2.3 : « tunables jamais inline ».
> **Reco** : 500 ms est **défendable** (déplacer une ligne de carnet n'est pas une action destructive,
> et le canon ne réserve le 1 000 ms qu'aux gestes destructifs,
> `global_conventions_core.md:136`) — mais pas en littéral. ⇒ `UiTimingTunables.AppuiLongDeplacementMs
> = 500`, et `AppuiLong` le lit. Une ligne, et la garde G7 (grep des motifs interdits) peut la voir.

---

# V. Récapitulatif — écran × lignes × pistes × genres, avec somme de contrôle

**Lecture** : « lignes » = les lignes de §II **attachées** à cet écran, y compris les transverses
nommées de §II.0 (`comptoir.lampe` ⑨⑩⑯, `comptoir.bouteilles` ⑨⑯, `bascule.course` ⑲㉕), comptées sur
**chaque** écran qu'elles servent. Une ligne peut porter plusieurs `Entree` (§I.1, règle 1 ; le détail
est en §I.4) ; les pistes, elles, ne changent pas. « pistes » = Σ `Entree.Pistes` des lignes propres et
nommées. **« G4 résolu »** = ce que G4 calculera (design §2 : une `Entree` à plusieurs écrans compte
sur **chacun des écrans résolus**) : les pistes + les 5 transverses `Ecrans = "*"` résolues au pire cas
— `shell.entree` 1 partout, `retour.appui` 1 et `retour.appui-voile` 1 partout où il existe un `Button` (pas sur ㉒ ; majorant : un appui n'en pose qu'une), 
`retour.appui-long` 1 sur ④ ⑤ ⑯ seulement (ses 4 instances mesurées), `bandeau.entree` et
`bandeau.sortie` 2 partout (majorant : ils ne vivent jamais ensemble).

| écran | lignes | pistes | Alerte | Ambiance | Retour | Transition | **G4 résolu** | ≤ 16 ? |
|---|---:|---:|---:|---:|---:|---:|---:|:---:|
| ④ Accueil | 1 | 1 | 1 | 0 | 0 | 0 | 1 + 1 + 2 + 1 + 2 = **7** | ✔ |
| ⑤ Décision du jour | 3 | 3 | 1 | 0 | 0 | 2 | 3 + 1 + 2 + 1 + 2 = **9** | ✔ |
| ⑥ La Famille (⑦ ⑧ ⑳ = ses sections) | 2 | 8 | 0 | 1 | 0 | 1 | 8 + 1 + 2 + 2 = **13** | ✔ |
| ⑨ Exception Queue | 4 | 4 | 0 | 2 | 0 | 2 | 4 + 1 + 2 + 1 + 2 = **10** | ✔ |
| ⑩ Exception Detail | 2 | 4 | 0 | 1 | 0 | 1 | 4 + 1 + 2 + 1 + 2 = **10** | ✔ |
| ⑭ La semaine | 2 | 2 | 0 | 0 | 0 | 2 | 2 + 1 + 2 + 2 = **7** | ✔ |
| ⑮ Les inspections | 2 | 7 | 1 | 0 | 0 | 1 | 7 + 1 + 2 + 2 = **12** | ✔ |
| ⑯ Revue du jour | 4 | 5 | 0 | 2 | 0 | 2 | 5 + 1 + 2 + 1 + 2 = **11** | ✔ |
| ⑰ Le commissariat | 1 | 1 | 0 | 0 | 0 | 1 | 1 + 1 + 2 + 2 = **6** | ✔ |
| ⑲ Les réglages | 1 | 1 | 0 | 0 | 0 | 1 | 1 + 1 + 2 + 2 = **6** | ✔ |
| ㉒ Votre profil | **0** | **0** | 0 | 0 | 0 | 0 | 0 + 1 + 2 = **3** | ✔ |
| ㉓ La vitrine | 2 | 2 | 0 | 1 | 0 | 1 | 2 + 1 + 2 + 2 = **7** | ✔ |
| ㉔ Les rapports d'autonomie | 2 | 2 | 1 | 0 | 0 | 1 | 2 + 1 + 2 + 2 = **7** | ✔ |
| ㉕ La première fois | 2 | 2 | 0 | 0 | 0 | 2 | 2 + 1 + 2 + 2 = **7** | ✔ |
| ㉘ La distribution | 2 | 2 | 0 | 1 | 0 | 1 | 2 + 1 + 2 + 2 = **7** | ✔ |
| ㉚ La chaîne d'appro | 1 | 1 | 0 | 0 | 0 | 1 | 1 + 1 + 2 + 2 = **6** | ✔ |
| ㉛ La loi | **0** | **0** | 0 | 0 | 0 | 0 | 0 + 1 + 2 + 2 = **5** | ✔ |
| ㉜ Ce que vous avez confié | 2 | 3 | 1 | 0 | 0 | 1 | 3 + 1 + 2 + 2 = **8** | ✔ |
| ㉝ Raser un site | 2 | 2 | 0 | 0 | 0 | 2 | 2 + 1 + 2 + 2 = **7** | ✔ |
| ㉞ Les ordres du soir | 2 | 2 | 0 | 0 | 1 | 1 | 2 + 1 + 2 + 2 = **7** | ✔ |
| ㉙ Le conflit | 2 | 9 | 0 | 1 | 0 | 1 | 9 + 1 + 2 + 2 = **14** | ✔ |
| `*` transverses (geste, shell, bandeau) | 6 | 6 | 0 | 0 | 3 | 3 | (résolues ci-dessus) | — |
| **Σ par attachement** | **45** | **67** | **5** | **9** | **4** | **27** | max = **14** (㉙) | ✔ |
| **Σ par ligne distincte** | **41** | **63** | **5** | **6** | **4** | **26** | — | — |
| **écart = attachements en double** | **+4** | **+4** | 0 | **+3** | 0 | **+1** | — | — |

### Les trois sommes de contrôle

**1. Les lignes.** Σ par attachement (45) − lignes distinctes (41) = **+4**, et ces 4 sont nommés :
`comptoir.lampe` sert **3** écrans (⑨ ⑩ ⑯) ⇒ +2 · `comptoir.bouteilles` sert **2** écrans (⑨ ⑯) ⇒ +1 ·
`bascule.course` sert **2** écrans (⑲ ㉕) ⇒ +1. **2 + 1 + 1 = 4** ✔

**2. Les pistes.** Σ par attachement (67) − Σ par ligne (63) = **+4** : `comptoir.lampe` (+2 écrans
× 1 piste = 2) · `comptoir.bouteilles` (+1 × 1 = 1) · `bascule.course` (+1 × **1** piste = 1 ; elle
en portait 2 en v1, la couleur de l'interrupteur n'est plus animée). **2 + 1 + 1 = 4** ✔

**3. Les genres.** Par ligne distincte : **5 + 6 + 4 + 26 = 41** ✔. Par attachement : **5 + 9 + 4 + 27
= 45** ✔. L'écart par genre se rattache aux mêmes 4 doublons : Ambiance +3 (les deux lignes de comptoir)
et Transition +1 (`bascule.course`) ⇒ **+4** ✔

### Ce que ces nombres disent

- **26 des 41 lignes sont des `Transition`** (63 %) : le catalogue fait répondre les écrans, il ne les
  fait pas remuer (§0.1). **6 `Ambiance`** seulement, toutes sur une matière réellement dessinée ou
  explicitement demandée à l'atelier.
- **Pire écran résolu : ㉙ à 14 pistes sur 16** (7 pour les silhouettes de la salle), puis ⑥ à 13 (les 7
  sections du détail, majorant). Tous les autres sont ≤ 12.
- **Pire cas simultané dans tout le client** : ㉙ résolu (14) + les 4 `Alerte` du chrome en descente
  (design §9) = **18 pistes sur 48** (design §4). La couche de mouvement n'approche pas son plafond
  avec ce catalogue — le plafond protège contre ce qui viendra après (E5, les 202 pivots de feuilles
  de la serre).
- **Cadence** : les 6 `Ambiance` et les 5 `Alerte` tournent en régime ⇒ 11 lignes au plus en régime
  (jusqu'à 22 pistes : les 6 voyants de ⑮ et les 7 silhouettes de ㉙ ne sont jamais à l'écran
  ensemble), dont les `Ambiance` à 30 Hz au plus (design §4). « En régime » ne veut pas dire « sur le
  même objet » : leurs hôtes sont rebâtis à chaque rendu, et la piste se ré-attache à chaque rendu
  (§VI.2, règle 4). Les 26 `Transition` et 4 `Retour` ne consomment rien hors du geste.
- **3 lignes ne sont pas câblables aujourd'hui** : `semaine.aiguille` (B11, cadran à construire en
  E4), `vitrine.reflet` (A3), `distribution.photo` (A4). **38 le sont.**
- **Sous un `RectMask2D`** : 11 `Entree` mesurées sur ⑥, ㉓, ㉜, ㉝, ㉞ et ㉙ (liste en §I.2.7), toutes en
  `Alpha` ou `Melange` : **aucune transformation** sous un masque depuis la v3. Elles attendent les
  mesures (a), (b) et (d) du spike E0 pour leur coût, pas pour leur existence.

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

## VI.2 Les cinq règles générales que `coder` devra appliquer (et qu'un reviewer peut vérifier)

Elles ne sont pas des entrées : elles sont les conditions pour que les entrées marchent. Chacune sort
d'un fait mesuré, pas d'une préférence.

1. **Une `Transition` est déclenchée par le GESTE, jamais par une comparaison d'états.**
   **Presque tous** les contrôleurs du périmètre **détruisent tous leurs enfants à chaque rendu**
   (mesuré par la revue ⊥ n°3 : au moins 19 des 21 écrans) — p. ex. `SettingsScreenController.cs:155-156`,
   `ShopScreenController.cs:171-172`, `AutonomyInboxController.cs:463-469`, `TutorialScreenController.cs:227-228`,
   `CarnetScreenController.cs:480-485`, `DashboardController.cs:812-813` (et `:557-558`),
   `LieutenantScreenController.cs:2892`, `ExceptionQueueController.cs:570-571`, `ExceptionDetailController.cs:788-789`,
   `CompressionScreenController.cs:189-192`, `InspectionScreenController.cs:214-215`, `DailyReviewScreenController.cs:314`,
   `PrecinctScreenController.cs:178-179`, `DistributionScreenController.cs:1159-1160`,
   `ChaineDApproScreenController.cs:866-867`, `DemolitionScreenController.cs:1359`, `ConflitScreenController.cs:1447-1448`. Un diff « avant/après » est donc impossible : l'objet d'avant
   n'existe plus. Mais le contrôleur **sait quel geste il vient d'envoyer** (`sku_id` acheté,
   `issue` répondue, `block_id` rasé…) ⇒ il attache l'entrée au rendu **qui suit**, sur la cible
   nommée. C'est la règle, et elle est testable : une entrée attachée sans geste préalable est un bug.
2. **La sortie d'un écran n'est pas animée.** `UnmountCurrentTenant` détruit l'ancien locataire
   (`Object.Destroy`, effectif en fin d'image) et vide tout `ContentSlot` (`AppShell.cs:1858-1863`). Animer une sortie
   demanderait de garder l'ancienne racine vivante pendant 160 ms — une retouche du shell, hors de ce
   catalogue. ⇒ `shell.entree` anime **l'entrée seule**.
3. **Aucune animation au premier montage de la session.** `global_conventions_core.md:126` : « pas
   d'animation sur chemin critique cold-open » (F4), et `:150` : « `SplitFlapReadout` interdit sur le
   chemin critique de premier rendu ». L'exclusion est une garde, pas un réglage.
4. **Une `Ambiance`/`Alerte` dont l'hôte est rebâti se ré-attache à CHAQUE rendu.** Leurs hôtes vivent
   dans le chemin de rendu (`accueil.descente`, `police.dispatch`, `autonomie.appel`, `service.jeton`,
   `famille.lampe-du-don`…) : le contrôleur rattache la piste à la cible neuve après chaque rendu ; la
   piste de l'ancienne cible se libère d'elle-même (cible nulle, design §3, ordre du `Tick` (1)). Le
   `PhaseS` étant déclaré, le battement reprend à la même phase de l'horloge de régie : pas de saut.
5. **Une transition n'existe que si ses deux bouts sont deux états DIFFÉRENTS du code.** Trois lignes
   ont été retirées pour cette seule raison (`main.levee`, le disque de `demolition.offre-fermee`,
   `accueil.carte-suivante`), et un fondu croisé à travers un rebuild n'est pas attachable « au rendu
   qui suit » : seule la moitié entrante l'est (`premiere-fois.lecon`).

## VI.3 Hors périmètre, et pourquoi (pour qu'on ne les cherche pas)

| écran | pourquoi il n'est pas ici |
|---|---|
| ① Intérieur de district · ② Fiche bâtiment · ③ Carte | couverts par l'inventaire (§I.3) et par **E3**/**E5** du design |
| ㉟ ㊱ ㊲ ㊳ ㊴ ㊵ | **aucun mouvement** : les six `*6-scan` sont retirés de la maquette et de l'inventaire (Q10), aucune cause dans la fiction |
| ㉑ Marché | **maquette ratifiée et ANIMÉE, zéro ligne de code** (`front.md:1683`) — aucun contrôleur `Market` n'existe. Ses 5 paires (dont `mk-eclat`, hébergé au cadre 146) restent à l'inventaire en `SansHote:㉑ écran non monté` (§I.3) |
| **⑪ Le coffre / Pipeline** | ⚠️ **`LaunderingController` n'existe pas** : seuls `Operational/Laundering/LaunderingDtos.cs` et `LaunderingClient.cs` sont là. `AppShell.cs:294` monte `FiliereScreenController` sur `Tab.Pipeline` (« ㊵ porte la filière (ruling de f2, 2026-09-23) ; **⑪ et ⑫ sortent du chemin joueur** »). `INDEX.md:47` porte déjà la correction (à la main, 2026-10-07 : « ⑪ non monté, 25 contrôleurs ») |
| ⑦ Lieutenant Detail · ⑧ Rule Editor · ⑳ Recrutement | **ce ne sont pas des écrans** : des sections de `LieutenantScreenController` (`front.md:1400` → `:177` · `front.md:1421` → `:186` · `front.md:1441` → `:117`, `:173`). ⑳ est en outre **mis de côté par l'user** le 2026-08-26 (arbitrage **M**, recrutement par promotion, `front.md:1444`) ⇒ rien avant l'arbitrage |
| ⑬ Pile du jour | **ni construit ni monté** (`front.md:1544` : « `[ ]` construit · `[ ]` monté »), **mis de côté par l'user** le 2026-08-26 (arbitrage **N**) |
| ⑱ Plus | couvert par `shell.entree` : c'est une liste défilante plein cadre montée dans le même `ContentSlot` (`AppShell.cs:1328-1418`), sans matière propre. Le canon ne lui donne qu'une « transition push/pop » (`screen_12:223`) |

---

# VII. Ce qu'il faut faire de ce fichier

1. **Revue ⊥ n°4** de cette v4 (et des ajouts v4.2 à v4.4 du design : §16 `CouleurA = Cible`, §17 la
   cible qui rend et le voile, G11 au prédicat exact), jusqu'à 0 BLOCKING. Les 12 questions du §IV sont résolues : aucune décision de f2 n'est attendue avant E1,
   sauf le flotteur « + $ » (R2.2), hors de ce catalogue.
2. **L'atelier** n'a plus que A3 (la vitre de ㉓) et A4 (la photo de ㉘) qui débloquent une ligne ;
   A6-A8 sont des dettes de DA.
3. **Ensuite** : E1 écrit le `Catalogue` à partir de **§I.4** (44 `Entree` de ce fichier) **et de §I.3**
   (les 8 entrées du chrome du design §9, les 31 `SansHote` des paires restantes) — **83 rangs G2**
   (44 + 8 + 31), dont **49 câblables**. G1, G2, G4, G6, G8, G12 et G13 se vérifient sur la donnée seule ; G3 et G5
   sur les courbes ; G9, G10, G11 sur l'arbre et les sources, au créneau.

**Aucune ligne de ce fichier n'est une décision nouvelle.** Je propose ; f2 et l'user ont validé ce qui
devait l'être (§IV) ; et le juge ⊥ qui relira ceci n'a pas besoin de me faire confiance : chaque nombre
porte son ancre.

---

# VIII. Réponse à la revue ⊥ n°1 (08/10) — NON APPROUVÉ : 7 BLOCKING, 17 MAJOR, 12 mineurs

Rapport complet : `revue-catalogue-n1.md` (même dossier).

| finding | traitement (v2) |
|---|---|
| **BL-1** canal `Teinte` inexistant (12 entrées) | `Teinte` retiré du fichier. Assombrissements et virages ⇒ `Melange` avec `CouleurA`/`CouleurB` déclarées (§I.4) ; éclaircissements sur un `Graphic` coloré ⇒ `Melange` vers `Cible × k`, k > 1, borné ; sprites cuits sous un `Graphic` blanc ⇒ assombrir (`decision.jeton`, `service.jeton`) ou monter l'`Alpha` (`conflit.envoi/bord`) ; couleurs qui changent aussi d'alpha ⇒ posées par le contrôleur (`bascule.course` en `quandFini`, `semaine.jeton-depense` d'un coup). Le design gagne `CouleurA = Cible` (v4.2 §2, §16), sans quoi `retour.appui` repeignait les 67 boutons de la même couleur |
| **BL-2** `file.part` `TranslationY` sous `HorizontalLayoutGroup` | `Alpha` seul (`Transitionner` 1 → 0,28), le fade du canon `screen_5:340` |
| **BL-3** `decision.distribuee` `TranslationX` sous `HorizontalLayoutGroup` | translation retirée ; `Rotation` `Additif` +5° → 0 et `Alpha` gardés |
| **BL-4** `demolition.fiche-sortie` sous `VerticalLayoutGroup` + `ContentSizeFitter` | `Alpha` seul ; plus aucune translation sous un masque (§I.2.7) |
| **BL-5** angles de ⑩ en repère CSS | repos Unity **+5° / 0° / −5°** (`:532`) ; arrivée en `Rotation` `Additif` +9° → 0 ; `TranslationY` +48 u dit en repère Unity |
| **BL-6** `police.dispatch` forme `mk-veille` inversée | `Melange` **0 → 1 → 0**, pic à mi-période comme l'oracle ; `PoseDeReposS = 0,800 s` = le pic |
| **BL-7** six `PoseDeReposS` sur l'identité (G3) | `comptoir.lampe`, `comptoir.bouteilles`, `famille.lampe-du-don`, `conflit.salle` ⇒ `PoseDeReposS = 0,000 s` (le creux, chaque canal hors repos) ; `accueil.descente`, `decision.jeton`, `service.jeton` ⇒ `Melange` 1 à t = 0 ; `police.dispatch` ⇒ BL-6. Règle écrite en §0.4 et §I.2.5 |
| MA-1 noms de champs de I.1 | I.1 recalé sur le §2 v4.2 ; `réduit` dit **dérivé**, non stocké |
| MA-2 `Bloquante`/`Hote`/`Fonctionnelle` non déclarés | table **§I.4**, une ligne par `Entree` (47) |
| MA-3 Q1-Q4 présentées ouvertes | marquées RÉSOLUES par v4.1 ; encadré de II.0 réécrit ; §VII réécrit |
| MA-4 `distribution.ficelle-tendue` dite hors modèle | `Parametre` canal 0, `Transitionner`, câblable |
| MA-5 cinq `Alerte` « conservées » sous `Reduit` | figées à `PoseDeReposS` (§5 : `Alerte` comprise) ; l'information tient à l'objet (état statique nommé) |
| MA-6 `carnet.en-main` hors des exceptions du §5 | figé à `PoseDeReposS = 0` ; la marque apparaît au seuil par le re-rendu de `PrendreEnMain`. Et sa cible devient une `Marque` enfant : un `CanvasGroup` sur la ligne faisait fondre ses textes (trouvé en corrigeant) |
| MA-7 G5 « ≥ 0,4 s » | « au plus 3 extrema/s, période ≥ 0,667 s » partout |
| MA-8 trois dépassements nommés au lieu de quatre | quatre, `bandeau.sortie` ajouté (§I.2.3) |
| MA-9 table G2 écrite sur 44 | §I.3 réécrite sur 40, avec B11 et `mk-eclat`, contrôle 40 |
| MA-10 38 + 48 ≠ 82 | 81 lignes G2 (B11 = `semaine.aiguille`), 34 non câblables + 47 câblables |
| MA-11 A1 contredite par l'atelier | A1 marquée FAITE (cadre 146) |
| MA-12 `semaine.aiguille` revendique B10 | B11 ; B10 est `chrome.aiguille.balayage` |
| MA-13 §0.4 périmé | recompté : 529 / 29 / 3 paires / 16 instances, `mk-eclat` cité |
| MA-14 R2.2 de ㉔ effacée | exception consignée en §I.2.2 (dette R2.2 de ㉔) |
| MA-15 `comptoir.bouteilles` en valeurs rendues | facteurs 0,83 → 1,00, rendu 0,66 → 0,80 dit |
| MA-16 halo de ⑥ à α 0,14 | Δ rendu ≈ 6/255 au centre dit ; mesuré à la planche E4, retiré sous 3/255 |
| MA-17 transverses non résolues dans §V | colonne « G4 résolu » ; pire écran ㉙ 13/16 ; pire cas 17/48 |
| mi-1 à mi-12 | renvois recalés sur v4.2 (§2-§11, G1-G13), 4 instances de `mk-lampe`, 25 contrôleurs, `INDEX.md:47` déjà corrigé, `:777`, `:517`, `:315`/`:383`, `Px(10)`, `:209`/`:374`, 21/22 dit non mesuré, 7 cibles texte, « 0 usage » |

**Trouvé en corrigeant, hors du rapport** : (1) une `Entree` applique tous ses canaux à sa cible ⇒ les 5
lignes à deux cibles aux canaux différents sont scindées (`ligne/cible`, §I.1 règle 1) ; (2)
`autonomie.reponse` faisait s'effacer `Option_A`/`Option_B`, qui **ne sont pas rebâtis** une fois la
question décidée (`AutonomyInboxController.cs:316-323`) : l'entrée ne garde que l'apparition de
`Decided`, 1 piste (㉔ passe de 3 à 2) ; (3) `appro.commande-partie` et `carnet.encre` visaient deux
textes chacun pour 1 piste : ils visent désormais leur conteneur, qui ne porte que ces textes ; (4)
`file.part` et `famille.rang-ouvre` écrivent dans un `CanvasGroup` que le propriétaire règle lui-même :
`Transitionner(de, vers)`, pas un `Attacher` multiplicatif.

---

# IX. Réponse à la revue ⊥ n°2 (08/10) — NON APPROUVÉ : 6 BLOCKING, 6 MAJOR, 8 mineurs

Rapport complet : `revue-catalogue-n2.md` (même dossier). Les 7 BLOCKING de la n°1 y sont vérifiés fermés.

| finding | traitement (v3) |
|---|---|
| **B2-1** `retour.appui` en `Melange` sur un `Button` posé sur un `TMP_Text` (⑯ `:1101`) | règle de cible (1)-(2) qui exclut le texte ; ce site tombe en `retour.appui-voile` (`Alpha`, permis par G6) |
| **B2-2** 18 des 67 cibles ne rendent rien | règle de cible mesurée (alpha ≥ 0,1, plaque couvrant ≥ 50 %) + repli **`retour.appui-voile`** (ligne neuve de §II.0.a) ; design v4.3 §17 (règle, §5 (i) étendu au voile, G9 « cible qui rend ») |
| **B2-3** `vitrine.acquis/objet` `Echelle` sous `ContentSizeFitter` | `Alpha` seul ; G11 dans ses deux moitiés devient la contrainte §I.2.9 ; `retour.appui` n'a d'`Echelle` que sans `ContentSizeFitter` d'ancêtre |
| **B2-4** `demolition.offre-fermee/rang` à amplitude nulle (`premiere = rank == 1`) | `/rang` **retiré** : le disque ne change pas à la fermeture, c'est dit dans la ligne ; l'entrée garde le `Tag` (1 piste, ㉝ passe à 2) |
| **B2-5** `bandeau.entree` en repère CSS | `TranslationY` **+10 u → 0**, « repère Unity : l'annonce descend » |
| **B2-6** `main.levee` : la levée dépend du rôle, pas de `selection` | ligne **retirée** ; la description de ⑩ dit que choisir ne déplace aucune carte (le filet `:562` le dit) ; ⑩ passe à 4 pistes |
| M2-1 liste sous masque incomplète | §I.2.7 : 12 `Entree` mesurées (⑥ ㉓ ㉜ ㉝ ㉞ ㉙), `famille.rang-ouvre` dit non mesuré ; « aucune transformation sous masque » redevenu vrai |
| M2-2 `famille.rang-ouvre` 7 cibles | `Pistes = 7`, les 7 `sectionsDetail` ancrées, `:1860` retiré ; ⑥ à 8 pistes, 13 résolu |
| M2-3 gel de `conflit.salle` par phase impossible | §0.4 : le gel évalue à `PoseDeReposS` **sans** `PhaseS` ; colonne `réduit` corrigée (les 7 à la même pose) |
| M2-4 plancher §0.3 violé sans mention | `accueil.descente` → `CouleurB = #4a2a24` (Δ 0,15) ; `decision.jeton` et `service.jeton` → facteur 0,82, celui de `mk-lampe` (Δ 0,17 / 0,15) ; `comptoir.lampe` : Δ rendu 0,096 dit, critère de retrait E4 ; `conflit.salle` : canal `Alpha` (≈ 1,6/255) supprimé ; §0.3 dit la règle |
| M2-5 `commissariat.crans` teinte écrite deux fois | `CouleurB` = blanc : le cran passe de la teinte pure du sprite à teinte² ; Δ mesuré sur `DesignTokens.asset` : 0,24 / 0,22 / 0,17 ; règle 3 de §I.1 étendue |
| M2-6 §VII.3 : 47 + 8 + 31 ≠ 81 | deux unités dites : 81 lignes G2 (§I.3), **85 rangs** en `Entree` (46 + 8 + 31), 51 câblables |
| m2-1 à m2-8 | sept cibles `Alpha` sur texte comptées (§I.2.1) ; déclencheur de `carnet.en-main` réécrit ; B11 rangée en « inventaire §B » ; `:229-237` ; `:746-747` ; gel de `conflit.salle` en u ; durée de `mk-veille` citée dans l'oracle ; `ContentSizeFitter` de ㉞ (`:822`) nommé |

**Comptes v3** : 42 lignes (−`main.levee`, +`retour.appui-voile`) · **46 `Entree`** · Σ pistes **65** par entrée distincte,
**69** par attachement · genres 5 / 6 / 4 / 27 (lignes) et 5 / 6 / 4 / 31 (`Entree`) · pire écran ㉙ **14/16**, pire cas
**18/48**.

---

# X. Réponse à la revue ⊥ n°3 (08/10) — NON APPROUVÉ : 8 BLOCKING, 6 MAJOR, 9 mineurs

Rapport complet : `revue-catalogue-n3.md` (même dossier). Comptes de la v3 vérifiés justes ; B2-1, B2-3 à B2-6 fermés, B2-2 rouvert ailleurs.

| finding | traitement (v4) |
|---|---|
| **B3-1** « rend » ne voit ni `Mask` invisible, ni `enabled = false`, ni GameObject inactif | prédicat **« rend »** (design v4.4 §17) : non texte ∧ `enabled` ∧ `activeInHierarchy` ∧ α ≥ 0,1 ∧ pas de `Mask` à `showMaskGraphic = false` ; surface **nommée** par l'appelant aux trois sites masqués (`Verre`, `Remplissage`, `Degrade`) ; G9 a un contrôle négatif par façon de ne rien peindre |
| **B3-2** « 18 des 67 » faux ; recherche d'enfant qui choisit l'ombre portée | plus de recherche automatique d'enfant ; compte **déduit** du classement de la revue : 3 surfaces nommées, 48 `targetGraphic` qui rendent, **16 voiles** (13 + les 3 mal résolus), sites listés dans la ligne ; vérifié par G9 au créneau |
| **B3-3** voile posé sur une zone de clic nue | cible du voile = le `Button` si sa sous-arborescence rend, sinon son plus proche ancêtre qui en a une (les 3 zones nues de ㉜ ㉝ ① voilent leur plaque ou leur `corps`) |
| **B3-4** `conflit.envoi` : l'envoi efface le choix (`:364`) | déclencheur = `ChoisirFamille` (`:111-116`) ; cause réécrite (on DÉSIGNE la famille) |
| **B3-5** `accueil.carte-suivante` : `RequestSkip` ne re-rend rien | ligne **retirée** ; §0.2 dit que le swap du canon (`screen_1:386`) n'existe pas côté client (dette client) ; ④ passe à 1 ligne |
| **B3-6** fondu croisé à travers un rebuild | `premiere-fois.lecon` ne garde que la moitié entrante (0 → 1, 110 ms) sur le `Texte` neuf ; règle 5 de §VI.2 |
| **B3-7** `revue.cachet` / `file.cachet` sous `ContentSizeFitter` | `Echelle` retirée des deux ; `Rotation` `Additif` +6° → 0 (le cachet pivote en tombant) + `Alpha` ; CSF mesurés et cités (`:1304-1306` ; `:499-501`, `:1132`) |
| **B3-8** prédicat G11 incompatible avec ses verdicts | prédicat exact (§I.2.9 et design §10 G11) : translation → parent DIRECT à `LayoutGroup` ou CSF sur la cible ; échelle → CSF sur la cible ou un ancêtre ; les quatre translations restantes et les échelles restantes **mesurées** et citées |
| M3-1 `retour.appui-long` : 5 sites, ⑨ ⑩ manquaient | `Ecrans` = ④ ⑤ ⑨ ⑩ ⑯ ; §V ⑨ et ⑩ à 10 (calculé) |
| M3-2 les rebuilds touchent presque tous les écrans, et les régimes | §VI.2 règle 1 : 17 contrôleurs cités ; règle 4 : une `Ambiance`/`Alerte` se ré-attache à chaque rendu ; §V « en régime » au lieu de « en permanence » |
| M3-3 `vitrine.acquis/objet` sans changement d'état | `/objet` retiré ; l'entrée ne garde que « ACQUIS » (1 piste, ㉓ à 2) |
| M3-4 3 des 7 sections de ⑥ inactives | le contrôleur n'attache que les actives ; 7 = majorant G4, dit |
| M3-5 ficelle : second état sans source ; ancre `:1392` | « second état PRESCRIT » écrit ; ancres `:523` et signature `:1361-1363` |
| M3-6 ancre du déclencheur de `revue.cachet` | `AppliquerLotSigne` `:719-724`, `TamponSigne` `:751`, risque `:395` dit |
| m3-1 à m3-9 | 24/255 (même arithmétique que ⑥) ; chemin `Operational/Carnet/AppuiLong.cs` ; `Object.Destroy` différé ; §VII renvoie à la n°4 ; 20 poses de CSF / 55 lignes ; `:231-239` et `:745` (mesurés à nouveau : la n°2 s'était trompée sur ces deux-là) ; « durée » = one-shot ; G8 nomme `retour.appui-voile` ; §5 (i) borné au voile |

**Méthode changée** : §I.4 est la source ; §V est CALCULÉ depuis §I.4 par script (lignes, pistes, genres, G4 résolu), et le script refuse une §I.4 qui ne couvre pas exactement les lignes de §II.

**Comptes v4** : **41 lignes** · **44 `Entree`** · Σ pistes **63** par entrée distincte, **67** par attachement · genres 5 / 6 / 4 / 26 (lignes), 5 / 6 / 4 / 29 (`Entree`) · pire écran ㉙ **14/16**, ⑥ 13 · pire cas **18/48** · G2 : 80 lignes, **83 rangs**, 49 câblables.
