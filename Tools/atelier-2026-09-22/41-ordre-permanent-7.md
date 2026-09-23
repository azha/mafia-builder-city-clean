# 41 — ⑦ l'ordre permanent : où le joueur le DONNE, et le geste proposé ; les mots demandés par CLIENT-1

> Atelier / DA, 2026-09-23. Deux commandes :
> - f2 : l'émetteur `POST /v1/lieutenants/:id/standing-order` n'est appelé par aucun écran ni aucune maquette ; où un joueur donne-t-il un
>   ordre permanent ?
> - CLIENT-1 : ses mots pour ⑦ (freshness FRESH/EXPIRED, les refus, `cue_bands`).
>
> **Aucun dessin** avant le GO de f2. Lu : back `7136ea59` (`lieutenant.controller.ts:109-117, 531-620`, `standing-order.service.ts:37-259`),
> canon `gdd/07_lieutenants_and_behavior.md`, `front.md`, les pages de l'atelier.

> ⚠️ **CORRIGÉ le 23/09 (f2), après la mesure de CLIENT-1.** Ma première version (§2, §3) disait que le formulaire à trois verbes de la
> série 1 était servable (« le segment produit le `rule_source` », « la Cible est dans la condition »). **C'était faux, et non vérifié.**
> - Le back exige une règle DSL complète (`WHEN … THEN … @N`).
> - Aucune action exécutable ne signifie Collecte, Blanchir ou Surveiller (`compiler.service.ts:66` : `EXECUTE_DEFAULT`, `PAUSE_OPS`,
>   `REQUEST_PLAYER_INPUT`, `dispatch_courier`, `set_stance`, `toggle_ephemeral`, `schedule_maintenance`).
> - Le formulaire n'a pas de déclencheur, et la cible n'a aucun argument DSL.
>
> Et je n'avais pas relu le registre : f2 applique à ⑧ le point 3 du 07/09. On ratifie l'éditeur CONSTRUIT, et le formulaire à trois verbes
> va en backlog.
> **Retiré** : Collecte · Blanchir · Surveiller, et la Cible.
> **Gardé** : le geste « Donner un ordre », « Et quand il expire » et ses 3 mots, « Signer l’ordre », « pour une durée fixe ».
> **L'émission se fait par l'ÉDITEUR de ⑧, en mode ordre permanent** : UNE règle, écrite avec les mots servis `famille.regle.*`. Les clés
> exactes sont dans `42-…`.

## 1. Où un joueur donne un ordre permanent — les sources

