# Mesures — juge données ⊥ ㊵ « La filière » — maquette — 2026-09-06

Lecture seule. **Aucune stack montée, aucun `curl`, aucun `npm`, aucun test** (gate E2E en cours —
contrainte du mandat). Back lu dans `/home/erutheone/project/mafia-clean-city/services/game-back/src`
et `/home/erutheone/project/mafia-clean-city/tests/e2e`.

Tout compte qui décide passe par un `$( )` ou par un oracle `python3` (CLAUDE.md : la vue directe du
proxy est LOSSY). Chaque compte à zéro porte son **contrôle positif**.

---

## 1. Périmètre — routes du domaine

    $ cd services/game-back/src
    $ grep -ril 'launder' --include='*.controller.ts' .
    ./citysim/dwell_time/dwell-time.controller.ts
    ./citysim/heat/heat-test.controller.ts
    ./core_loops/core-loops-admin.controller.ts
    ./operational/effect_engine/effect-engine-test.controller.ts
    ./operational/forensic/forensic.controller.ts
    ./operational/forensic/forensic-test.controller.ts
    ./operational/insurance/insurance-test.controller.ts
    ./operational/laundering/laundering.controller.ts
    ./operational/lieutenant/lieutenant.controller.ts
    ./operational/liveops/live-ops-test.controller.ts

    $ grep -ril 'safehouse' --include='*.controller.ts' .
    citysim/erlang_stash/erlang-stash.controller.ts
    meta_progression/vertical-horizon-test.controller.ts
    operational/laundering/laundering.controller.ts
    operational/maintenance/maintenance-test.controller.ts
    operational/selling/selling.controller.ts

    $ grep -ril 'blanchiment' --include='*.controller.ts' .        # 0 hit — le back ne parle pas français

    $ R=$(grep -c "@UseGuards(JwtAuthGuard)" operational/laundering/laundering.controller.ts); echo $R
    5

⇒ 5 routes joueur dans le contrôleur du domaine (`laundering.controller.ts:79/129/170/183/203`).
Frontière retenue (le mot du domaine, hors module) : `citysim/erlang_stash/erlang-stash.controller.ts:59`
(`GET city/district/:id/stash`) et `operational/selling/selling.controller.ts:94`
(`POST operational/dealer/:id/collect`).

## 2. Corps réels — état du manifeste

    $ cd Tools/juge-visuel/screen_c2/corps-reels
    $ S=$(python3 -c "import json;d=json.load(open('_index.json'));print(len(d['routes']))"); echo $S
    5
    $ T=$(python3 -c "import json;d=json.load(open('_index.json'));print(sum(1 for r in d['routes'] if r['route'].endswith('/stage')))"); echo $T
    0
    $ U=$(python3 -c "import json;d=json.load(open('_index.json'));print(sum(1 for r in d['routes'] if 'inject' in r['route']))"); echo $U    # contrôle positif
    1

⇒ `POST /v1/operational/laundering/stage` est ABSENTE du manifeste (contrôle positif : `inject` y est).

Corps mesuré (`GET_operational_laundering.json`, 200, `back_main 6ff684db`, 2026-09-04T10:15:48,
compte `operational_demo@example.test`, X-Request-Id `0af6129d-…`) :

    nodes[0] stage_index 1  cleanliness_band PARTIAL       terminal false  has_cash false
    nodes[1] stage_index 2  cleanliness_band MOSTLY_CLEAN  terminal false  has_cash TRUE
    nodes[2] stage_index 3  cleanliness_band CLEAN         terminal false  has_cash false
    nodes[3] stage_index 4  cleanliness_band CLEAN         terminal TRUE   has_cash false

## 3. `building_id` absent des projections de blanchiment (forme F)

    $ cd services/game-back/src/operational/laundering
    $ N1=$(grep -c 'building_id' laundering.projection.service.ts); echo $N1
    0
    $ N2=$(grep -c 'building_id' laundering.controller.ts); echo $N2      # contrôle positif (addStage)
    9
    $ N3=$(grep -c 'has_cash'   laundering.projection.service.ts); echo $N3   # contrôle positif
    5
    $ N4=$(grep -c 'deviation_active' laundering.projection.service.ts); echo $N4  # contrôle positif
    3

## 4. Écrivains

    $ W=$(grep -rn "set({ transaction_profile" --include='*.ts' . | grep -cv node_modules); echo $W
    1
    operational/laundering/laundering.repository.ts:473

    $ grep -rn "createSafehouse" --include='*.ts' . | grep -v node_modules
    ./operational/laundering_persistence/laundering-persistence.service.ts:82   (définition)
    ./onboarding/onboarding-grant.service.ts:411                                (SEUL appelant de production)

