# ㊲ LA RÉPUTATION — trois lots BACK, prêts à transcrire dans `back.md`

> Issus du juge données ⊥ en mode clôture (rapport `…/cloture-2026-08-31/rapport.md`, commit
> `578c299`). Ces trois items ne sont **ni à moi** (rien à corriger côté écran) **ni à l'user**
> (ce n'est pas un arbitrage produit) : ce sont des maillons manquants côté serveur.
>
> ⛔ `back.md` m'est interdit par mon mandat de session, comme `front.md`. Je rédige, une autre
> session transcrit — même partage que pour `TD-430..435`.
>
> **Chaque item porte sa falsifiable et l'écran nommé qui la tire** : un item de `back.md` sans
> écran demandeur ne veut rien dire, et meurt avec le lot qui l'a écrit.

---

## L-a — le compte d'enfreintes n'est projeté nulle part

**Écran demandeur** : ㊲ La réputation (`screen_b3`), compteur « ENFREINTES ».
**Ce qui manque** : aucune clé du corps de `GET /v1/me/reputation` ne porte le nombre d'enfreintes.
La donnée existe (`boss_mirror_violation_ring.violation_slots[]`) et reste en base.

**Mesure — 2026-09-01** : `reputation-hub.service.ts:54` déclare la surface *« P5-compliant — no raw
`violation_density`, `defection_tolerance`, or `consistency_index` »*. La rétention est donc
DÉLIBÉRÉE, pas un oubli.

⚠️ **Ce lot n'est peut-être pas souhaitable, et c'est à trancher avant de l'ouvrir.** Le back
refuse les scalaires bruts par conception (P5). Ce qui manque n'est pas « exposer
`violation_density` » — ce serait contraire à la doctrine — mais éventuellement **une bande**
(`violation_band`), du même type que `portrait_posture` qui est déjà dérivée du même scalaire.

**Falsifiable** : `GET /v1/me/reputation` porte une clé de bande d'enfreintes ∈ un vocabulaire fermé ;
aucun scalaire brut n'apparaît dans le corps ; et l'écran ㊲ remplace son « — » par cette bande.
**Tant que ce lot n'existe pas** : le tiret reste, et il est JUSTE — il dit « pas de source »,
là où un « 00 » dirait « mesuré à zéro ».

---

## L-b — aucune route joueur ne retire une règle

**Écran demandeur** : ㊲ La réputation, absence délibérée de bouton de retrait.
**Ce qui manque** : `BossMirrorService.retractRule(playerId, ruleId)` existe et fonctionne, mais
n'est exposé que par `reputation-test.controller.ts` — un contrôleur de test. Zéro route joueur.

**Mesure — 2026-09-01** : `grep retractRule` sur `--include='*.controller.ts'` ne rend que
`reputation-test.controller.ts:717/729`. Le contrôleur joueur `reputation.controller.ts` n'expose
que `POST /v1/me/house-rules` (déclaration), jamais le retrait.

**Pourquoi ça compte pour le joueur** : le canon dit qu'une règle déclarée tient *« jusqu'à ce que
vous la retiriez publiquement »* — la maquette l'écrit dans son panneau, et l'écran l'affiche. Tant
que le maillon manque, **une règle donnée est définitive**, ce qui n'est pas ce que le texte promet.

**Falsifiable** : une route joueur retire une règle déclarée ; `consistency_index` cesse d'être
`null` après un cycle déclarer → enfreindre → retirer ; et ㊲ peut offrir le geste sans qu'il échoue.
**Tant que ce lot n'existe pas** : l'écran n'offre aucun bouton — il DIT que la règle est
définitive plutôt que d'offrir un geste qui échouerait.

---

## L-c — les contreparties ne sont listées par aucune route joueur

**Écran demandeur** : ㊲ La réputation, section `restraint` (offre et marginalia).
**Ce qui manque** : `GET /v1/me/reputation` accepte `counterparty_id` en paramètre et omet
`restraint` sans lui — mais **aucune route joueur ne permet d'obtenir un `counterparty_id`**.

**Mesure — 2026-09-01** : les `restraint_dispute_ring` ne sont énumérés que par
`reputation-admin.controller.ts:157/178/229` (contrôleur ADMIN). Côté joueur, `counterparty_id`
n'apparaît qu'en **entrée** de la route, jamais en sortie d'une autre.

⇒ C'est une **branche morte par construction** : le paramètre existe, la section existe, le
résolveur front existe (trois fonctions écrites, zéro appelant), et le joueur ne peut jamais
déclencher l'ensemble. La maquette dessine pourtant cette section (`m-123`).

**Falsifiable** : une route joueur énumère les contreparties du joueur avec leur identifiant ; ㊲
peut alors demander `restraint` et l'afficher ; les trois résolveurs front cessent d'avoir zéro
appelant.
**Tant que ce lot n'existe pas** : la section reste déclarée en écart assumé, **avec sa date et sa
mesure**, et le front n'y touche pas — faire vivre côté écran une section inatteignable
reviendrait à montrer au joueur une chose qu'il ne peut jamais obtenir.