| source | ce qu'elle dit | ligne |
|---|---|---|
| **Maquette ratifiée, série 1** : cadre « Lieutenant — fiche + formulaire » | « Ordre permanent · Collecte · Blanchir · Surveiller ✕ · Sal rejette la surveillance — l’ordre coûterait de la loyauté · Cible · Lavomatic du bloc médian ▾ · Durée · 12 jours · **SIGNER L’ORDRE** » | `~/project/atelier3d-mafia/ecrans-brennar.html` l.~285 |
| **front.md ⑧** Rule Editor « SIGNER L'ORDRE » | « côté DA : un segmenté `Collecte | Blanchir | Surveiller`, une glissière de durée, CTA `SIGNER L'ORDRE` » · « Maquette : `ecrans-brennar.html` §2 (le formulaire d'ordre permanent) » · état « HTML + PNG ratifiés » ; le juge : « c'est l'ORDRE PERMANENT qui n'expose ni règle ni cible ni échéance » | `front.md` l.1418-1433 |
| **Canon** | « Every standing order carries an **expiry timestamp** … Re-authorization is a deliberate player action » ; `StandingOrder { instruction_type, target_entity, issue_tick, expiry_tick, lapse_action ∈ REVERT_DEFAULT / HOLD_LAST / ESCALATE_TO_PLAYER }` | `gdd/07` l.483-497 |
| **Canon** | la promotion : « a Standing Order that lapses repeatedly (3+ consecutive cycles) suggests being converted into a behavior trait » | `gdd/07` l.125 |
| **⑦ série 6 (atelier)** | le cadre 2 montre l'ordre en cours et ses trois décisions (en faire la règle · renouveler · retirer), mais **pas son émission** | `26-…`, `ecrans-brennar-7-lieutenant.html` |

**Conclusion (corrigée).**
- L'émission part de **la fiche du lieutenant** (⑦) et passe par **l'éditeur construit de ⑧**, qui est ratifié. Le formulaire de la série 1
  (le lieu que citait front.md) reste en backlog.
- Le client a bâti ⑧ en éditeur de règles : un DSL attaché au script. L'ordre permanent, lui, n'a jamais reçu son geste.
- La refonte de ⑦ (série 6) l'a laissé de côté. C'est un trou de MA maquette (`26-…`) : elle aurait dû le lister dans « ce qui disparaît ».

## 2. Ce que le back sert — et ce que la maquette ratifiée ne peut plus dire

| élément ratifié (série 1) | le back (7136ea59) | verdict |
|---|---|---|
| Collecte · Blanchir · Surveiller (l'instruction) | ~~servable~~ — aucune action DSL ne les signifie (`compiler.service.ts:66`) | ⛔ **retiré** (backlog, point 3) : la règle s'écrit dans l'éditeur de ⑧ |
| Cible ▾ | ~~dans la condition~~ — aucun argument DSL de cible | ⛔ **retiré** (backlog) |
| **Durée · 12 jours** (glissière) | `duration_class` **ignoré en M2** : `expires_at = now + durationStandardTicks`, une durée FIXE | ⛔ **non servable** : la glissière tombe ; on dit l'échéance par la bande `freshness` |
| « Sal rejette la surveillance — l’ordre coûterait de la loyauté » | aucune loyauté servie (retirée de ⑦, `26-…` §1) | ⛔ tombe |
| — (absent de la maquette) | `lapse_action` ∈ REVERT_DEFAULT · HOLD_LAST · ESCALATE_TO_PLAYER — **obligatoire** (422 sinon) | ➕ à ajouter : trois mots proposés (§3) |
| SIGNER L’ORDRE | `POST /v1/lieutenants/:id/standing-order {rule_source, lapse_action}` → `{order_id}` | ✅ le geste |

## 3. Le geste proposé (sur ⑦, là où la ligne « Ordre permanent » dit « aucun ordre »)

- **Déclencheur** : la ligne « Ordre permanent · aucun ordre » (`freshness` = NONE) porte un geste « Donner un ordre » (PROPOSÉ). Il ouvre le
  formulaire, sur la fiche : il n'y a pas d'écran neuf.
- **Le formulaire** est, depuis la correction, l'éditeur de ⑧ en mode ordre permanent :
  1. ~~l'instruction~~ ~~Cible~~ — retirés. À leur place, UNE règle écrite dans l'éditeur de ⑧, avec ses mots servis (par exemple « dans mon
     bâtiment → suspendre les opérations »).
  2. —
  3. **« Et quand il expire » (PROPOSÉ)**, les trois `lapse_action` en mots de joueur, épicènes (D13) :

     | `lapse_action` | fr (PROPOSÉ) | en |
     |---|---|---|
     | REVERT_DEFAULT | retour à la routine | back to routine |
     | HOLD_LAST | l’ordre continue | the order keeps running |
     | ESCALATE_TO_PLAYER | on vous demande | you get asked |

     ⚠️ Le titre « Et quand il expire » : « il » renvoie à l'ordre, pas à une personne, donc pas de genre présumé.
  4. **Signer l’ordre** (ratifié).
- **L'échéance** : pas de glissière. Une ligne dit que la durée est FIXE, par exemple « pour une durée fixe » (PROPOSÉ), puis ⑦ montre la
  bande `freshness`.
- **Dessin** : le cadre 3 de `ecrans-brennar-7-lieutenant.html` (GO f2, corrigé : l'éditeur de ⑧, sans les trois verbes). Rendu après le gate.

## 4. Les mots pour CLIENT-1 (⑦, son lot des deux décisions)

**`standing_order.freshness`**

| valeur | fr | en | statut |
|---|---|---|---|
| NONE | aucun ordre | no order | `26-…` §3 (proposé, dessiné) |
| FRESH | en cours | in force | PROPOSÉ |
| EXPIRES_SOON | expire bientôt | expires soon | `26-…` §3 (proposé, dessiné) |
| EXPIRED | échu | lapsed | PROPOSÉ ; « échu » s'accorde à l'ordre, pas à une personne. Il ne se voit que si `lapse_action` = HOLD_LAST (l'ordre injecte encore après l'échéance, `standing-order.service.ts:41-44`) |

**Les refus.** Les codes restent en annexe, jamais à l'écran. Le refus est DIT, comme au labo (front.md l.886-888).

| refus (back) | fr (PROPOSÉ) | en |
|---|---|---|
| 409 cooldown : même geste trop tôt, par (geste, repère) pour le signal, par décision pour l'ordre (`:223-248`) | Trop tôt pour refaire ce geste. | Too soon to do that again. |
| 409 « aucun ordre en cours » (`:233-234`, « has no standing order to {kind} ») | Il n’y a pas d’ordre en cours. | There’s no order in force. |
| 409 PROMOTE refusé, l'ordre n'est pas `promotion_suggested` (`:217`) | Cet ordre n’a pas encore fait ses preuves. | This order hasn’t proven itself yet. |
| 409 un ordre est déjà actif quand on en signe un autre (`:108-109, 125-126`, « RENEW it instead ») | Un ordre est déjà en cours : renouvelez-le. | An order is already in force: renew it. |
| 422 geste ou repère invalide (ne devrait pas arriver depuis l'écran) | Ce geste n’est pas reconnu. | That move isn’t recognised. |

Note sur le 4ᵉ refus : c'est le refus de l'émission, un de plus que la liste de CLIENT-1. D17 : sa ligne FR porte une insécable avant « : ».

**`cue_bands`** : la fiabilité d'un repère, PROPOSÉE. Les mots s'accordent au repère, pas à une personne.

| valeur | fr | en |
|---|---|---|
| dormant | en sommeil | dormant |
| partial | à moitié fiable | partly reliable |
| reliable | fiable | reliable |
| dominant | décisif | decisive |

- « en sommeil » est la même locution que celle de ⑰ (DORMANT, 30 v2).
- `26-…` §2 disait « à redessiner quand un corps réel l'aura ». Ces mots permettent de l'afficher dès que CLIENT-1 le veut.
  Recommandation : l'afficher à côté de chaque repère du geste « Brouiller un repère » (cadre 1), car c'est le choix qu'il éclaire.

## 5. À ratifier (user, via f2)

1. Le lieu : l'émission part de la fiche ⑦ et passe par l'éditeur de ⑧ (tranché par f2). Le formulaire à trois verbes, la glissière et la
   loyauté sont retirés.
2. Les mots proposés des §3 et §4.
