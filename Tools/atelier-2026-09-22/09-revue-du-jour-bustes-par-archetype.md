# ⑯ La Revue du jour — B03, un buste par archétype : l'existant, le manque, et un arbitrage

> Atelier / DA, 2026-09-22 (23:10). Documents et mesure seulement : aucun rendu, aucune rastérisation, rien sous `Assets/`.
> **Cadre cité** : série 4, cadre **v4-0** (`ecrans-brennar-4.html` cadre 0, atelier `868ab87`) : trois billets, trois médaillons,
> trois silhouettes différentes. La note de scène du cadre v4-3 dit « Le buste suit `archetype` de la même jointure (ferme E7
> sans lot back) ». **Sources** : back `4841d7ad` ; client `8c1fd0e3` (arbre F, CLIENT-2) ; écart `06cc21d6`, ligne B03.


> ## ✅ TRANCHÉ le 2026-09-22 (orchestrateur) — les §3 et §4 ci-dessous sont CADUCS
>
> La question n'était pas ouverte : le chantier « silhouettes contemporaines » du **2026-09-02** (client `7bfd196`) nomme les bustes
> par **RÔLE**. `don` = le joueur, tête nue, avec l'anneau or-vif comme marque de rang ; `lieutenant` = capuche ; `homme` = casquette.
> Les trois billets de ⑯ sont des lieutenants ⇒ **capuche pour les trois**. Le don de Sallo et la casquette de Tovah dans v4-0 sont
> l'artefact du renommage mécanique, pas une intention. ⑥ et ① sont déjà conformes.
> - **Client (⑯-5)** : `ui_element_buste_lieutenant` pour tout lieutenant, **sans art neuf**. Le manque chiffré au §4 tombe à zéro.
> - **Maquette corrigée** : atelier `8509195`. Les neuf billets de v4-0, v4-2 et v4-3 passent à `#buste-lieutenant`, et la note de
>   scène de v4-3 (« le buste suit `archetype` ») est réécrite en citant la décision.
> - ✅ **Référence de ⑯ re-rendue** au signal de l'orchestrateur (atelier `0ccd8d5`) : `reference-1080x2102.png`, `v4-0`, `v4-2`, `v4-3`
>   (`v4-1` inchangé : écart d'anticrénelage seul, restauré) — `rendre-references-serie4-2026-09-22.py`.
> - ✅ **Tranché** (orchestrateur, 22/09) : l'anneau est la marque du Don seul — retiré (atelier `0ccd8d5`). *Note d'origine :* la classe `.medl.don` (`ecrans-brennar-4.html:44`, bordure `--or-vif`) est l'anneau que la
>   décision du 02/09 réserve au Don. Elle est posée sur le **premier billet** de v4-0, v4-2 et v4-3 (Lt. Hara), et sur ⑨/⑩ (cadres 14,
>   15, 17, 18). Si l'anneau est la marque du Don, un lieutenant ne le porte pas. S'il signifie autre chose sur ⑯, comme « celui qui
>   parle en premier », c'est un second sens pour la même forme.

---

## 1. Quels archétypes ⑯ peut afficher — lu dans le back, pas dans la maquette

Le back déclare **neuf** archétypes (`operational/lieutenant/lieutenant-archetype.ts:38-51`) : COOK, LOGISTICS, DISTRIBUTION,
LAUNDERING, SECURITY, BOOKKEEPER, MUSCLE, INTELLIGENCE, FACILITY_MANAGER.

Une carte de ⑯ ne montre **que le lieutenant qui tient le rôle responsable d'un générateur**. `resolveRoleHolder` interroge
`lieutenant.role_id` (`lieutenant.repository.ts:1452-1460`). Or `role_id` est écrit **une seule fois**, au recrutement
(`role_id = roleIdForArchetype(archetype)`, `lieutenant.service.ts:147`), et aucune écriture ne le change ensuite. J'ai
cherché une mise à jour de `role_id` dans les sept `update(lieutenant)` et dans le SQL brut : il n'y en a aucune. Donc :

| générateur | rôle responsable | archétype qui le tient | ⑯ peut-il l'afficher ? |
|---|---|---|---|
| `courier_scheduling` | 6 (`courier-scheduling.generator.ts:43`) | **LOGISTICS** | **oui** |
| `front_shop_reconciliation` | 4 (`front-shop-reconciliation.generator.ts:42`) | **LAUNDERING** | **oui** |
| `lek_rotation` | 8 (`lek-rotation.generator.ts:45`) | **DISTRIBUTION** | **oui** |
| `precursor_order` | 9 | aucun | non : aucun archétype ne donne le rôle 9 (`08-…` §1, fait 1) |
| `stash_reorder` | 2 | aucun | non : même raison, rôle 2 |

⇒ **Trois archétypes seulement peuvent paraître sur ⑯ en production** : LOGISTICS, LAUNDERING, DISTRIBUTION. Ce sont exactement
les trois billets de v4-0 : Hara replanifie la tournée, Tovah rapproche la façade, Sallo fait tourner le Lek.
Les six autres (COOK, SECURITY, BOOKKEEPER, MUSCLE, INTELLIGENCE, FACILITY_MANAGER) n'arrivent sur ⑯ que par le seam de test
`force-flag`, qui peut signaler n'importe quel lieutenant. Il leur faut un **repli** dans la table du client : le buste générique
(§2). Ils ne coûtent rien.

---

## 2. L'existant — trois bustes, déjà dans le client, déjà joignables

| fichier (client) | taille | commit | lecteur aujourd'hui |
|---|---|---|---|
| `Assets/Resources/Lieutenant/ui_element_buste_lieutenant.png` | 256×256 RGBA, 10 447 o | `7bfd1968` (2026-09-02) | ⑥ `LieutenantScreenController.cs:2426` et ① `DistrictInteriorScreenController.cs:1542`, **pour tous les lieutenants** |
| `Assets/Resources/Lieutenant/ui_element_buste_don.png` | 256×256 RGBA, 8 892 o | `7bfd1968` | ⑥ `:2374`, **le Don seul** (`don: true`, l'anneau or-vif) |
| `Assets/Resources/Lieutenant/ui_element_buste_homme.png` | 256×256 RGBA, 9 211 o | `7bfd1968` | **aucun** : produit, joignable, jamais lu. C'est un des orphelins de la mémoire « art sans consommateur ». |

- **Même géométrie que la maquette, prouvé sans rendu.** J'ai haché les données de chemin (`d`, `cx`, `cy`, `r`, `fill-rule`)
  des trois groupes `buste-*`, dans la maquette et dans le producteur du client (`Tools/family-bustes-source.html`). Les trois
  empreintes sont **identiques** : don `f2b43d8408`, lieutenant `b3ba78da4b`, homme `079c29f45a`. Les PNG sortent de ce
  producteur par `Tools/rasterise-bustes.py` (PIL, sans navigateur, garde de bbox).
- **Montables tel quels** : ils sont déjà sous un dossier `Resources` et lus par `Resources.Load("Lieutenant/…")`. La couleur
  `#cfc4a6` est cuite dans le PNG, en sRGB ; l'`Image` reste blanche, comme sur ⑥.
- **Ce que v4-0 dessine, symbole par symbole.** Les trois ids de la maquette sont des alias posés le 02/09 (atelier `ebea368`,
  « fedora/homburg/casquette → don/lieutenant/homme ») :

| billet v4-0 | générateur ⇒ archétype | symbole de la maquette | ⇒ buste réel | asset client |
|---|---|---|---|---|
| Lt. Hara | courier ⇒ **LOGISTICS** | `#buste-fedora` | lieutenant (capuche) | `ui_element_buste_lieutenant` |
| Lt. Sallo | lek ⇒ **DISTRIBUTION** | `#buste-homburg` | **don** (tête nue) | `ui_element_buste_don` |
| Lt. Tovah | façade ⇒ **LAUNDERING** | `#buste-casquette` | homme (casquette) | `ui_element_buste_homme` |

⇒ **Pris à la lettre, v4-0 se monte sans aucun art neuf** : les trois bustes existent, à la géométrie exacte. Et ⑯ donnerait
enfin un lecteur au buste « homme ».

---

## 3. ⛔ Ce qui empêche de s'arrêter là — un arbitrage, pas un manque d'art

1. **Le buste du Don sur un lieutenant.** Le client réserve `buste_don` au joueur (⑥, « VOUS / LE DON »). Sur v4-0, le lieutenant
   de DISTRIBUTION porte ce même dessin. Ce n'est pas un choix de la maquette : c'est l'effet du renommage mécanique du 02/09,
   qui a fait de `homburg` un alias de `don` sans que personne ne décide qu'un lieutenant porterait la silhouette du patron. Le
   rang reste marqué par l'anneau or-vif, mais le dessin serait le même que celui du joueur sur ⑥.
2. **La même personne, deux silhouettes selon l'écran.** ⑥ et ① dessinent **tous** les lieutenants avec la capuche. Si ⑯ applique
   « le buste suit l'archétype », Sallo aura la capuche sur ⑥ et une autre tête sur ⑯. Soit la règle vaut pour les trois écrans
   (⑥, ①, ⑯), soit ⑯ reste au buste générique comme les deux autres.

**Recommandation de l'atelier** : réserver `buste_don` au joueur, et appliquer la règle **aux trois écrans ou à aucun**. Tant que
ce n'est pas tranché, ⑯ reste au buste générique `ui_element_buste_lieutenant` pour tous, comme ⑥ et ① : c'est cohérent, et ce
n'est pas une régression.

---

## 4. Le manque, chiffré — seulement si l'user choisit « un buste par archétype » ET « le Don réservé »

Il manque **une** silhouette de lieutenant, pour DISTRIBUTION. LOGISTICS garde la capuche, et LAUNDERING prend la casquette
existante.

| étape | qui | coût | machine |
|---|---|---|---|
| dessiner le groupe `<g id="buste-…">` dans le `<defs>` de `Tools/family-bustes-source.html` (viewBox 32, encre X∈[6,26], bas à y=30 : le contrat d'accueil des trois autres) | atelier | **30 à 60 min** d'écriture de géométrie | aucune |
| **planche regardée par l'user** : le rastériseur prouve l'absence de crop, pas que le dessin est juste (`rasterise-bustes.py`, en-tête v2) | user | un regard | aucune |
| rastériser en 256×256 | atelier | secondes (PIL, sans navigateur) | négligeable, mais **après ton signal** |
| porter le même bloc dans la maquette et dans la source de référence (le rastériseur refuse une copie divergente) ; un alias pour v4-0 | atelier | 15 min | aucune |
| monter : 1 PNG + `.meta` sous `Assets/Resources/Lieutenant/`, la table archétype → buste avec repli générique, et la même règle sur ⑥ et ① si l'user l'étend | client | lot ⑯-5 | — |

**Total atelier ≈ 1 h 15 plus un regard de l'user.** Aucun Blender, aucune API payante. Si l'user accepte au contraire le dessin
tel quel (le Don sur DISTRIBUTION), le manque tombe à **zéro**.

Les six archétypes que ⑯ n'affiche pas en production ne sont pas chiffrés ici : le mandat ne demande que les archétypes de ⑯. Si la
règle s'étend à ⑥, où tous les archétypes paraissent, le compte change : neuf archétypes pour deux silhouettes de lieutenant
disponibles. C'est à chiffrer ce jour-là, pas ce soir.

---

## 5. L'autre art qui existe, et pourquoi ce n'est pas la réponse à B03

La campagne fal.ai du 06/09 a livré des **portraits peints**, archivés dans le client et **non montés** : 0 lecteur sous
`Assets/Scripts`. Les quatre occurrences de `Tools/fal` y sont des commentaires sur les états vides. Le détail est dans
`Tools/fal/MANIFESTE-MONTAGE.md` §1-2 :
- `Tools/fal/generees/2026-09-06/aplat/visage-001.png` … `visage-150.png` : 150 visages, 1024×1024 RGB, en LFS. **Clé = l'id du
  lieutenant**, jamais le nom, jamais l'archétype (décision du 06/09) ; l'attribution doit sonder, pas seulement hacher (§1).
- `aplat/lt-<nom>.png` : 24 portraits nommés, dont `lt-hara`, `lt-sallo` et `lt-tovah`, les trois de v4-0. Dernier commit
  `ee210b7c` (2026-09-07).

La carte de ⑯ sert `lieutenant.id` et `lieutenant.name` (`flag-discipline.service.ts:82`) : ces portraits seraient
**techniquement** attribuables sans lot back. Mais ce sont une **autre DA**, le registre « dossier » (postérisé quatre encres, ère
fin 80 – début 90), là où v4-0 ratifie des **silhouettes** (ère 2000-2010, ruling du 02/09). Les monter sur ⑯ seul, c'est changer
la DA d'un écran contre la maquette ratifiée, et contre ⑥ et ① qui gardent les silhouettes. C'est une décision de l'user, pas une
réponse à B03.