## 5. i18n — famille de bandes incomplète

    $ cd services/game-back/src/i18n
    $ A=$(grep -c "blanchiment.purete.partial" string_table.ts); echo $A
    0
    $ B=$(grep -c "blanchiment.purete.mostly_clean" string_table.ts); echo $B   # contrôle positif
    2
    $ C=$(grep -c "blanchiment.purete.a_demi_propre" string_table.ts); echo $C  # contrôle positif
    2

    $ python3 -c "…"   # oracle : 1220 clés, 2 blocs de locale ('en' l.53… / 'fr' l.~990…)
    blanchiment.purete : 8 clés PAR LOCALE
      en : clean(139) dirty(140) mostly_clean(141) | half…(859) mostly(860) clean(861) unknown(862) dirty(863)
      fr : Propre(994) Sale(995) Presque propre(996) | À demi propre(1702) Presque propre(1703)
           Propre(1704) Propreté inconnue(1705) Sale(1706)

## 6. Arithmétique des bandes (valeurs de registre LIVRÉES)

    pipelineCleanlinessForStage(s) = base + (s-1)·gain      laundering-tunables.ts:147-154
      base = laundering.stage1_cleanliness_base      défaut 0.40   plage 0.2..0.6   (:121)
      gain = laundering.node_cleanliness_gain_pct    défaut 0.25   plage 0.1..0.25  (:132)
    cleanlinessBucket(c) : c>=0.85 CLEAN · c>=0.5 MOSTLY_CLEAN · c>=0.25 PARTIAL · sinon DIRTY
                                                    dwell-time.service.ts:294-299

      s=1 → 0.40 → PARTIAL        s=2 → 0.65 → MOSTLY_CLEAN
      s=3 → 0.90 → CLEAN          s=4 → 1.00 → CLEAN          ← identique au corps réel ✔

    DIRTY à l'étape 1 exige base < 0.25, soit base ∈ [0.20, 0.25) — dans la plage de registre,
    PAS la valeur livrée.

## 7. Arithmétique de la déviation (valeurs de registre LIVRÉES)

    deviation = amountCents > frontShopLegitBaselineCents        laundering.service.ts:153
      frontShopLegitBaselineCents  défaut 250 000 c ($2 500)     laundering-tunables.ts:91
    inject refuse un montant > contenu de la planque             laundering.service.ts:129-134

    planque du grant : amorce [100,0,0,0] % × slot_capacity      onboarding-grant.service.ts:408-411
      slotCount            défaut 4        plage 1..12           laundering-persistence-tunables.ts:78
      slotCapacityCents    défaut 10 000   plage 1000..100000    laundering-persistence-tunables.ts:82
      ⇒ à la création : 10 000 c ;  planque PLEINE : 4 × 10 000 = 40 000 c

    40 000 < 250 001  ⇒ `deviation = true` INATTEIGNABLE aux valeurs livrées.

    Chemin indirect fermé aussi : inject CONFORME ⇒ buildTransactionProfile écrit
    samples=[B,B,B,B], latest=B ⇒ z = 0 ⇒ NOMINAL ⇒ jamais de pin.   laundering.service.ts:303-306
    Écrivain unique de transaction_profile : compté 1 (§4).
    Le pin est posé par le tick NIGHTLY/2 UNCONFORMITY_LEDGERS      city_sim_scheduler.service.ts:399
    — qui ne tourne pas hors staging (CITYSIM_CONTINUOUS_LOOPS, CLAUDE.md §faits contre-intuitifs).

## 8. `GET /:nodeId` refuse toute étape ≠ 1

    laundering.repository.ts:648-654 (getNodeProjectionInput) :
      .where(and(
        eq(launderingNode.player_id, playerId),
        eq(launderingNode.node_id, nodeId),
        eq(launderingNode.stage_index, 1),          ← ICI
      ))
    ⇒ `deviation_active` n'est atteignable que sur le nœud Stage-1 ; ailleurs le contrôleur 404
      (`laundering.controller.ts:188-192`).

## 9. Promotion du front-shop (le maillon 4 de la maquette)

    listPromoted filtre : ownership IN ('player','leased') + structural_state='operational'
                          + transaction_profile IS NOT NULL      unconformity.repository.ts:130-136
    le grant insère      : ownership='player', structural_state='operational'
                                                                 onboarding-grant.repository.ts:66,91-92
    l'inject écrit       : transaction_profile                    laundering.repository.ts:470-473
    ⇒ après UN inject, le front-shop du grant satisfait les 3 clauses : il EST promu.
