# ⑯ La Revue du jour — les trois phrases manquantes, et le décor du bar (F1)

> Atelier / DA, 2026-09-22 (22:45). Documents seulement : aucun rendu, aucune capture, rien sous `Assets/`.
> **Cadre cité** : série 4, cadre **v4-0** « Revue du jour — trois jetons sur le zinc » = `ecrans-brennar-4.html` cadre 0, atelier
> `868ab87` (PNG ratifié : `Tools/juge-visuel/revue-du-jour/v4-0.png`). Les états v4-1 et v4-2 sont cités pour le comptoir.
> **Sources lues** : back `4841d7ad` (`gate/cumul-2026-09-23`, le SHA qu'a lu CLIENT-2) ; écart de CLIENT-2 `06cc21d6`
> (`Tools/juge-donnees/revue-du-jour/ecart-2026-09-23.md`, arbre `~/project/mafia-unity-F`), lignes B01, B02, B08 et lot ⑯-4.

---

## 1. Les phrases, une par générateur

### Le registre, mesuré sur les trois phrases dessinées (v4-0, texte ratifié « nickel » le 25/08)

| générateur | titre (romain) | motif (italique) |
|---|---|---|
| `courier_scheduling` | J’ai replanifié la tournée des coursiers | — l’horaire habituel n’a pas été tenu. |
| `lek_rotation` | J’ai fait tourner le coin de vente | — le Lek tournait hors du rythme convenu. |
| `front_shop_reconciliation` | J’ai rapproché les comptes de la façade | — la caisse déclarée s’écarte de l’habitude. |

Ce que ces trois phrases ont en commun, et que les trois nouvelles respectent :
- **le lieutenant parle à la première personne**, au passé composé : il dit ce qu’il a FAIT de la routine ;
- **le motif dit l’écart à l’habitude** (« habituel », « convenu », « l’habitude »), jamais un chiffre ni un nom propre ;
- **aucun paramètre** : la phrase dépend de `descriptor.key` seul, rendable aujourd’hui (les `params` sont opaques, S5-a) ;
- **le motif ne peut pas dire QUELLE condition a déclenché** : le back calcule la condition et la jette (E1, lot S5-b). Un
  motif qui choisirait une des conditions mentirait une fois sur deux. Les deux nouveaux motifs disent donc l’**union** des
  conditions de leur score, et restent vrais dans chaque cas ;
- typographie de la maquette : apostrophe `’` (U+2019), tiret cadratin précédé d’une espace, le motif **commence** par `— `
  (c’est lui qui porte l’italique, `<i> — …</i>` dans le cadre).
- « Vous validez ? » n’est PAS dans la table : v4-0 ne l’écrit qu’à la fin du premier billet, et v4-2 ne l’écrit nulle part.
  Ce n’est pas une phrase de générateur. Le garder, et où, est une question de mise en page pour le client.

### Les trois à ajouter — fr et en

| `descriptor.key` | fr — titre | fr — motif | en — titre | en — motif |
|---|---|---|---|---|
| `core_loops.flag_discipline.routine.precursor_order.descriptor` | J’ai passé la commande de précurseurs | — le marché est plus tendu que d’habitude. | I placed the precursor order | — the market is tighter than usual. |
| `core_loops.flag_discipline.routine.stash_reorder.descriptor` | J’ai allégé le stock | — il était plus chargé, ou plus regardé, que d’habitude. | I lightened the stock | — it was fuller, or more watched, than usual. |
| **repli** : toute autre clé, absente ou inconnue | J’ai suivi la routine | — quelque chose s’écartait de l’habitude. | I kept to the routine | — something strayed from the usual. |

**Qui déclenche chacune** (back `4841d7ad`, `services/game-back/src/core_loops/flag_discipline/`) :

| phrase | générateur | fichier | ce que le score mesure | pourquoi ce motif |
|---|---|---|---|---|
| `precursor_order` | `PrecursorOrderGenerator` (`PRECURSOR_ORDER`), rôle **9** « Procurement specialist » | `generators/precursor-order.generator.ts:43` (clés `:91`, `:95`) ; score `generators/deviation-scores.ts:59` | un item par couple (bâtiment, précurseur) en stock ou en commande ; score 0,9 si **pénurie** (`scarcity_active`), 0,5 si **prix en hausse** (`price_trend = UP`), sinon 0,1 | « plus tendu » couvre la pénurie ET la hausse. Il est vrai quelle que soit la condition. |
| `stash_reorder` | `StashReorderGenerator` (`STASH_REORDER`), rôle **2** « Stash keeper » | `generators/stash-reorder.generator.ts:44` (clés `:78`, `:82`) ; score `generators/deviation-scores.ts:82` | un item par couple (réserve, substance) ; score = le plus haut entre le **remplissage** (grammes / point de remplissage) et la **chaleur du bâtiment** | « plus chargé » = le remplissage ; « plus regardé » = la chaleur. Les deux sont dits, parce que le back ne dit pas lequel a tiré. |
| repli | aucun générateur : un signalement posé par le seam de test `force-flag`, dont le motif est `reason.deviation_detected` (`flag-discipline.service.ts:162`), ou un générateur futur que la table ne connaît pas encore | — | — | Il ne prétend rien savoir. C’est la phrase honnête d’un lieutenant qui signale sans pouvoir dire quoi. |

### Quatre faits à connaître avant de câbler ⑯-4

1. ⛔ **Ces deux phrases ne peuvent PAS s’afficher aujourd’hui.** Un signalement exige un lieutenant qui tient le rôle
   responsable. Or `roleIdForArchetype` (`operational/lieutenant/lieutenant-archetype.ts:213`) ne rend que les rôles
   1, 3, 4, 6, 8, 10, 12, 13, 15 : **ni 2 ni 9**. Les générateurs le disent eux-mêmes (« D6 honest gap », `precursor-order.generator.ts:81`),
   et `routine-item-generation.service.ts:117` saute le chemin du signalement quand aucun lieutenant n’est résolu. Ces items se
   génèrent et se confirment en routine, sans jamais devenir une carte.
   ⇒ **Leur falsifiable est un test de la TABLE**, par exemple « chaque clé de générateur rend une phrase non vide, sans `{`, et une
   clé inconnue rend le repli ». Ce n’est pas une capture : aucune capture ne peut les montrer, et un juge ne peut pas les juger à l’écran.
2. **Le repli s’indexe sur `descriptor.key`, pas sur `flag_reason.key`** : c’est la clé dont la table dépend. Le seam de test garde
   le descripteur de l’item semé, et son motif est `deviation_detected`.
3. **Les mots évités, et pourquoi.**
   - « la réserve » : c’est le nom servi du bâtiment `stash` (`building.type.stash` = « Réserve »), mais **⑯ l’emploie déjà
     SUR LE MÊME BILLET** pour la confiance (« RÉSERVE · NORMALE »). Deux sens dans le même billet, c’est la collision que d4 interdit.
   - « la planque » : c’est `building.type.cash_safehouse` (« Planque »), un autre bâtiment. Le couplage
     `random_world.coupling.pair.erlang_stash__deal_lek` dit pourtant « votre planque » pour le stash. C’est une incohérence du
     bundle, signalée ici et non corrigée.
   - « le stock » ne porte aucun autre sens dans ⑯, et « la commande de précurseurs » est le mot du labo (« commander le précurseur »).
   - « J’ai fait tourner… » est déjà pris par `lek_rotation` : les nouveaux titres prennent d’autres verbes, pour qu’on les
     distingue d’un coup d’œil.
4. ⚠️ **Au back (f7), pas à l’atelier** : le bundle sert `reason.stash_reorder` = « Réassort de {substance_type} à prévoir » (et
   `routine.stash_reorder.descriptor` = « Réassort — … »). Le **score dit l’inverse** : il monte quand la réserve est **trop pleine**
   (remplissage ÷ point de remplissage) ou trop chaude. Un réassort réapprovisionne une réserve vide. La phrase de l’atelier suit le
   score, ce que le back mesure réellement, et non le mot « reorder ». La valeur du bundle est à revoir par la session qui le tient.

**Statut** : ce sont des propositions de l’atelier, dans le registre ratifié de v4-0. **Elles ne sont pas ratifiées**, car la
ratification du 25/08 portait sur les trois phrases dessinées. L’user garde son veto.

### Annexe — l’en des trois phrases dessinées (non demandé, proposé pour que la table ⑯-4 soit complète dans les deux langues)

Le fr est la maquette ratifiée, verbatim ; l’en est une proposition.

| générateur | en — titre | en — motif |
|---|---|---|
| `courier_scheduling` | I rescheduled the couriers’ round | — the usual timetable wasn’t kept. |
| `lek_rotation` | I rotated the sales corner | — the Lek was running off the agreed rhythm. |
| `front_shop_reconciliation` | I reconciled the front’s books | — the declared takings stray from the usual. |

---

## 2. Le décor du bar (B01, finding F1 BLOQUANT) — il EXISTE, et il n’est pas dans le client

### Le fichier

| | |
|---|---|
| chemin | `~/project/atelier3d-mafia/VERGE3_JOUR_FINAL.png` (suivi en git, pas en LFS) |
| taille | **1728 × 1080** px, RVB, 2 620 916 octets, sRGB (rendu Blender, sortie PNG par défaut) |
| sha256 | `e918a5753900d393225fdd90fc9a4506cf0d6654940886cf847ca14216e5d94e` |
| commit | `e826c53`, 2026-08-18, « v3.0 — Carrefour du Verge, diptyque livré (état validé “c’est pas mal”) » ; son jumeau `VERGE3_NUIT_FINAL.png` est dans le même commit |
| source | `map_verge3.py` (Blender Cycles) : `blender -b -P map_verge3.py -- <sortie.png> <A\|B\|C> final jour`. En `final`, il rend en 1728×1080 à 384 échantillons (`map_verge3.py:186`, `brennar_style.py:172`). **Quelle caméra (A, B ou C) n’est écrit nulle part** : ni le commit ni un journal ne le disent. Le cahier de la scène est `BRENNAR-IDENTITE.md` §« Le Carrefour du Verge ». |
| ce qu’il montre | le carrefour du Verge en plein jour, avec **« LE VERGE D’OR »** au centre : enseigne de toit, bandeau de façade, marquise, berline en double file, voiture de police en face |

### La preuve que c’est bien le fond de v4-0 : par les pixels, pas par le nom

La maquette n’utilise pas de fichier. Son fond est un **JPEG embarqué** dans le CSS (`.scene.verge-jour`, `ecrans-brennar-4.html:350`),
de 900×765 px et 97 976 octets. Mesuré avec `Tools/atelier-2026-09-22/apparier-fond-maquette.py` (committé ici, rejouable) :

```
contrôle POSITIF (le fond contre lui-même) : 0.00/255
  VERGE3_JOUR_FINAL.png                1728x1080  écart gris   1.43/255  échelle 0.750  boîte source (300, 60, 1500, 1080)
  VERGE_JOUR_FINAL.png                 1728x1080  écart gris  46.03/255
  VERGE_JOUR_FINAL2.png                1728x1080  écart gris  41.16/255
  p2_fonds/VERGE_D_JOUR_FINAL.png      1080x1920  écart gris  39.90/255
  patchs/patch_bar_hero_jour.png       296x306    écart gris  42.11/255
  bar_FINAL.png                        1080x1350  écart gris  71.09/255
meilleur : VERGE3_JOUR_FINAL.png, boîte (300, 60, 1500, 1080) (1200x1020)
  vérification RVB de la boîte         : 2.12/255
  VOISIN décalé de (-4, -4)            : 12.50/255
  VOISIN décalé de (4, 0)              : 7.43/255
  contrôle NÉGATIF (VERGE3_NUIT_FINAL.png, même boîte) : 37.51/255
```

⇒ Le fond de v4-0 est **la boîte (300, 60)–(1500, 1080) de `VERGE3_JOUR_FINAL.png`**, soit 1200×1020, réduite à ×0,75 et
ré-encodée en JPEG. L’écart de 2,12/255 est le bruit JPEG, et les deux boîtes décalées de 4 px sont pires. Le fond de district
du client (`VERGE_D_JOUR_FINAL`, 39,90) et le sprite isolé du bar (`bar_hero_jour`, 42,11) ne sont **pas** ce fond. CLIENT-2 avait
raison de les écarter.

### Il n’est pas dans le client

Aucun fichier sous `Assets/` de l’arbre F (`06cc21d6`) n’a ce sha256. Le client n’a que les fonds du district
(`Assets/Art/District/Backgrounds/VERGE_D_*`) et des sprites du bâtiment seul (`Assets/Art/Sprites/Batiments/bar_hero_*`,
`Assets/Art/District/Sprites/bar_hero_nuit_*`) : c’est une autre vue, pour la carte.

### Montable tel quel ? **Oui**, à quatre conditions, toutes côté client

1. **Le cadrage de la maquette** : le fond couvre TOUT l’écran (`.scene` `inset:0; background-size:cover`, `:183`), il est centré
   horizontalement et placé à **22 %** verticalement (`:350`). Par-dessus viennent le dégradé `.degrade.jour` (`:351`), puis le zinc
   `.zinc.revue`, qui couvre les **64 % du bas** (`:212`). Seul le tiers haut du fond se voit : **le toit et l’enseigne « LE VERGE
   D’OR »**. Simulé sur 1080×2400 depuis la boîte à pleine résolution : la fenêtre visible de la source est x 671–1130, y 60–427.
   C’est ce que montre `v4-0.png`.
2. **Deux façons de monter, un seul résultat.** Soit on monte la boîte (300, 60, 1200×1020) découpée à pleine résolution, avec le
   cadrage ci-dessus ; soit on monte le PNG entier avec les UV équivalents. La découpe est un geste du client ou un geste d’atelier
   à commander. **Je ne l’ai pas produite ce soir.**
3. **La résolution** : pour couvrir 1080×2400, la source est agrandie **×2,35** (×2,06 sur la référence 1080×2102). C’est un peu
   doux, mais **plus net que ce qui a été ratifié** : la référence v4-0 a été rendue depuis le JPEG de 765 px, soit un agrandissement
   ×2,75. Rien n’empêche « jugé » de ce côté.
4. **Les règles de montage** (mémoire « montage de l’art orphelin ») : le fichier va sous `Assets/Art/<…>/Resources/<…>`, jamais sous
   `Assets/Resources/`. Le postprocesseur force l’import Sprite sous `Assets/Art/`. Le `.meta` se déplace avec le fichier, et il
   faut un consommateur : le contrôleur de ⑯, câblage client. La texture est à importer en **sRGB** (défaut d’un Sprite). Elle fait
   1728 px au plus, sous la limite de 2048.

Le **jour seul** suffit : la maquette ne dessine ⑯ qu’au matin (« Jour 12 · Matin »). `VERGE3_NUIT_FINAL.png` (2 739 887 octets,
même commit) existe si un état de nuit est un jour décidé. Il n’est pas dessiné, donc pas dû.

### B02, le comptoir : ce n’est PAS de l’art, c’est du CSS

La page n’embarque aucune image du comptoir : ses quatre seuls fonds embarqués sont `district`, `verge`, `bar` et `verge-jour`. Le
zinc, l’étagère et les tabourets sont dessinés en CSS, donc en UI procédurale côté client, **sans asset à produire**. Valeurs dans
`ecrans-brennar-4.html` (couleurs CSS = **sRGB**) :

| élément | règle | ligne |
|---|---|---|
| le bloc du zinc (64 % du bas sur ⑯) | `.zinc` · `.zinc.revue` | `:203` · `:212` |
| l’étagère du fond, 7 bouteilles en dégradé | `.zinc .dos` · `.zinc .dos i` (impaires plus hautes) | `:204` · `:205-206` |
| le plateau doré, en perspective 8° | `.zinc .plateau` | `:207` |
| le bas sombre sous le plateau | `.zinc::after` | `:208` |
| le dégradé sur la scène | `.degrade.jour` | `:351` |
| v4-1, les 3 tabourets vides | `.tabourets.vides` · `.vide-siege` · `.tabouret .pied` | `:381` · `:382` · `:323` |

### S’il fallait un fond plus net : ce qu’il faudrait produire, sans le produire ce soir

Ce n’est pas nécessaire pour F1. Le mode opératoire, s’il est voulu un jour :
1. retrouver la caméra en rendant les trois caméras en `draft` (1280×800, 96 échantillons), puis apparier au PNG avec le même script ;
2. faire un rendu `final` de cette caméra à une résolution qui donne ≈1:1 sur 1080×2400, soit environ 2,35 fois 1728×1080.
   Mieux : un cadrage portrait qui ne rend que la fenêtre visible (le toit et l’enseigne), pour ne pas payer les pixels cachés
   sous le zinc.
**Coût non mesuré** : aucune durée de rendu `final` de `map_verge3.py` n’est journalisée. Il se mesure au premier draft, avec la
machine libre : pas de gate, pas de porte Unity tenue.

---

## 3. Ce qui part d’ici

- **À l’user** : ratifier ou refuser les trois phrases, et l’en des trois dessinées.
- **À CLIENT-2** : B01 = monter `VERGE3_JOUR_FINAL.png` avec la boîte et le cadrage ci-dessus. B02 = UI procédurale depuis le CSS
  cité. ⑯-4 = la table du §1, repli compris, et un falsifiable sur la table plutôt qu’une capture.
- **Au back (f7)** : « Réassort » contredit le score de `stash_reorder` (§1, fait 4). Et « votre planque » dans le couplage
  `erlang_stash__deal_lek` nomme le stash du nom d’un autre bâtiment.
