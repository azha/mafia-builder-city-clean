// Dev fixture: stand the SHARED demo player up in a RICH Phase-2 OPERATIONAL state, so the upcoming Unity screens
// (building card / laundering pipeline / dashboard) read non-trivial projection bands. Idempotent. Talks to the REAL
// dockerized backend (project mafia-clean-city) — no mocks. Mirrors the operational E2E specs
// (tests/e2e/operational/*.spec.ts), especially vertical_slice_loop.spec.ts which chains the whole loop.
//
// DISTINCT OPERATIONAL DEMO PLAYER: stands up its OWN account — `operational_demo@example.test` /
// `operational-demo-pw` — SEPARATE from the City Map seeder's `citymap_demo`. The two concerns share a
// heat-coupled city: the operational loop drives the player's city to BURNING + escalated, whose heat
// PROPAGATES across districts and would wash the City Map seeder's exact d3/d7/d11 gradient if both ran on
// one player. Distinct players make the full PlayMode suite ORDER-INDEPENDENT — neither seeder mutates the
// other's player (the operational screens read THIS player; the City Map screen reads the citymap player).
// Operational buildings are placed on FREE blocks in district 16 (Verge). This seeder is self-contained:
// it creates its account if absent, so it can run standalone (no dependency on the City Map seeder).
//
// SPEED (the dev stack uses REAL durations — lab setup 7200 ticks, lead 2880, cook 120, …): after each player-triggered
// API action we SQL-FAST-FORWARD the persisted tick clocks, then advance ONE tick so the operational MINUTE/* tick
// systems flip the state — instead of advancing thousands of ticks. The tick systems compare ctx.gameMinute (the clock)
// against the persisted tick columns, so re-anchoring those columns + a 1-tick nudge reliably flips each state:
//   - CONVERSION setup (MINUTE/6): UPDATE building_operational_state SET setup_remaining_ticks=1 → advance 1 → the tick
//     decrements to 0 and flips conversion_stage='operational'.
//   - PRECURSOR arrival (MINUTE/7): UPDATE precursor_order SET arrives_at_tick=<clock+1> → advance 1 → status=delivered
//     + precursor_stock increments.
//   - COOK advance (MINUTE/8): UPDATE cook_session SET current_stage='stage_4', stage_started_at_tick=<old> → advance 1
//     → the tick completes the cook and yields 200 g Brindle into the lab product_storage.
//   - COURIER transit (MINUTE/9): UPDATE courier_shift SET started_at_tick=<old> → advance 1 → cargo lands at the
//     destination product_storage, shift completed, courier at_destination.
//   - DEALER sell (MINUTE/10): a WORKING dealer at a lek-present operational dealer-spot with product sells
//     deal_grams_per_tick (5 g) × deal_value (2500 cents) per tick → advance N ticks for an accrued float.
//   - LAUNDER output (MINUTE/11): an injected node, once System 8 (MINUTE/2) cleans the idle node to ≥0.9 → release the
//     cleaned cash to the wallet (advance 1).
// The 1-tick nudges use the production-gated /v1/_test/citysim/advance harness (needs an Idempotency-Key, no auth).
//
// Usage:  node Tools/seed_operational_demo.mjs   (self-contained — stands up its own operational_demo player)

import { execFileSync } from 'node:child_process';
import { scryptSync, randomBytes } from 'node:crypto';

const COMPOSE = ['compose', '--project-name', 'mafia-clean-city'];
const PG_USER = process.env.POSTGRES_USER ?? 'mafia';
const PG_DB = process.env.POSTGRES_DB ?? 'mafia_clean_city';
const BASE_URL = process.env.STACK_BASE_URL ?? 'http://localhost';

// DISTINCT operational demo player (separate from the City Map seeder's `citymap_demo`).
// The two concerns share a heat-coupled city: the operational loop drives the player's city to
// BURNING + escalated, whose heat PROPAGATES across districts and would wash the City Map seeder's
// exact d3/d7/d11 gradient if both ran on one player. Giving the operational concern its OWN player
// makes the full PlayMode suite ORDER-INDEPENDENT — neither seeder mutates the other's player.
// Surcharge par variable d'environnement (2026-08-30, identité de démo par éditeur — deux éditeurs
// Unity en parallèle, un second worktree `~/project/mafia-unity-B` / branche `pilote-B`, ne doivent
// PLUS partager CE compte : voir Assets/Scripts/CityMap/DemoIdentityResolver.cs côté client, MÊMES
// NOMS de variable des deux côtés). Additif — défaut INCHANGÉ quand la variable est absente ou vide
// (`||` retombe sur le littéral pour `undefined` ET `''`).
const EMAIL = process.env.MAFIA_DEMO_IDENTIFIER || 'operational_demo@example.test';
const CALLSIGN = EMAIL.split('@')[0]; // dérivé de EMAIL — rend 'operational_demo' au défaut (inchangé).
const PASSWORD = process.env.MAFIA_DEMO_PASSWORD || 'operational-demo-pw';

// The Verge district the operational buildings live in — far from the City Map heat-gradient blocks (districts 3/7/11).
const OP_DISTRICT = 16;

// A generous wallet so every purchase + conversion + precursor order debit succeeds with room to spare. Reset on every
// run (idempotent) so the figures are deterministic regardless of prior runs.
const WALLET_CENTS = 1_000_000_000; // $10,000,000

// ── Grounded chain figures (REUSE the merged backend tunables — see services/game-back/src/operational/*-tunables.ts).
const PYRALIN_UNITS_PER_BATCH = 2; // production.brindle.pyralin_units_per_batch (one cook consumes one batch).
const TIER1_OUTPUT_GRAMS = 200; // production.brindle.tier_1_standard_output_g_per_cook (a single Tier-1 cook).
const COURIER_CARGO_GRAMS = 60; // grams ferried lab → dealer-spot (the lab keeps 140 g → MEDIUM storage band).
const DEAL_GRAMS_PER_TICK = 5; // selling.deal_grams_per_tick.
const DEAL_VALUE_CENTS_PER_GRAM = 2500; // selling.brindle_deal_value_cents_per_gram.
const DEAL_UNIT_CENTS = DEAL_GRAMS_PER_TICK * DEAL_VALUE_CENTS_PER_GRAM; // 12500 cents accrued per DEALER_SELL tick.
const SELL_TICKS = 6; // 6 DEALER_SELL ticks → a collectable float (6 × 12500 = 75000 cents) ferried to the safehouse.
const SAFEHOUSE_SLOT_COUNT = 4;
const SAFEHOUSE_SLOT_CAPACITY_CENTS = 50000; // 4 × 50000 = 200000-cent capacity ; 1% = 500 cents (on-boundary math).
// Laundering: inject the collected float (on whole-percent boundaries → exact round-trip; ≤ the 250000-cent legit
// baseline → conforming, no deviation; ≤ the 500000-cent node cap → fits).
const INJECT_CLEANED_CENTS = 50000; // first inject (released to the wallet → "some cleaned").
const INJECT_MIDPIPE_CENTS = 25000; // second inject (left buffered, node reset DIRTY → "mid-pipeline" demo).
// After laundering, accrue a fresh UNCOLLECTED dealer float for the "dispatch a runner" demo (a MODERATE cash band).
const DISPLAY_SELL_TICKS = 5; // 5 ticks × 12500 = 62500 cents → MODERATE band (≥2×12500, <8×12500).
// Phase-2b MULTI-STAGE pipeline: how many DOWNSTREAM stages to append after the Stage-1 front-shop node (Stage 2/3/4).
// Each downstream stage needs its OWN distinct player-owned OPERATIONAL building (addStage rejects a building that
// already hosts a node with 409), so we acquire+convert PIPELINE_DOWNSTREAM_STAGES extra operational buildings.
const PIPELINE_DOWNSTREAM_STAGES = 3; // Stage1 (front-shop) + 3 downstream → a 4-stage chain (Stage1→2→3→4).

// Phase-2b vector #2 (substances / Crick) cold-chain refinery: stand up a refinery holding 200 g Crick so the
// Building-Card cold-chain row (T8) reads substance_type=CRICK, temperature_status=OPTIMAL_COLD, degrading=false.
// A refinery is COLD-BY-NATURE (Crick is cold-by-nature when held in a refinery), so its held Crick reads
// OPTIMAL_COLD regardless of the cold_storage_capable flag. Mirrors the Brindle lab flow but on a refinery, with
// Crick's single precursor (verdant_root_extract) + a Crick-tagged single-stage cook.
const CRICK_PRECURSOR_UNITS = 2;   // production.crick.precursor_units_per_batch (one cook consumes one batch).
const CRICK_OUTPUT_GRAMS = 200;    // production.crick.yield_grams (a single Crick refine cook → MEDIUM storage band).

// Phase-2c vector #2c (substances / Ash) LUXURY channel: stand up a specialized_lab holding 200 g Ash at a known
// purity band + a booked appointment at a Glass venue, so the Building-Card Ash surface (T12) reads:
//   - lab_tier_band = REFINED (a Tier-2 specialized_lab — upgraded once from the Tier-1 build default),
//   - purity_band  = CRYSTALLINE (the storage projection of a Tier-2 lab + 2 refining passes → score 75 → CRYSTALLINE),
//   - appointment   = SCHEDULED (the panel's book→honor lifecycle; honored in a focused E2E, not pre-honored here so the
//                     Honor affordance is demonstrable).
// Mirrors the Brindle/Crick cook flow but on a `specialized_lab`, with Ash's precursor (glass_lily) + a 3-stage,
// refining-pass cook + the lab_tier lever (upgrade-tier) + the appointment book. The specialized_lab is placed in a
// GLASS-profile district so the SAME building is a valid appointment venue (book validates owned + Glass district), and
// the cooked Ash physically sits there (so an honor would sell it). Ash is the luxury channel — NO lek/dealer selling.
const ASH_PRECURSOR_UNITS = 2;     // production.ash.precursor_units_per_batch (one cook consumes one batch).
const ASH_OUTPUT_GRAMS = 200;      // substance.ash.yield_grams (a single Ash cook → MEDIUM storage band).
const ASH_REFINING_PASSES = 2;     // the time↔purity lever chosen at cook start (Tier-2 base 55 + 2×10 = 75 → CRYSTALLINE).
const ASH_TARGET_PURITY_SCORE = 75; // Tier-2 (base 55) + 2 refining passes (×10) − 0 pauses = 75 → CRYSTALLINE band.

// Phase-4 vector #4 (distribution_hub courier-dispatch logistics): stand up a distribution_hub at a KNOWN tier in a
// TIDEWATER/STACK district (the GDD-canon hub districts) + a couple of IN-TRANSIT shipments, so the Building-Card hub
// surface (T9) reads:
//   - hub_tier_band     = MEDIUM (a Tier-2 hub — upgraded once from the Tier-1 SMALL build default, so the
//                         Upgrade-hub-tier affordance is demonstrable AND the band is above the default),
//   - roster_band       = BUSY   (some shipments in transit but below the Tier-2 cap of 11 → OPEN < BUSY < FULL),
//   - available_vehicles = [FOOT, BIKE, CAR] (an operational hub unlocks the wheeled modes — the vehicle selector).
// A distribution_hub has NO production chain (it is a logistics building) — the demo shipments are dispatched FROM the
// Crick refinery (which holds 200 g) so the source has product. The shipments are pinned IN-TRANSIT (started_at_tick in
// the FUTURE so the COURIER_TRANSIT tick never arrives them through the later seeder advances) → a stable BUSY roster.
const HUB_DEMO_TARGET_TIER = 2;    // Tier-2 → hub_tier_band MEDIUM (cap 11; the canon curve 5/11/18/24/30 by tier).
const HUB_DEMO_IN_TRANSIT = 2;     // 2 in-transit shipments → BUSY (0 < 2 < cap 11). Small cargo each (the refinery has 200 g).
const HUB_DEMO_CARGO_GRAMS = 10;   // grams per demo shipment (×2 = 20 g of the refinery's 200 g — plenty left for the Crick UI).

// Phase-5 vector #5a (money_holding — clean-cash holding vault): stand up a money_holding at a KNOWN tier holding a
// KNOWN clean-cash band + an ARMED forfeiture, so the Building-Card money_holding surface (T9) reads:
//   - money_holding_tier_band = MEDIUM   (a Tier-2 vault — UPGRADE-MONEY-HOLDING-TIER once from the Tier-1 SMALL build
//                                default, so the Upgrade-holding-tier affordance is demonstrable + the band is above default),
//   - held_band              = MODERATE  (a DEPOSIT of $50k → the $10k–$100k MODERATE band; below the Tier-2 $5M cap → BUSY),
//   - capacity_band          = BUSY      (0 < held < the Tier-2 capacity → room remains; not FULL),
//   - yield_band             = EARNING   (held > 0 → the passive yield accrues),
//   - forfeiture_band        = PENDING   (an ARMED forfeiture with the deadline comfortably ahead — the telegraphed warning
//                                so the player can react; SQL-pinned forfeiture_scheduled_at_tick = clock + a far lead).
// A money_holding is GLASS-only (the SAME district restriction as the Ash specialized_lab — building_types.md §money_holding
// "Glass only"). RECIPE (REST where possible + SQL fast-forward, mirroring the cook/hub flow):
//   (a) acquire + convert a money_holding on a free GLASS block → fast-forward setup → operational (Tier-1 SMALL, held 0);
//   (b) UPGRADE-MONEY-HOLDING-TIER once (REST) → Tier-2 (money_holding_tier_band SMALL → MEDIUM; atomic cash debit);
//   (c) DEPOSIT-CASH $50k (REST) → held_band MODERATE / capacity_band BUSY / yield_band EARNING;
//   (d) SQL-ARM a forfeiture (forfeiture_scheduled_at_tick = clock + a far lead) → forfeiture_band PENDING (the audit
//       telegraph; the value-driven MONEY_HOLDING_AUDIT tick would schedule one organically only at the $20M threshold,
//       Tier-4+ territory — too expensive to reach in the demo, so we pin the scheduled tick directly, the SAME pattern
//       the hub demo uses to pin courier shifts in transit). The forfeiture is left PENDING (a far deadline) so the
//       telegraphed WARNING is demonstrable without the seizure firing on a later seeder advance.
// Idempotent: the targeted money_holding wipe in the reset above drops any prior vault + its money_holding row.
const MONEY_HOLDING_DEMO_TARGET_TIER = 2;        // Tier-2 → money_holding_tier_band MEDIUM (cap $5M; the canon curve by tier).
const MONEY_HOLDING_DEMO_DEPOSIT_CENTS = 5_000_000; // $50k → the $10k–$100k MODERATE held band (below the Tier-2 $5M cap → BUSY).
const MONEY_HOLDING_DEMO_FORFEITURE_LEAD_TICKS = 100_000; // a FAR-ahead deadline → forfeiture_band PENDING (not IMMINENT ≤ 2 ticks).

const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_KEYLEN = 32;
function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

/** Run SQL inside the pg container (tuples-only, unaligned, ON_ERROR_STOP) → the first result row trimmed. */
function psql(sql) {
  const out = execFileSync(
    'docker',
    [...COMPOSE, 'exec', '-T', 'pg', 'psql', '-U', PG_USER, '-d', PG_DB, '-v', 'ON_ERROR_STOP=1', '-tAc', sql],
    { encoding: 'utf-8' },
  );
  return out.trim().split('\n')[0].trim();
}

/** Sign in via the real auth endpoint → a Bearer token (the T14 City Map AuthClient recipe). */
async function signin() {
  const res = await fetch(`${BASE_URL}/v1/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  if (res.status !== 200) throw new Error(`signin failed: HTTP ${res.status} — ${await res.text()}`);
  const body = await res.json();
  const token = body.payload?.data?.access_token ?? body.access_token ?? body.payload?.access_token;
  if (!token) throw new Error(`signin returned no access_token: ${JSON.stringify(body)}`);
  return token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { _raw: text };
  }
  return { status: res.status, data: parsed.payload?.data ?? parsed };
}

/** One-tick nudge via the deterministic advance harness — lets the operational MINUTE/* ticks flip the fast-forwarded state. */
async function advance(playerId, ticks) {
  const res = await fetch(`${BASE_URL}/v1/_test/citysim/advance?ticks=${ticks}&player_id=${playerId}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (res.status !== 200) throw new Error(`advance failed: HTTP ${res.status} — ${await res.text()}`);
  const body = await res.json();
  return body.payload?.data ?? body;
}

function clockMinute(playerId) {
  const raw = psql(`SELECT game_minute FROM city_sim_clock WHERE player_id = '${playerId}';`);
  return raw ? Number(raw) : 0;
}

async function main() {
  // ─────────────────────────── 1. DISTINCT operational demo player (self-contained) ───────────────────────────
  let accountId = psql(`SELECT account_id FROM "player" WHERE email = '${EMAIL}';`);
  let playerId;
  if (accountId) {
    playerId = psql(`SELECT player_id FROM "player" WHERE account_id = '${accountId}';`);
    psql(`UPDATE "account_credential" SET password_hash = '${hashPassword(PASSWORD)}', updated_at = now() WHERE account_id = '${accountId}';`);
    console.log(`[op-seed] reusing operational demo account ${accountId} (player ${playerId})`);
  } else {
    accountId = psql(`INSERT INTO "account" ("kind","lifecycle_state") VALUES ('PLAYER','ACTIVE') RETURNING account_id;`);
    playerId = psql(`INSERT INTO "player" ("account_id","callsign","email","locale") VALUES ('${accountId}','${CALLSIGN}','${EMAIL}','en') RETURNING player_id;`);
    psql(`INSERT INTO "account_credential" ("account_id","password_hash") VALUES ('${accountId}','${hashPassword(PASSWORD)}');`);
    console.log(`[op-seed] created operational demo account ${accountId} (player ${playerId})`);
  }

  // Give this player's clock HEADROOM before the per-action fast-forwards. Each operational step
  // re-anchors a persisted tick column into the PAST (cook stage_started_at_tick=0, courier
  // started_at_tick=0, …) and nudges one tick so the MINUTE/* tick systems see a large elapsed and
  // COMPLETE the step. On a brand-new player the clock starts near 0, so "elapsed since tick 0" is
  // ~0 and the cook never completes (0 g). Advancing to a baseline minute first restores the headroom
  // this seeder relied on when it piggybacked on the (heavily-advanced) shared City Map player.
  const OP_CLOCK_BASELINE = 1500;
  const startMinute = clockMinute(playerId);
  if (startMinute < OP_CLOCK_BASELINE) {
    const ticks = OP_CLOCK_BASELINE - startMinute;
    console.log(`[op-seed] advancing clock ${startMinute} → ${OP_CLOCK_BASELINE} for fast-forward headroom (may take ~20s)…`);
    await advance(playerId, ticks);
  }

  // ─────────────────────────── 2. IDEMPOTENT reset of the prior operational state ───────────────────────────
  // Wipe ONLY this player's operational entities + the district-16 operational buildings (the City Map heat-gradient
  // buildings in districts 3/7/11 are left untouched). Order respects FKs (children before the building rows).
  console.log('[op-seed] resetting prior operational state (idempotent)…');
  const opBuildingsSubq = `SELECT building_id FROM buildings WHERE player_id='${playerId}' AND block_id IN (SELECT id FROM blocks WHERE district_id=${OP_DISTRICT})`;
  // Phase-2c (Ash): the player's appointment + batch-purity rows (player-scoped — safe to wipe wholesale; they belong
  // only to this operational demo player). Deleted FIRST (FK children of ash_appointment→buildings + batch_purity→
  // product_storage). The specialized_lab building lives in a GLASS district (NOT district 16), so it is wiped by its
  // own targeted clause below — the district-16 building wipe does not reach it.
  psql(`DELETE FROM ash_appointment WHERE player_id='${playerId}';`);
  psql(`DELETE FROM batch_purity WHERE player_id='${playerId}';`);
  // Phase-3 vector #3 (grow_house): the player's grow_session rows (player-scoped — safe to wipe wholesale; they belong
  // only to this operational demo player). Deleted explicitly (a grow_session FK-cascades on its grow_house building
  // delete below, but an explicit wipe is idempotent + order-safe regardless of which block the grow_house sat on).
  psql(`DELETE FROM grow_session WHERE player_id='${playerId}';`);
  // Phase-9 vector #9 (lieutenant rule-editor / COOK delegation): the player's lieutenant rows + their 1-1
  // behavior_script rows (player-scoped — safe to wipe wholesale; they belong only to this operational demo player). A
  // recruited COOK lieutenant holds an `assigned_building_id` FK onto a district-16 building (the lab), so the
  // district-16 building wipe below FAILS (FK violation) while a lieutenant still references it — the lieutenant rows
  // MUST be cleared FIRST. Order: capture the lieutenants' behavior_script_ids → delete the lieutenant rows (frees the
  // assigned/target-building FKs + the behavior_script FK) → delete the now-orphaned behavior_script rows. The Phase-9
  // demo/PlayMode recruits a fresh COOK each run, so this keeps the seeder idempotent (a prior run's lieutenant never
  // blocks the next reset). The deferred lieutenant child tables (cue_registry / task_exposure / autonomy_reports / …)
  // are not populated by this slice, so no extra wipe is needed; if a future vector populates them, add them here.
  const ltScriptIds = psql(
    `SELECT COALESCE(string_agg(quote_literal(behavior_script_id::text), ','), '') ` +
      `FROM lieutenant WHERE player_id='${playerId}' AND behavior_script_id IS NOT NULL;`,
  );
  psql(`DELETE FROM lieutenant WHERE player_id='${playerId}';`);
  if (ltScriptIds) {
    psql(`DELETE FROM behavior_script WHERE script_id IN (${ltScriptIds});`);
  }
  // Phase-20: the exception-queue + progression funnel demo state is REBUILT each run — wipe this player's rows
  // (player-scoped). ensureRow re-creates progression at tier 1 / taught [] on first read, and the handled count
  // is COUNT(resolved exception rows) → wiping both resets the funnel to LOCKED deterministically.
  psql(`DELETE FROM exception_queue WHERE player_id='${playerId}';`);
  psql(`DELETE FROM player_progression_state WHERE player_id='${playerId}';`);
  psql(`DELETE FROM courier_shift WHERE player_id='${playerId}';`);
  psql(`DELETE FROM courier WHERE player_id='${playerId}';`);
  psql(`DELETE FROM route WHERE player_id='${playerId}';`);
  psql(`DELETE FROM dealer WHERE player_id='${playerId}';`);
  psql(`DELETE FROM cook_session WHERE player_id='${playerId}';`);
  psql(`DELETE FROM precursor_order WHERE player_id='${playerId}';`);
  psql(`DELETE FROM precursor_stock WHERE player_id='${playerId}';`);
  psql(`DELETE FROM product_storage WHERE player_id='${playerId}';`);
  psql(`DELETE FROM tail_risk_estimates WHERE player_id='${playerId}';`);
  psql(`DELETE FROM laundering_edges WHERE player_id='${playerId}';`);
  psql(`DELETE FROM laundering_nodes WHERE player_id='${playerId}';`);
  psql(`DELETE FROM safehouses WHERE player_id='${playerId}';`);
  psql(`DELETE FROM deal_leks WHERE player_id='${playerId}';`);
  psql(`DELETE FROM building_operational_state WHERE building_id IN (${opBuildingsSubq});`);
  // ⛔ GARDE DE COURSE — le DELETE ci-dessous échoue par FK si un lieutenant référence encore un de
  // ces bâtiments. Les lieutenants du joueur sont supprimés PLUS HAUT et dans le bon ordre (voir le
  // commentaire du wipe lieutenant), donc un échec ici ne peut avoir que deux causes, et elles
  // demandent des correctifs opposés :
  //   (a) un lieutenant a été RECRÉÉ entre les deux DELETE — par le back, par un test PlayMode
  //       concurrent, par un second seeder. C'est une COURSE : le reset n'est pas atomique.
  //   (b) une autre FK que celle du lieutenant bloque. Il y en a 23 vers `buildings`, mesurées le
  //       2026-08-31 — et `lieutenant`, `route` et `supply_chain_legs` en portent DEUX chacune, ce
  //       qu'un balayage par nom de table rate.
  // Sans ce compte, le message de Postgres nomme UNE contrainte et laisse croire à un défaut
  // d'ordre — trois diagnostics successifs s'y sont trompés le 2026-08-31, et le correctif proposé
  // (détacher les lieutenants avant le wipe) était redondant avec du code existant : 0 assignation
  // croisée en base, 0 bâtiment sans état opérationnel. Le compte ci-dessous départage (a) de (b)
  // en une ligne, et il est DATÉ dans le log.
  const ltRestants = psql(`SELECT count(*) FROM lieutenant WHERE player_id='${playerId}';`);
  if (ltRestants !== '0') {
    throw new Error(
      `[seed] COURSE DÉTECTÉE : ${ltRestants} lieutenant(s) du joueur de démo existent ENCORE juste ` +
        `avant le wipe des bâtiments, alors qu'ils viennent d'être supprimés. Quelqu'un les a recréés ` +
        `entre les deux DELETE (back en cours d'exécution, test PlayMode concurrent, second seeder). ` +
        `Le reset n'est pas atomique : arrêtez l'écrivain concurrent avant de rejouer. ` +
        `⚠️ Ce n'est PAS un défaut d'ordre — l'ordre est correct et vérifié.`,
    );
  }
  psql(`DELETE FROM buildings WHERE player_id='${playerId}' AND block_id IN (SELECT id FROM blocks WHERE district_id=${OP_DISTRICT});`);
  // Phase-2c (Ash): the specialized_lab lives in a GLASS district (not district 16), so wipe any prior specialized_lab
  // this player owns directly. The "specialized_lab" marker is the operational TYPE (building_operational_state.
  // operational_type) — buildings.building_type is a numeric structural code, NOT the operational type. Capture the
  // specialized_lab building ids via their operational-state rows, then delete the operational-state rows + the
  // buildings. Idempotent: a re-run rebuilds it fresh in the Glass district below. (product_storage / cook_session /
  // precursor_* / batch_purity / ash_appointment were already wiped player-wide above.)
  const ashLabIds = psql(
    `SELECT COALESCE(string_agg(quote_literal(bos.building_id::text), ','), '') ` +
      `FROM building_operational_state bos JOIN buildings b ON b.building_id=bos.building_id ` +
      `WHERE b.player_id='${playerId}' AND bos.operational_type='specialized_lab';`,
  );
  if (ashLabIds) {
    psql(`DELETE FROM building_operational_state WHERE building_id IN (${ashLabIds});`);
    psql(`DELETE FROM buildings WHERE building_id IN (${ashLabIds});`);
  }
  // Phase-4 vector #4 (distribution_hub): the hub is buildable ONLY in a TIDEWATER/STACK district (NOT district 16), so
  // like the specialized_lab it is wiped by a TARGETED operational_type clause (the district-16 wipe never reaches it).
  // Its courier/route/courier_shift children were already wiped player-wide above; here we drop the hub building + its
  // operational-state row so a re-run rebuilds it fresh. Idempotent + order-safe.
  const hubIds = psql(
    `SELECT COALESCE(string_agg(quote_literal(bos.building_id::text), ','), '') ` +
      `FROM building_operational_state bos JOIN buildings b ON b.building_id=bos.building_id ` +
      `WHERE b.player_id='${playerId}' AND bos.operational_type='distribution_hub';`,
  );
  if (hubIds) {
    psql(`DELETE FROM building_operational_state WHERE building_id IN (${hubIds});`);
    psql(`DELETE FROM buildings WHERE building_id IN (${hubIds});`);
  }
  // Crick refinery: lives in a STACK district (canon building_types.md invariant 3 — the back now enforces it at
  // convert), so the district-16 wipe never reaches it either. Same targeted operational_type wipe as the hub/vault;
  // its precursor_stock/cook_session/product_storage children were already wiped player-wide above. Idempotent.
  const refineryIds = psql(
    `SELECT COALESCE(string_agg(quote_literal(bos.building_id::text), ','), '') ` +
      `FROM building_operational_state bos JOIN buildings b ON b.building_id=bos.building_id ` +
      `WHERE b.player_id='${playerId}' AND bos.operational_type='refinery';`,
  );
  if (refineryIds) {
    psql(`DELETE FROM building_operational_state WHERE building_id IN (${refineryIds});`);
    psql(`DELETE FROM buildings WHERE building_id IN (${refineryIds});`);
  }
  // Phase-5 vector #5a (money_holding): the vault is GLASS-only (NOT district 16 — like the specialized_lab), so it too is
  // wiped by a TARGETED operational_type clause (the district-16 wipe never reaches it). Its 1-1 money_holding row is an FK
  // child of buildings (ON DELETE CASCADE) but we wipe it explicitly FIRST for order-safety/idempotence, then drop the
  // building + its operational-state row so a re-run rebuilds the vault fresh (held 0, tier 1, no forfeiture armed).
  const moneyHoldingIds = psql(
    `SELECT COALESCE(string_agg(quote_literal(bos.building_id::text), ','), '') ` +
      `FROM building_operational_state bos JOIN buildings b ON b.building_id=bos.building_id ` +
      `WHERE b.player_id='${playerId}' AND bos.operational_type='money_holding';`,
  );
  if (moneyHoldingIds) {
    psql(`DELETE FROM money_holding WHERE building_id IN (${moneyHoldingIds});`);
    psql(`DELETE FROM building_operational_state WHERE building_id IN (${moneyHoldingIds});`);
    psql(`DELETE FROM buildings WHERE building_id IN (${moneyHoldingIds});`);
  }

  // Reset the wallet to a fixed generous balance (deterministic figures regardless of prior runs).
  psql(
    `INSERT INTO economy_states (player_id, cash_cents) VALUES ('${playerId}', ${WALLET_CENTS}) ` +
      `ON CONFLICT (player_id) DO UPDATE SET cash_cents = ${WALLET_CENTS};`,
  );

  // ─────────────────────────── 3. Sign in → Bearer ───────────────────────────
  const token = await signin();
  console.log('[op-seed] signed in (Bearer acquired)');

  // ─────────────────────────── 3b. Force SESSION-LESS structural mutations (D9) ───────────────────
  // MEASURED (2026-08-21, psql against the live dev stack): every structural mutation below
  // (BUILDING_ACQUISITION/BUILDING_CONVERT/LIEUTENANT_RECRUIT/…) is wrapped by
  // `StructuralDecisionGovernorService.commit` (services/game-back/src/progression/loop10/
  // structural-decision-governor.service.ts:88-92), which caps them at
  // `core_loops.one_decision_structural_per_session_cap` (default 1, core-loops-tunables.ts:428-431)
  // PER REAL `gameplay_sessions` ROW — but `enforcementGate = activeSession !== null || …` (:90):
  // the cap is enforced ONLY while the player has an ACTIVE session. A SESSION-LESS mutation still
  // succeeds AND is audited (`session_ref: null`) — this is the governor's own documented D9
  // "zero-regression" mode (real-estate.controller.ts:87-89's own comment names it), not a bypass.
  // This seeder commits ~15-20 structural decisions per run (9+ operational buildings ×
  // acquire+convert, + the lieutenant recruit, + the specialized_lab tier upgrade) — far beyond the
  // 1/session cap, so it MUST run session-less throughout.
  //
  // WHY THE RESET ABOVE (`DELETE FROM player_progression_state`) DOES NOT PREVENT THIS: that DELETE
  // wipes the COUNTER (`structural_decisions_this_session`) — a DIFFERENT table from
  // `gameplay_sessions`. The HUD lot (b37d93e) wired AppShell's DEFAULT identity to THIS SAME
  // account (Assets/Tests/PlayMode/HudPlayModeTests.cs:410) and calls the REAL
  // `signin → POST /v1/session/open` on boot (:157,:243,:463) — so any HudPlayModeTests run earlier
  // in the SAME PlayMode assembly leaves an ACTIVE `gameplay_sessions` row for this player.
  // `findActive`/`getActiveSession` (session.repository.ts:59-67) does not check staleness — a
  // session opened hours ago still counts as "active" — so the leftover row alone flips
  // `enforcementGate` ON regardless of the freshly-zeroed counter, and the 2nd structural call of
  // THIS run 409s STRUCTURAL_CAP_EXHAUSTED. MEASURED on this exact player (01a01f34-…-b75efa6e8023):
  // 3 `gameplay_sessions` rows, the newest (576bec77-…) opened 2026-08-21 08:44 UTC, `ended_at` NULL,
  // `structural_commits=23` accumulated across dozens of overnight seeder runs each getting exactly
  // 1 structural call through before hitting the wall.
  //
  // FIX: close the session via the REAL player-facing `POST /v1/session/close` (idempotent —
  // `{closed:false}` if none was active) — the SAME endpoint AppShell itself calls to end a play
  // session, not a `_test`-only shortcut and not a raw-SQL bypass of `SessionClosedEvent`. This
  // returns the player to the legitimate session-less mode BEFORE any structural call below.
  const closeResult = await api('POST', '/v1/session/close', token, {});
  if (closeResult.status !== 200) {
    throw new Error(`session/close failed: HTTP ${closeResult.status} — ${JSON.stringify(closeResult.data)}`);
  }
  console.log(`[op-seed] session closed (closed=${closeResult.data.closed}) — structural mutations now run session-less (D9, uncapped)`);

  // The Nth free block in district 16 (free for THIS player — distinct blocks for distinct buildings).
  function freeBlock(offset) {
    return Number(
      psql(
        `SELECT id FROM blocks WHERE district_id=${OP_DISTRICT} ` +
          `AND id NOT IN (SELECT block_id FROM buildings WHERE player_id='${playerId}' AND block_id IS NOT NULL) ` +
          `ORDER BY id LIMIT 1 OFFSET ${offset};`,
      ),
    );
  }

  // ─────────────────────────── 4. ACQUIRE + CONVERT + fast-forward to OPERATIONAL (5 buildings) ───────────────────────────
  // Buy + convert each of the 5 M1 types on a distinct free block, then SQL-set setup_remaining_ticks=1 and advance 1
  // (the MINUTE/6 conversion tick decrements to 0 → flips operational). weak cover keeps the demo cheap.
  async function operationalBuilding(blockId, opType) {
    const buy = await api('POST', '/v1/operational/building/purchase', token, { block_id: blockId, building_type_target: opType });
    if (buy.status !== 201) throw new Error(`purchase ${opType} failed: HTTP ${buy.status} — ${JSON.stringify(buy.data)}`);
    const buildingId = buy.data.building_id;
    const conv = await api('POST', `/v1/operational/building/${buildingId}/convert`, token, { operational_type: opType, cover_quality: 'weak' });
    if (conv.status !== 200) throw new Error(`convert ${opType} failed: HTTP ${conv.status} — ${JSON.stringify(conv.data)}`);
    return buildingId;
  }

  const lab = await operationalBuilding(freeBlock(0), 'lab');
  const stash = await operationalBuilding(freeBlock(1), 'stash');
  const dealerSpot = await operationalBuilding(freeBlock(2), 'dealer_spot_front');
  const frontShop = await operationalBuilding(freeBlock(3), 'front_shop');
  const safehouseBldg = await operationalBuilding(freeBlock(4), 'cash_safehouse');

  // Phase-2b MULTI-STAGE pipeline hosts: PIPELINE_DOWNSTREAM_STAGES extra OPERATIONAL buildings, each hosting ONE
  // downstream laundering stage (Stage 2/3/4). addStage accepts ANY player-owned operational building (the per-type
  // mid-tier specialization is deferred — uniform gain), and rejects a building that already hosts a node (409), so
  // each stage needs a distinct building. We reuse 'front_shop' as the operational_type (any operational type works);
  // they live on fresh free blocks (offset 5..) in district 16, so the reset's district-16 building wipe re-claims them.
  const stageHosts = [];
  for (let s = 0; s < PIPELINE_DOWNSTREAM_STAGES; s += 1) {
    stageHosts.push(await operationalBuilding(freeBlock(5 + s), 'front_shop'));
  }

  // Phase-2b vector #2 (Crick cold-chain): a REFINERY on a free STACK-district block — the back enforces canon
  // building_types.md invariant 3 (refinery converts only in a Stack district), so district 16 (verge) is invalid.
  // Out of district 16 it also stays clear of the raid at the end (which targets the lab's district-16 block).
  // Convert passes cold_storage_capable explicitly (a refinery is cold-by-nature regardless, but the flag is part
  // of the real convert contract). Reset-side, the targeted refinery wipe above re-claims it on re-run.
  const stackDistrict = Number(psql(`SELECT id FROM districts WHERE profile='stack' ORDER BY id LIMIT 1;`));
  const refineryBlock = Number(
    psql(
      `SELECT id FROM blocks WHERE district_id=${stackDistrict} ` +
        `AND id NOT IN (SELECT block_id FROM buildings WHERE player_id='${playerId}' AND block_id IS NOT NULL) ` +
        `ORDER BY id LIMIT 1 OFFSET 0;`,
    ),
  );
  const refineryBuy = await api('POST', '/v1/operational/building/purchase', token, { block_id: refineryBlock, building_type_target: 'refinery' });
  if (refineryBuy.status !== 201) throw new Error(`purchase refinery failed: HTTP ${refineryBuy.status} — ${JSON.stringify(refineryBuy.data)}`);
  const refinery = refineryBuy.data.building_id;
  const refineryConv = await api('POST', `/v1/operational/building/${refinery}/convert`, token, {
    operational_type: 'refinery',
    cover_quality: 'weak',
    cold_storage_capable: false,
  });
  if (refineryConv.status !== 200) throw new Error(`convert refinery failed: HTTP ${refineryConv.status} — ${JSON.stringify(refineryConv.data)}`);
  console.log(`[op-seed] ${5 + PIPELINE_DOWNSTREAM_STAGES + 1} buildings purchased + converted (gutting; incl. Crick refinery ${refinery})`);

  // Fast-forward ALL setups to operational in ONE 1-tick nudge.
  psql(
    `UPDATE building_operational_state SET setup_remaining_ticks=1 ` +
      `WHERE player_id='${playerId}' AND conversion_stage <> 'operational';`,
  );
  await advance(playerId, 1);
  const opCount = psql(`SELECT count(*) FROM building_operational_state WHERE player_id='${playerId}' AND conversion_stage='operational';`);
  console.log(`[op-seed] setups fast-forwarded → ${opCount} buildings operational`);

  // ─────────────────────────── 5. PRECURSORS — order Pyralin, fast-forward arrival ───────────────────────────
  const ord = await api('POST', '/v1/operational/precursors/order', token, {
    building_id: lab,
    precursor_type: 'PYRALIN',
    quantity_units: PYRALIN_UNITS_PER_BATCH,
  });
  if (ord.status !== 201) throw new Error(`order failed: HTTP ${ord.status} — ${JSON.stringify(ord.data)}`);
  const orderId = ord.data.order_id;
  // Re-anchor arrives_at_tick to the next tick (clock+1) → the MINUTE/7 arrival tick delivers it on the nudge.
  psql(`UPDATE precursor_order SET arrives_at_tick=${clockMinute(playerId) + 1} WHERE order_id='${orderId}';`);
  await advance(playerId, 1);
  const pyralinStock = psql(`SELECT COALESCE(SUM(quantity_units),0) FROM precursor_stock WHERE player_id='${playerId}' AND building_id='${lab}' AND precursor_type='pyralin';`);
  console.log(`[op-seed] Pyralin order delivered → ${pyralinStock} units in the lab`);

  // D1 C4: a brindle cook fail-fasts unless ALL 3 precursors are in the building — Thalmite (Stage 2) and
  // Garnet salt (Stage 3) on top of the primary Pyralin (production.service.ts upfront validation). Order both
  // through the same real route + arrival fast-forward as the Pyralin above (2 units each = the per-batch tunable
  // defaults production.brindle.{thalmite,garnet_salt}_units_per_batch).
  for (const secondary of ['THALMITE', 'GARNET_SALT']) {
    const sOrd = await api('POST', '/v1/operational/precursors/order', token, {
      building_id: lab,
      precursor_type: secondary,
      quantity_units: 2,
    });
    if (sOrd.status !== 201) throw new Error(`${secondary} order failed: HTTP ${sOrd.status} — ${JSON.stringify(sOrd.data)}`);
    psql(`UPDATE precursor_order SET arrives_at_tick=${clockMinute(playerId) + 1} WHERE order_id='${sOrd.data.order_id}';`);
    await advance(playerId, 1);
  }
  const secondaryStock = psql(`SELECT COALESCE(SUM(quantity_units),0) FROM precursor_stock WHERE player_id='${playerId}' AND building_id='${lab}' AND precursor_type IN ('thalmite','garnet_salt');`);
  console.log(`[op-seed] secondary precursors delivered → ${secondaryStock} units (thalmite+garnet_salt) in the lab`);

  // ─────────────────────────── 6. COOK — start a Brindle cook, fast-forward completion → 200 g in the lab ───────────────────────────
  const cook = await api('POST', `/v1/operational/lab/${lab}/cook`, token, {});
  if (cook.status !== 201) throw new Error(`cook failed: HTTP ${cook.status} — ${JSON.stringify(cook.data)}`);
  const cookId = cook.data.cook_session_id;
  // Jump the session to the final stage with an elapsed clock → the MINUTE/8 cook-advance tick COMPLETES it on the nudge
  // (yields the flat Tier-1 200 g into the lab product_storage + a MICRO cook-heat injection on the lab).
  psql(`UPDATE cook_session SET current_stage='stage_4', stage_started_at_tick=0 WHERE cook_session_id='${cookId}';`);
  await advance(playerId, 1);
  const labGrams = psql(`SELECT COALESCE(SUM(quantity_grams),0) FROM product_storage WHERE player_id='${playerId}' AND building_id='${lab}' AND substance_type='brindle';`);
  console.log(`[op-seed] cook completed → ${labGrams} g Brindle in the lab`);

  // ─────────────────────── 6b. CRICK COLD CHAIN — order verdant_root_extract + refine → 200 g Crick in the refinery ───────────────────────
  // Mirror the Brindle cook flow on the REFINERY (Crick's host building) with Crick's single precursor + a Crick-tagged
  // single-stage cook. Crick is COLD-BY-NATURE in a refinery → the storage projection reads OPTIMAL_COLD, degrading=false.
  // (a) order verdant_root_extract, fast-forward the arrival (MINUTE/7), then (b) start a `crick` cook and fast-forward
  // its single stage to completion (MINUTE/8) → 200 g Crick in the refinery product_storage (MEDIUM band).
  const crickOrder = await api('POST', '/v1/operational/precursors/order', token, {
    building_id: refinery,
    precursor_type: 'VERDANT_ROOT_EXTRACT',
    quantity_units: CRICK_PRECURSOR_UNITS,
  });
  if (crickOrder.status !== 201) throw new Error(`crick precursor order failed: HTTP ${crickOrder.status} — ${JSON.stringify(crickOrder.data)}`);
  psql(`UPDATE precursor_order SET arrives_at_tick=${clockMinute(playerId) + 1} WHERE order_id='${crickOrder.data.order_id}';`);
  await advance(playerId, 1);
  const verdantStock = psql(`SELECT COALESCE(SUM(quantity_units),0) FROM precursor_stock WHERE player_id='${playerId}' AND building_id='${refinery}';`);
  console.log(`[op-seed] verdant_root_extract order delivered → ${verdantStock} units in the refinery`);

  // The cook endpoint is /lab/:id/cook even for a refinery; `substance:'crick'` selects the Crick recipe (omitting it
  // defaults to brindle). Crick is a single-stage cook → current_stage='stage_1' is the only/final stage. The cook_session
  // building column is `lab_building_id`. Re-anchor stage_started_at_tick into the deep past → the MINUTE/8 tick completes it.
  const crickCook = await api('POST', `/v1/operational/lab/${refinery}/cook`, token, { substance: 'crick' });
  if (crickCook.status !== 201) throw new Error(`crick cook failed: HTTP ${crickCook.status} — ${JSON.stringify(crickCook.data)}`);
  psql(`UPDATE cook_session SET current_stage='stage_1', stage_started_at_tick=0 WHERE cook_session_id='${crickCook.data.cook_session_id}';`);
  await advance(playerId, 1);
  const crickGrams = psql(`SELECT COALESCE(SUM(quantity_grams),0) FROM product_storage WHERE player_id='${playerId}' AND building_id='${refinery}' AND substance_type='crick';`);
  console.log(`[op-seed] crick refine completed → ${crickGrams} g Crick in the refinery (cold-by-nature → OPTIMAL_COLD)`);

  // ─────────────────────── 6c. ASH LUXURY CHANNEL — specialized_lab @ Tier-2 + CRYSTALLINE batch + booked appointment ──────────
  // Stand up the Ash surface the Building-Card luxury UI (T12) reads: a specialized_lab in a GLASS district holding 200 g
  // Ash at purity_band=CRYSTALLINE + lab_tier_band=REFINED + a SCHEDULED appointment at that (Glass) venue. Mirrors the
  // Brindle/Crick cook flow but on a `specialized_lab`, with Ash's precursor (glass_lily) + a 3-stage refining-pass cook +
  // the lab_tier lever (upgrade-tier) + the appointment book. The specialized_lab is placed in a GLASS-profile district so
  // the SAME building is a valid appointment venue (book validates owned + Glass district) and the cooked Ash physically
  // sits there. Ash is the LUXURY channel — no lek/dealer selling; the sale path is book→honor (honor is exercised in the
  // focused E2E, not pre-honored here, so the SCHEDULED state + the Honor affordance are demonstrable in the UI).
  //
  //   (a) acquire + convert a specialized_lab on a free GLASS-district block → fast-forward setup → operational (Tier-1);
  //   (b) UPGRADE-TIER once (REST) → Tier-2 (lab_tier_band BASIC → REFINED);
  //   (c) order glass_lily (REST) → fast-forward arrival (MINUTE/7);
  //   (d) start an `ash` cook with refining_passes=2 (REST), then fast-forward its 3rd (last) stage to completion
  //       (MINUTE/8) → 200 g Ash + the purity stamp (Tier-2 base 55 + 2×10 = score 75 → CRYSTALLINE batch_purity);
  //   (e) BOOK an appointment at this (Glass) venue (REST) → SCHEDULED.
  // The 3-stage Ash cook has a long per-stage duration (3000 ticks), so the completion fast-forward re-anchors
  // stage_started_at_tick into the DEEP past (-100000) and advances enough ticks (8) to land on a MINUTE/8 boundary
  // (matching the contract-capture recipe; a single +1 tick can miss the cadence boundary and leave the cook mid-stage).
  const glassDistrict = Number(psql(`SELECT id FROM districts WHERE profile='glass' ORDER BY id LIMIT 1;`));
  // The Nth free block in the GLASS district for this player (distinct from the district-16 operational blocks).
  function freeGlassBlock(offset) {
    return Number(
      psql(
        `SELECT id FROM blocks WHERE district_id=${glassDistrict} ` +
          `AND id NOT IN (SELECT block_id FROM buildings WHERE player_id='${playerId}' AND block_id IS NOT NULL) ` +
          `ORDER BY id LIMIT 1 OFFSET ${offset};`,
      ),
    );
  }
  const ashLab = await operationalBuilding(freeGlassBlock(0), 'specialized_lab');
  // The convert above leaves the lab IN_SETUP; fast-forward its setup to operational (the lab build defaults lab_tier=1).
  psql(`UPDATE building_operational_state SET setup_remaining_ticks=1 WHERE building_id='${ashLab}' AND conversion_stage <> 'operational';`);
  await advance(playerId, 1);
  // (b) UPGRADE-TIER once → Tier-2 (lab_tier_band REFINED). Atomic cash debit server-side; raw cents never surface.
  const upgrade = await api('POST', `/v1/operational/building/${ashLab}/upgrade-tier`, token, {});
  if (upgrade.status !== 200) throw new Error(`ash upgrade-tier failed: HTTP ${upgrade.status} — ${JSON.stringify(upgrade.data)}`);
  const ashLabTier = psql(`SELECT lab_tier FROM building_operational_state WHERE building_id='${ashLab}';`);
  console.log(`[op-seed] specialized_lab built + upgraded → lab_tier=${ashLabTier} (REFINED band) in glass district ${glassDistrict}`);
  // (c) order glass_lily → fast-forward arrival.
  const ashOrder = await api('POST', '/v1/operational/precursors/order', token, {
    building_id: ashLab,
    precursor_type: 'GLASS_LILY',
    quantity_units: ASH_PRECURSOR_UNITS,
  });
  if (ashOrder.status !== 201) throw new Error(`ash precursor order failed: HTTP ${ashOrder.status} — ${JSON.stringify(ashOrder.data)}`);
  psql(`UPDATE precursor_order SET arrives_at_tick=${clockMinute(playerId) + 1} WHERE order_id='${ashOrder.data.order_id}';`);
  await advance(playerId, 1);
  const glassLilyStock = psql(`SELECT COALESCE(SUM(quantity_units),0) FROM precursor_stock WHERE player_id='${playerId}' AND building_id='${ashLab}';`);
  console.log(`[op-seed] glass_lily order delivered → ${glassLilyStock} units in the specialized_lab`);
  // (d) start an `ash` cook with refining_passes=2, then fast-forward its 3rd (last) functional stage to completion.
  const ashCook = await api('POST', `/v1/operational/lab/${ashLab}/cook`, token, { substance: 'ash', refining_passes: ASH_REFINING_PASSES });
  if (ashCook.status !== 201) throw new Error(`ash cook failed: HTTP ${ashCook.status} — ${JSON.stringify(ashCook.data)}`);
  // Ash (count=3) completes after stage_3; re-anchor to stage_3 with a deep-past stage clock so elapsed >> 3000 → the
  // MINUTE/8 cook-advance completes it on the next boundary tick (yields 200 g Ash + stamps batch_purity score 75).
  psql(`UPDATE cook_session SET current_stage='stage_3', stage_started_at_tick=-100000 WHERE cook_session_id='${ashCook.data.cook_session_id}';`);
  await advance(playerId, 8);
  const ashGrams = psql(`SELECT COALESCE(SUM(quantity_grams),0) FROM product_storage WHERE player_id='${playerId}' AND building_id='${ashLab}' AND substance_type='ash';`);
  const ashPurityScore = psql(
    `SELECT COALESCE((SELECT bp.purity_score FROM batch_purity bp JOIN product_storage ps ON ps.storage_id=bp.storage_id ` +
      `WHERE ps.building_id='${ashLab}' AND ps.player_id='${playerId}' AND ps.substance_type='ash' LIMIT 1),-1);`,
  );
  console.log(`[op-seed] ash cook completed → ${ashGrams} g Ash, purity_score=${ashPurityScore} (target ${ASH_TARGET_PURITY_SCORE} → CRYSTALLINE band)`);
  // (e) BOOK an appointment at this (Glass) venue → SCHEDULED. The Ash physically sits at the lab (its own storage), and
  // the lab is in a Glass district → it is a valid venue. The appointment is left SCHEDULED (not honored) for the demo.
  const ashAppt = await api('POST', '/v1/operational/appointment', token, { glass_venue_building_id: ashLab });
  if (ashAppt.status !== 201) throw new Error(`ash appointment book failed: HTTP ${ashAppt.status} — ${JSON.stringify(ashAppt.data)}`);
  const ashAppointmentId = ashAppt.data.appointment_id;
  const ashApptStatus = psql(`SELECT status FROM ash_appointment WHERE id='${ashAppointmentId}';`);
  console.log(`[op-seed] ash appointment booked → ${ashAppointmentId} (status=${ashApptStatus}; SCHEDULED) at glass venue ${ashLab}`);

  // ─────────────────────── 6d. GROW HOUSE (Phase-3 vector #3) — a grow_house mid-grow at a known husbandry band ──────────
  // Stand up the surface the Building-Card grow UI (T10) reads: a grow_house in a VERGE district (district 16 — a grow_house
  // is buildable ONLY in Spine/Verge) holding an ACTIVE grow_session at a KNOWN qualitative state:
  //   - grow_stage_band = MID    (the grow advanced one stage past plant — stage_2 → MID),
  //   - husbandry_band  = ON_TRACK (tend_count = 2 → the STANDARD yield tier → ON_TRACK trajectory band),
  //   - tend_due        = true   (the CURRENT (MID) stage is un-tended → the Tend button is enabled + demonstrable),
  //   - the building's raid_risk climbs above LOW (an active grow makes the grow_house HOT → GROW_HEAT → ELEVATED band).
  // RECIPE (REST where possible + SQL fast-forward for the grow cycle, mirroring the cook/courier fast-forward):
  //   (a) acquire + convert a grow_house on a free district-16 (Verge) block → fast-forward setup → operational;
  //   (b) PLANT verdant_root_extract (REST) → a stage_1 grow_session (cheap seed cost debit);
  //   (c) SQL-fast-forward the stage clock into the deep past + advance 1 → the GROW_ADVANCE tick (MINUTE/18) advances
  //       stage_1 → stage_2 (EARLY → MID) AND emits GROW_HEAT (an active grow is hot → raid_risk climbs);
  //   (d) SQL-set tend_count=2, tended_in_stage=NULL → husbandry_band=ON_TRACK + tend_due=true on the fresh MID stage
  //       (the projection derives the band from tend_count via the SAME GrowYieldService cut-points the harvest uses).
  // Idempotent: the reset above deletes this player's grow_session rows (FK-cascade on the district-16 building wipe) +
  // the district-16 buildings, so a re-run rebuilds the grow_house + a fresh grow.
  const GROW_STAGE_DURATION_TICKS = 1800; // grow.stage_duration_ticks default (the GROW_ADVANCE per-stage clock).
  const growHouse = await operationalBuilding(freeBlock(6 + PIPELINE_DOWNSTREAM_STAGES), 'grow_house');
  psql(`UPDATE building_operational_state SET setup_remaining_ticks=1 WHERE building_id='${growHouse}' AND conversion_stage <> 'operational';`);
  await advance(playerId, 1);
  // (b) PLANT verdant_root_extract → stage_1 grow_session.
  const plant = await api('POST', `/v1/operational/grow-house/${growHouse}/plant`, token, { precursor_type: 'verdant_root_extract' });
  if (plant.status !== 201) throw new Error(`grow plant failed: HTTP ${plant.status} — ${JSON.stringify(plant.data)}`);
  const growSessionId = plant.data.grow_session_id;
  // (c) advance one grow stage: re-anchor the stage clock into the DEEP past so (stage_started + stage_duration <= clock)
  // holds regardless of the absolute clock, then advance 1 → GROW_ADVANCE (MINUTE/18) flips stage_1 → stage_2 (MID) +
  // clears tended_in_stage + emits GROW_HEAT (the grow_house turns HOT → its raid_risk band climbs above LOW).
  psql(`UPDATE grow_session SET stage_started_at_tick=${clockMinute(playerId) - GROW_STAGE_DURATION_TICKS - 1} WHERE grow_session_id='${growSessionId}';`);
  await advance(playerId, 1);
  // (d) set the husbandry trajectory to ON_TRACK (tend_count=2 → STANDARD tier) on a FRESH (un-tended) MID stage so the
  // Tend button is enabled (tend_due=true). The raw tend_count is BO-only (R2.2) — the projection bands it to ON_TRACK.
  psql(`UPDATE grow_session SET tend_count=2, tended_in_stage=NULL WHERE grow_session_id='${growSessionId}';`);
  const growState = psql(`SELECT current_stage::text || '|' || tend_count || '|' || COALESCE(tended_in_stage::text,'-') FROM grow_session WHERE grow_session_id='${growSessionId}';`);
  console.log(`[op-seed] grow_house ${growHouse} planted + advanced → grow_session=${growSessionId} (${growState}; MID / ON_TRACK / tend_due)`);

  // ─────────────────────── 6e. DISTRIBUTION HUB (Phase-4 vector #4) — a Tier-2 hub + in-transit shipments ──────────
  // Stand up the surface the Building-Card hub UI (T9) reads: a distribution_hub in a TIDEWATER district (the GDD-canon
  // hub district — buildable ONLY in tidewater/stack) at a KNOWN qualitative state:
  //   - hub_tier_band     = MEDIUM   (a Tier-2 hub — UPGRADE-HUB-TIER once from the Tier-1 SMALL build default, so the
  //                          Upgrade-hub-tier affordance is demonstrable + the band is above the default),
  //   - roster_band       = BUSY     (HUB_DEMO_IN_TRANSIT shipments in transit, below the Tier-2 cap 11 → BUSY),
  //   - available_vehicles = [FOOT, BIKE, CAR] (an operational hub unlocks bike/car — the vehicle selector).
  // RECIPE (REST where possible + SQL fast-forward, mirroring the cook/courier flow):
  //   (a) acquire + convert a distribution_hub on a free TIDEWATER block → fast-forward setup → operational (Tier-1 SMALL);
  //   (b) UPGRADE-HUB-TIER once (REST) → Tier-2 (hub_tier_band SMALL → MEDIUM; atomic cash debit, raw cents never surface);
  //   (c) dispatch HUB_DEMO_IN_TRANSIT shipments FROM the Crick refinery (it holds 200 g) with a vehicle the hub unlocks
  //       (bike), then PIN started_at_tick into the FUTURE so the COURIER_TRANSIT tick never arrives them through the
  //       later seeder advances → a STABLE in-transit roster (roster_band BUSY at rest).
  // Idempotent: the targeted distribution_hub wipe in the reset above drops any prior hub + its courier/shift children,
  // so a re-run rebuilds the hub + fresh in-transit shipments.
  const hubDistrict = Number(psql(`SELECT id FROM districts WHERE profile IN ('tidewater','stack') ORDER BY id LIMIT 1;`));
  // The Nth free block in the hub (tidewater/stack) district for this player.
  function freeHubBlock(offset) {
    return Number(
      psql(
        `SELECT id FROM blocks WHERE district_id=${hubDistrict} ` +
          `AND id NOT IN (SELECT block_id FROM buildings WHERE player_id='${playerId}' AND block_id IS NOT NULL) ` +
          `ORDER BY id LIMIT 1 OFFSET ${offset};`,
      ),
    );
  }
  const distributionHub = await operationalBuilding(freeHubBlock(0), 'distribution_hub');
  // The convert above leaves the hub IN_SETUP; fast-forward its setup to operational (the build defaults hub_tier=1).
  psql(`UPDATE building_operational_state SET setup_remaining_ticks=1 WHERE building_id='${distributionHub}' AND conversion_stage <> 'operational';`);
  await advance(playerId, 1);
  // (b) UPGRADE-HUB-TIER once → Tier-2 (hub_tier_band MEDIUM). Atomic cash debit server-side; raw cents never surface.
  for (let t = 1; t < HUB_DEMO_TARGET_TIER; t += 1) {
    const hubUpgrade = await api('POST', `/v1/operational/building/${distributionHub}/upgrade-hub-tier`, token, {});
    if (hubUpgrade.status !== 200) throw new Error(`hub upgrade-hub-tier failed: HTTP ${hubUpgrade.status} — ${JSON.stringify(hubUpgrade.data)}`);
  }
  const hubTier = psql(`SELECT hub_tier FROM building_operational_state WHERE building_id='${distributionHub}';`);
  console.log(`[op-seed] distribution_hub built + upgraded → hub_tier=${hubTier} (MEDIUM band) in ${psql(`SELECT profile FROM districts WHERE id=${hubDistrict};`)} district ${hubDistrict}`);
  // (c) dispatch HUB_DEMO_IN_TRANSIT shipments FROM the Crick refinery (200 g) with bike (a hub-unlocked vehicle), then
  // PIN them in-transit (future started_at_tick) so they never arrive through the later advances → stable BUSY roster.
  // The destinations are the dealer-spot + cash-safehouse (distinct operational buildings; a courier route needs from≠to).
  const hubDispatchDests = [dealerSpot, safehouseBldg];
  const hubCourierIds = [];
  for (let s = 0; s < HUB_DEMO_IN_TRANSIT; s += 1) {
    const hubDispatch = await api('POST', '/v1/operational/distribution/dispatch', token, {
      from_building_id: refinery,
      to_building_id: hubDispatchDests[s % hubDispatchDests.length],
      cargo_grams: HUB_DEMO_CARGO_GRAMS,
      vehicle_type: 'bike',
    });
    if (hubDispatch.status !== 201) throw new Error(`hub demo dispatch #${s + 1} failed: HTTP ${hubDispatch.status} — ${JSON.stringify(hubDispatch.data)}`);
    hubCourierIds.push(hubDispatch.data.courier_id);
  }
  // Pin every demo shift's started_at_tick FAR into the future so (gameMinute − started_at_tick) stays negative → the
  // COURIER_TRANSIT tick (MINUTE/9) never arrives them, regardless of how many ticks the later seeder steps advance.
  // This keeps the roster genuinely BUSY at rest (the courier stays in_transit, the shift status='in_transit').
  if (hubCourierIds.length > 0) {
    const idList = hubCourierIds.map((id) => `'${id}'`).join(',');
    psql(`UPDATE courier_shift SET started_at_tick=${clockMinute(playerId) + 1_000_000} WHERE courier_id IN (${idList});`);
  }
  const hubInTransit = psql(`SELECT count(*) FROM courier_shift cs JOIN courier c ON c.courier_id=cs.courier_id WHERE c.player_id='${playerId}' AND cs.status='in_transit';`);
  console.log(`[op-seed] distribution_hub ${distributionHub} dispatched ${hubCourierIds.length} bike shipments → ${hubInTransit} in transit (BUSY roster band)`);

  // ─────────────────────── 6f. MONEY HOLDING (Phase-5 vector #5a) — a Tier-2 vault, MODERATE held, PENDING forfeiture ──────────
  // Stand up the surface the Building-Card money_holding UI (T9) reads: a money_holding in a GLASS district (the SAME
  // "Glass only" restriction as the Ash specialized_lab) at a KNOWN qualitative state:
  //   - money_holding_tier_band = MEDIUM   (Tier-2 — UPGRADE-MONEY-HOLDING-TIER once from the Tier-1 SMALL default),
  //   - held_band               = MODERATE ($50k deposit → the $10k–$100k band; below the Tier-2 $5M cap),
  //   - capacity_band           = BUSY     (0 < held < cap → room remains),
  //   - yield_band              = EARNING  (held > 0 → the passive yield accrues),
  //   - forfeiture_band         = PENDING  (an ARMED forfeiture with a far-ahead deadline — the telegraphed audit warning).
  // RECIPE (REST where possible + SQL fast-forward, mirroring the cook/hub flow):
  //   (a) acquire + convert a money_holding on a free GLASS block → fast-forward setup → operational (Tier-1 SMALL, held 0);
  //   (b) UPGRADE-MONEY-HOLDING-TIER once (REST) → Tier-2 (atomic cash debit; the player surface is the band, raw cents never surface);
  //   (c) DEPOSIT-CASH $50k (REST) → held MODERATE / capacity BUSY / yield EARNING (server-authoritative capacity guard);
  //   (d) SQL-PIN forfeiture_scheduled_at_tick = clock + a far lead → forfeiture_band PENDING (the audit telegraph; the
  //       organic $20M threshold is too expensive to reach in the demo, so we pin the scheduled tick — the SAME pattern
  //       §6e uses to pin courier shifts in transit). Left PENDING (far deadline) so the warning is demonstrable without
  //       the seizure firing on a later seeder advance.
  // Idempotent: the targeted money_holding wipe in the reset above drops any prior vault + its money_holding row.
  const moneyHolding = await operationalBuilding(freeGlassBlock(7), 'money_holding'); // a fresh GLASS block (past the Ash lab's offset 0).
  // The convert above leaves the vault IN_SETUP; fast-forward its setup to operational (the build defaults money_holding_tier=1, held=0).
  psql(`UPDATE building_operational_state SET setup_remaining_ticks=1 WHERE building_id='${moneyHolding}' AND conversion_stage <> 'operational';`);
  await advance(playerId, 1);
  // (b) UPGRADE-MONEY-HOLDING-TIER → Tier-2 (money_holding_tier_band MEDIUM). Atomic cash debit; raw cents never surface.
  for (let t = 1; t < MONEY_HOLDING_DEMO_TARGET_TIER; t += 1) {
    const mhUpgrade = await api('POST', `/v1/operational/building/${moneyHolding}/upgrade-money-holding-tier`, token, {});
    if (mhUpgrade.status !== 200) throw new Error(`money_holding upgrade-money-holding-tier failed: HTTP ${mhUpgrade.status} — ${JSON.stringify(mhUpgrade.data)}`);
  }
  // (c) DEPOSIT-CASH $50k → held MODERATE / capacity BUSY / yield EARNING. Server-authoritative (the capacity guard 409s
  // if the deposit would exceed the tier cap — it won't here: $50k << the Tier-2 $5M cap).
  const mhDeposit = await api('POST', `/v1/operational/building/${moneyHolding}/deposit-cash`, token, { amount_cents: MONEY_HOLDING_DEMO_DEPOSIT_CENTS });
  if (mhDeposit.status !== 200) throw new Error(`money_holding deposit-cash failed: HTTP ${mhDeposit.status} — ${JSON.stringify(mhDeposit.data)}`);
  // (d) the forfeiture is ARMED in §13c (the genuinely-LAST mutation, after all the later advances). RATIONALE: the
  // MONEY_HOLDING_AUDIT tick (MINUTE/19) CANCELS an armed forfeiture whenever effectiveHeld < the $20M threshold — and our
  // demo hold ($50k) is far below it — so any advance() AFTER the pin would wipe it. The later §7–§13 advances (courier
  // transit, dealer sell, launder, raid) all fire MINUTE/19, so the pin MUST come last. (The SAME constraint §10b/§13b
  // call out for the DIRTY laundering node.) §6f does the build/upgrade/deposit (no-advance-sensitive); §13c arms the pin.
  const mhBuilt = psql(
    `SELECT money_holding_tier || '|' || held_cents FROM money_holding WHERE building_id='${moneyHolding}';`,
  );
  console.log(`[op-seed] money_holding ${moneyHolding} built + upgraded + deposited → (tier|held_cents=${mhBuilt}; MEDIUM / MODERATE / BUSY / EARNING — forfeiture armed in §13c)`);

  // ─────────────────────────── 7. DISTRIBUTE — courier lab → dealer-spot, fast-forward transit ───────────────────────────
  // Ferry part of the cook (120 g) to the dealer-spot (the sell source); the rest stays in the lab (richer storage demo).
  const dispatch = await api('POST', '/v1/operational/distribution/dispatch', token, {
    from_building_id: lab,
    to_building_id: dealerSpot,
    cargo_grams: COURIER_CARGO_GRAMS,
  });
  if (dispatch.status !== 201) throw new Error(`dispatch failed: HTTP ${dispatch.status} — ${JSON.stringify(dispatch.data)}`);
  const courierId = dispatch.data.courier_id;
  // Re-anchor started_at_tick into the past → the MINUTE/9 transit tick ARRIVES the shift on the nudge (cargo lands).
  psql(`UPDATE courier_shift SET started_at_tick=0 WHERE courier_id='${courierId}';`);
  await advance(playerId, 1);
  const dealerSpotGrams = psql(`SELECT COALESCE(SUM(quantity_grams),0) FROM product_storage WHERE player_id='${playerId}' AND building_id='${dealerSpot}' AND substance_type='brindle';`);
  const courierState = psql(`SELECT current_state FROM courier WHERE courier_id='${courierId}';`);
  console.log(`[op-seed] courier delivered → ${dealerSpotGrams} g at the dealer-spot (courier ${courierState})`);

  // ─────────────────────────── 8. SELL — lek + assign dealer + advance sell ticks → accrued float ───────────────────────────
  // Seed a present lek at the dealer-spot tile (System 11), assign a WORKING dealer, then advance SELL_TICKS DEALER_SELL
  // ticks so the dealer accrues a real float (each tick sells 5 g × 2500 cents).
  const lekTile = Number(psql(`SELECT block_id FROM buildings WHERE building_id='${dealerSpot}';`));
  psql(
    `INSERT INTO deal_leks (player_id, tile_id, lek_score, controller_org_id, deals_this_week, contest_pressure) ` +
      `VALUES ('${playerId}', ${lekTile}, 60, 0, 0, 0) ` +
      `ON CONFLICT (player_id, tile_id) DO UPDATE SET lek_score=EXCLUDED.lek_score;`,
  );
  const assign = await api('POST', '/v1/operational/dealer/assign', token, { dealer_spot_id: dealerSpot, lek_tile_id: lekTile });
  if (assign.status !== 201) throw new Error(`assign failed: HTTP ${assign.status} — ${JSON.stringify(assign.data)}`);
  const dealerId = assign.data.dealer_id;
  await advance(playerId, SELL_TICKS); // real DEALER_SELL ticks (cheap — no fast-forward needed; the rate is per-tick).
  // The dealer also sells on the laundering advance ticks below (it stays WORKING with product). To keep the COLLECTED
  // amount deterministic (an on-boundary inject), pin the float to the intended SELL_TICKS amount before the collect.
  const collectFloat = SELL_TICKS * DEAL_UNIT_CENTS; // 75000 cents.
  psql(`UPDATE dealer SET float_cents=${collectFloat} WHERE dealer_id='${dealerId}';`);
  console.log(`[op-seed] dealer sold ${SELL_TICKS} ticks → float ${collectFloat} cents (pinned for an on-boundary collect)`);

  // ─────────────────────────── 9. COLLECT — runner ferries the float into the cash-safehouse ───────────────────────────
  // Seed an EMPTY player-owned safehouse on the cash-safehouse building (the System-9 runner-deposit target), then
  // collect the WHOLE float into it (on a whole-percent boundary → exact round-trip).
  const safehouseId = psql(
    `INSERT INTO safehouses (player_id, building_id, slot_count, slot_capacity_cents, current_fill, arrival_rate, raid_drain_policy) ` +
      `VALUES ('${playerId}', '${safehouseBldg}', ${SAFEHOUSE_SLOT_COUNT}, ${SAFEHOUSE_SLOT_CAPACITY_CENTS}, '[]'::jsonb, 0, 'top_down') RETURNING safehouse_id;`,
  );
  const col = await api('POST', `/v1/operational/dealer/${dealerId}/collect`, token, { safehouse_id: safehouseId });
  if (col.status !== 200) throw new Error(`collect failed: HTTP ${col.status} — ${JSON.stringify(col.data)}`);
  const shCents = psql(
    `SELECT COALESCE((SELECT SUM(round((v::numeric/100)*sh.slot_capacity_cents))::int FROM jsonb_array_elements_text(sh.current_fill) v),0) ` +
      `FROM safehouses sh WHERE safehouse_id='${safehouseId}';`,
  );
  console.log(`[op-seed] runner collected → safehouse holds ~${shCents} cents`);

  // ─────────────────────────── 10. LAUNDER — inject + clean (some to the wallet) + leave a node mid-pipeline ───────────────────────────
  // (a) Inject part of the safehouse cash → advance → System 8 cleans the idle node, LAUNDER_OUTPUT releases the cleaned
  //     cash to the wallet (= "some cleaned"). nodeId is created on this first inject.
  const walletBeforeLaunder = Number(psql(`SELECT cash_cents FROM economy_states WHERE player_id='${playerId}';`));
  const inj1 = await api('POST', '/v1/operational/laundering/inject', token, {
    front_shop_id: frontShop,
    safehouse_id: safehouseId,
    amount_cents: INJECT_CLEANED_CENTS,
  });
  if (inj1.status !== 200) throw new Error(`inject#1 failed: HTTP ${inj1.status} — ${JSON.stringify(inj1.data)}`);
  const nodeId = inj1.data.node_id;
  await advance(playerId, 1); // System 8 (MINUTE/2) cleans the idle node to 1.0 → LAUNDER_OUTPUT (MINUTE/11) releases.
  const walletAfterClean = Number(psql(`SELECT cash_cents FROM economy_states WHERE player_id='${playerId}';`));
  console.log(`[op-seed] launder inject#1 cleaned → wallet credited ${walletAfterClean - walletBeforeLaunder} cents`);

  // ─────────────────────────── 11. DISPLAY FLOAT — accrue a fresh UNCOLLECTED dealer float (the "dispatch runner" demo) ───────────────────────────
  // BEFORE the final mid-pipeline inject (no advance must follow that inject, or System 8 + LAUNDER_OUTPUT would clean
  // and release it). Zero the dealer float (it drifted up during inject#1's advance tick), then advance EXACTLY
  // DISPLAY_SELL_TICKS so the captured dealer projection shows a deterministic MODERATE cash band (an accrued float
  // awaiting a runner). This DISPLAY advance also fires LAUNDER_OUTPUT, but the node was emptied on release above
  // (occupancy 0 → a no-op) — so it is safe to advance here.
  psql(`UPDATE dealer SET float_cents=0 WHERE dealer_id='${dealerId}';`);
  await advance(playerId, DISPLAY_SELL_TICKS);
  const displayFloat = psql(`SELECT float_cents FROM dealer WHERE dealer_id='${dealerId}';`);
  console.log(`[op-seed] dealer accrued display float → ${displayFloat} cents (uncollected — MODERATE band)`);

  // ─────────────────────────── 10b. LAUNDER (final) — leave a node MID-PIPELINE (the LAST mutation, NO advance after) ───────────────────────────
  // Inject again into the SAME node, then reset its cleanliness to DIRTY (0) — the exact state a freshly-injected node
  // is in before System 8 cleans it (the insert seeds cleanliness_at_output=0). This MUST be the final mutation: any
  // advance after it would let System 8 (MINUTE/2) re-clean the idle node and LAUNDER_OUTPUT (MINUTE/11) release it.
  // The result is a genuine MID-PIPELINE node for the demo: buffered cash + a DIRTY cleanliness band (the pipeline bar
  // is mid-way, not CLEAN) — while the wallet already received the cleaned cash from inject#1.
  const inj2 = await api('POST', '/v1/operational/laundering/inject', token, {
    front_shop_id: frontShop,
    safehouse_id: safehouseId,
    amount_cents: INJECT_MIDPIPE_CENTS,
  });
  if (inj2.status !== 200) throw new Error(`inject#2 failed: HTTP ${inj2.status} — ${JSON.stringify(inj2.data)}`);
  psql(`UPDATE laundering_nodes SET cleanliness_at_output=0 WHERE node_id='${nodeId}';`);
  const nodeOccupancy = psql(`SELECT round(current_occupancy)::int FROM tail_risk_estimates WHERE node_id='${nodeId}';`);
  console.log(`[op-seed] launder inject#2 → node mid-pipeline (DIRTY, ${nodeOccupancy} cents buffered)`);

  // ─────────────────────────── 12. PIPELINE — chain Stage 2/3/4 off the Stage-1 node (Phase 2b, addStage) ───────────────────────────
  // Append PIPELINE_DOWNSTREAM_STAGES downstream stages so the front-shop Stage-1 node heads a MULTI-NODE chain
  // (Stage1→2→3→4). Each addStage appends ONE node+edge onto the current TAIL (the linear-chain invariant). This is the
  // LAST mutation and we do NOT advance after it: so (a) the Stage-1 head node stays DIRTY (mid-pipeline) for the
  // single-node screen + capstone assertions (no advance ⇒ System 8 never re-cleans it / routes it onward), and (b) the
  // pipeline overview projection shows the ordered chain with cleanliness bands RISING per stage (the bands are
  // stage_index-derived, independent of cash position). Idempotent: the reset above wipes this player's laundering
  // nodes/edges + district-16 buildings, so a re-run rebuilds the chain fresh (no duplicate stages).
  const pipelineNodeIds = [nodeId]; // the head = the Stage-1 front-shop node (created on inject#1).
  let tailNodeId = nodeId;          // addStage appends onto the current tail (a node with no outgoing edge).
  for (let s = 0; s < PIPELINE_DOWNSTREAM_STAGES; s += 1) {
    const host = stageHosts[s];
    const stage = await api('POST', '/v1/operational/laundering/stage', token, {
      from_node_id: tailNodeId,
      building_id: host,
    });
    if (stage.status !== 201) throw new Error(`addStage #${s + 2} failed: HTTP ${stage.status} — ${JSON.stringify(stage.data)}`);
    tailNodeId = stage.data.node_id;
    pipelineNodeIds.push(tailNodeId);
  }
  const stageCount = psql(
    `SELECT count(*) FROM laundering_nodes ln WHERE ln.player_id='${playerId}' ` +
      `AND ln.node_id IN (${pipelineNodeIds.map((id) => `'${id}'`).join(',')});`,
  );
  console.log(`[op-seed] pipeline chained → ${stageCount} stages (head=${nodeId} → ${PIPELINE_DOWNSTREAM_STAGES} downstream)`);

  // ─────────────────────────── 13. RAID (Phase-2b vector #1) — drive a building DAMAGED for the raid/repair UI ──────────
  // Stand up the raided/DAMAGED building the Building-Card raid surface (T7) reads: structural_state=DAMAGED,
  // recently_raided=true, a seized_amount band, a repair_cost band, and (with an audit pin) an escalated raid_risk band.
  // RECIPE (no-auth, non-prod test hooks — the SAME category as the advance harness):
  //   (a) POST /v1/_test/citysim/raid?player_id=&block_id=&district_id= → emits a canonical RaidPlannedEvent (exactly
  //       as System 4's 12h precinct review does) → RaidExecutionService BUFFERS it.
  //   (b) advance 1 tick → the MINUTE/13 RAID_EXECUTION tick flushes the buffer: it seizes the product_storage of EVERY
  //       product-holding operational building on the raided block → those buildings flip structural_state='damaged' +
  //       a building_raid row is inserted (grams_seized).
  // We raid the LAB's block — the lab still holds 140 g (200 g cooked − 60 g ferried), so the seizure is a real
  // MODERATE band (≥100 g floor) and the lab becomes DAMAGED. Idempotent: the reset above deletes this player's
  // district-16 buildings + building_raid rows are cleaned with them on a re-run (a fresh raid is produced each run).
  const raidBlockId = Number(psql(`SELECT block_id FROM buildings WHERE building_id='${lab}';`));
  const raidEmit = await api('POST', `/v1/_test/citysim/raid?player_id=${playerId}&block_id=${raidBlockId}&district_id=${OP_DISTRICT}`, null, {});
  if (raidEmit.status !== 200) throw new Error(`raid emit failed: HTTP ${raidEmit.status} — ${JSON.stringify(raidEmit.data)}`);
  await advance(playerId, 1); // MINUTE/13 RAID_EXECUTION flush → seize + DAMAGED + building_raid row.
  const labStructural = psql(`SELECT structural_state FROM building_operational_state WHERE building_id='${lab}';`);
  const raidRows = psql(`SELECT count(*) FROM building_raid WHERE building_id='${lab}';`);
  console.log(`[op-seed] raid executed on block ${raidBlockId} → lab structural_state=${labStructural} (${raidRows} raid row(s))`);

  // Escalate the LAB's raid_risk telegraph to HIGH by seeding an active audit pin (System 7 — the band derivation
  // floors raid_risk at HIGH when buildings.audit_pin_expires_at > now()). This is a deterministic way for the raid-risk
  // gauge to read above the seeded ELEVATED baseline (the cook's MICRO heat already lands WARM → ELEVATED). The raw pin
  // timestamp / heat float never leave the server — only the band. Idempotent (re-set on every run).
  psql(`UPDATE buildings SET audit_pin_expires_at = now() + interval '1 day' WHERE building_id='${lab}';`);
  const labRiskHeat = psql(`SELECT round(heat::numeric, 2) FROM buildings WHERE building_id='${lab}';`);
  console.log(`[op-seed] lab audit pin set (raid_risk floored at HIGH; heat≈${labRiskHeat})`);

  // The STASH sits on its OWN block + holds NO product → it is NOT raided: the seeder's "healthy control" building for
  // the T7 test's "a healthy building → raid_risk readable, no Repair button" assertion. (Confirm it stayed OPERATIONAL.)
  const stashStructural = psql(`SELECT structural_state FROM building_operational_state WHERE building_id='${stash}';`);
  console.log(`[op-seed] stash (healthy control) structural_state=${stashStructural}`);

  // ─────────────────────────── 13b. RE-PIN the laundering head node DIRTY (the LAST mutation — no advance after) ──────────
  // Step 10b set cleanliness_at_output=0 (DIRTY) and warned: "any advance after it would let System 8 (MINUTE/2)
  // re-clean the idle node". The RAID section above (step 13) violates that — its `advance(playerId, 1)` (the
  // RAID_EXECUTION flush) ALSO fires System 8, which re-cleans the idle head node to 1.0 → CLEAN. So we must re-pin
  // the head node DIRTY HERE, as the genuinely final mutation: no `advance()` runs after this point in the seeder,
  // so the head node truly stays DIRTY (mid-pipeline) at rest — the buffered cash (buffer_load) is untouched by this
  // float reset, only the cleanliness band returns to DIRTY. Idempotent (re-set on every run).
  psql(`UPDATE laundering_nodes SET cleanliness_at_output=0 WHERE node_id='${nodeId}';`);
  const headClean = psql(`SELECT cleanliness_at_output FROM laundering_nodes WHERE node_id='${nodeId}';`);
  console.log(`[op-seed] laundering head node re-pinned DIRTY after raid advance (cleanliness_at_output=${headClean})`);

  // ─────────────────────── 13c. MONEY HOLDING forfeiture ARM (Phase-5 vector #5a — the LAST mutation, NO advance after) ──────
  // SQL-PIN the money_holding's forfeiture_scheduled_at_tick = clock + a FAR lead → forfeiture_band PENDING (the telegraphed
  // audit warning the T9 UI reads). This MUST be the genuinely-final mutation: the MONEY_HOLDING_AUDIT tick (MINUTE/19)
  // CANCELS an armed forfeiture whenever effectiveHeld < the $20M threshold, and our demo hold ($50k) is far below it — so
  // ANY advance() after this pin would wipe it (the §6f build/deposit happen BEFORE §7–§13's advances precisely so this
  // arm survives). A FAR lead keeps it PENDING (not IMMINENT, which is ≤ 2 ticks remaining). R2.2: the raw scheduled tick
  // never leaves the server — the player surface is the qualitative forfeiture_band (NONE → PENDING → IMMINENT). No
  // advance() runs after this point, so the forfeiture stays PENDING at rest (the warning is demonstrable, the seizure
  // never fires). Idempotent (re-pinned on every run; the §6f build re-creates the row fresh).
  const mhArmClock = clockMinute(playerId);
  psql(`UPDATE money_holding SET forfeiture_scheduled_at_tick=${mhArmClock + MONEY_HOLDING_DEMO_FORFEITURE_LEAD_TICKS} WHERE building_id='${moneyHolding}';`);
  const mhForfeitureAt = psql(`SELECT COALESCE(forfeiture_scheduled_at_tick::text,'NULL') FROM money_holding WHERE building_id='${moneyHolding}';`);
  console.log(`[op-seed] money_holding forfeiture armed (scheduled_at_tick=${mhForfeitureAt}, clock=${mhArmClock} → PENDING band; far lead, never fires)`);

  // ─────────────────────────── Phase-20: exception queue + progression demo state ───────────────────────────
  // Deterministic PENDING cards for the Unity Exception Queue UI (screen_5/5a reduced) + the Tier-1→2 funnel.
  // A dedicated COOK lieutenant carries the teachable cards (ADD_RULE appends the chosen rule to HIS script) —
  // recruited via the REAL API (the same recruit the rule-editor PlayMode does, on the same raided lab — proven
  // recruitable). Roster cap is 5 (T.lieutenant.max_count_per_player); this is #1 after the wipe, fixtures may
  // recruit up to 4 more. Placed AFTER the last tick advance so no producer emits extra cards before the tests.
  const excRecruit = await api('POST', '/v1/lieutenants', token, { archetype: 'COOK', assigned_building_id: lab });
  if (excRecruit.status !== 201 && excRecruit.status !== 200) {
    throw new Error(`phase-20 exception-demo recruit failed: HTTP ${excRecruit.status} — ${JSON.stringify(excRecruit.data)}`);
  }
  const exceptionLtId = excRecruit.data?.payload?.data?.lieutenant_id ?? excRecruit.data?.lieutenant_id;
  if (!exceptionLtId) throw new Error('phase-20 recruit returned no lieutenant_id');

  // Card bands span the 3 projection bands (cut-points = even thirds — exceptions.projection.service.ts).
  // jsonb payloads are dollar-quoted ($J$…$J$) so JSON quoting never fights SQL quoting (labels stay apostrophe-free).
  const insertCard = (descriptor, ltId, candidates, suggested, confidence, priority, severity) =>
    psql(
      `INSERT INTO exception_queue (player_id, lieutenant_id, event_descriptor, candidate_actions, suggested_action, confidence, priority, severity) ` +
        `VALUES ('${playerId}', ${ltId ? `'${ltId}'` : 'NULL'}, '${descriptor}', ` +
        `$J$${JSON.stringify(candidates)}$J$::jsonb, $J$${JSON.stringify(suggested)}$J$::jsonb, ${confidence}, ${priority}, ${severity}) RETURNING exception_id;`,
    );

  const teachHeat = {
    id: 'teach_heat', label: 'Teach: pause on high heat',
    projected_consequence: 'Ops pause whenever heat spikes',
    add_rule_dsl: 'WHEN EVENT(heat,>=,0.5) THEN PAUSE_OPS @90;',
  };
  const teachIdle = {
    id: 'teach_idle', label: 'Teach: restart when idle',
    projected_consequence: 'The cook restarts when the lab sits idle',
    add_rule_dsl: 'WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;',
  };
  const letRide = { id: 'let_ride', label: 'Let it ride', projected_consequence: 'The risk stays', add_rule_dsl: null };

  insertCard('exc_demo_teach_heat', exceptionLtId, [teachHeat, letRide], teachHeat, 0.8, 80, 80); // CONFIDENT/HIGH/HIGH
  insertCard('exc_demo_teach_idle', exceptionLtId, [teachIdle, letRide], teachIdle, 0.5, 50, 50); // LIKELY/MEDIUM/MEDIUM
  insertCard('exc_demo_one_time', null, [letRide], letRide, 0.2, 10, 10);                          // TENTATIVE/LOW/LOW, unbound

  // Raid-style card (P16 shape): candidates carry the effect descriptor. DISPLAY-ONLY for PlayMode — the tests
  // NEVER resolve it (REPAIR/BRIBE/LAY_LOW would mutate the raided-lab state the raid fixtures read).
  const repair = { id: 'fix_quiet', label: 'Repair quietly', projected_consequence: 'Costs cash, sheds no heat', add_rule_dsl: null, effect: { type: 'REPAIR', target_building_id: lab } };
  const bribe = { id: 'pay_off', label: 'Bribe the inspector', projected_consequence: 'Cheaper but riskier', add_rule_dsl: null, effect: { type: 'BRIBE', target_building_id: lab } };
  const layLow = { id: 'lay_low', label: 'Lay low', projected_consequence: 'Free, ops slow down', add_rule_dsl: null, effect: { type: 'LAY_LOW', target_building_id: lab } };
  insertCard('exc_demo_raid_style', exceptionLtId, [repair, bribe, layLow], repair, 0.8, 80, 30);

  console.log(`[op-seed] phase-20 exception demo: COOK ${exceptionLtId} + 4 pending cards (2 teach / 1 one-time / 1 raid-style)`);

  // ─────────── Phase-21: autonomy ceiling demo state (deterministic; FK-CASCADE cleaned by the lieutenant wipe) ───────────
  // A DEPLETED PRODUCTION_OPS budget (band 'depleted' on the lieutenant screen) + an OPEN 2-issue report for the
  // exception-demo COOK. cycle_id 0 vs state cycle 2 → backlog_age_cycles = 2. Options = the REAL OPTION_PAIRS.COOK
  // shape (option-pairs.ts) — never invented. last_refresh_tick is stamped at the CURRENT clock minute so the next
  // LIEUTENANT_TICK's refreshIfDue (window 30) cannot refresh the depleted budget away mid-test.
  const seedClockMinute = clockMinute(playerId);
  const cookBudget = {
    generation_strategy: 'ARCHETYPE_SEED',
    entries: { PRODUCTION_OPS: { current: 0, cap: 3, bucket: 'depleted', last_decrement_tick: 0 } },
  };
  psql(`INSERT INTO autonomy_ceiling_state (lieutenant_id, archetype_key, budget, cycle_id, last_refresh_tick) ` +
       `VALUES ('${exceptionLtId}', 'COOK', $J$${JSON.stringify(cookBudget)}$J$::jsonb, 2, ${seedClockMinute});`);
  const cookOptA = { effect_kind: 'COOK_NOW', label_key: 'autonomy.cook.now', projected_outcome: 'MINIMAL' };
  const cookOptB = { effect_kind: 'COOK_REFINE', label_key: 'autonomy.cook.refine', projected_outcome: 'TRADEOFF' };
  const autonomyIssues = [
    { issue_id: 'iss_demo_1', category: 'PRODUCTION_OPS', refused_action: 'COOK', option_a: cookOptA, option_b: cookOptB },
    { issue_id: 'iss_demo_2', category: 'PRODUCTION_OPS', refused_action: 'COOK', option_a: cookOptA, option_b: cookOptB },
  ];
  const autonomyReportId = psql(
    `INSERT INTO autonomy_reports (player_id, lieutenant_id, cycle_id, issues) ` +
      `VALUES ('${playerId}', '${exceptionLtId}', 0, $J$${JSON.stringify(autonomyIssues)}$J$::jsonb) RETURNING report_id;`,
  );
  console.log(`[op-seed] phase-21 autonomy demo: depleted PRODUCTION_OPS + open report ${autonomyReportId} (2 issues)`);

  // ─────────────────────────── DONE — print creds + the seeded entity IDs ───────────────────────────
  console.log('\n=== OPERATIONAL DEMO SEEDED ===');
  console.log(
    JSON.stringify(
      {
        credentials: { email: EMAIL, callsign: CALLSIGN, password: PASSWORD },
        accountId,
        playerId,
        district: OP_DISTRICT,
        buildings: {
          lab,
          stash,
          dealer_spot: dealerSpot,
          front_shop: frontShop,
          cash_safehouse: safehouseBldg,
          refinery, // Phase-2b vector #2: the Crick cold-chain refinery (holds 200 g Crick → OPTIMAL_COLD).
          specialized_lab: ashLab, // Phase-2c vector #2c: the Ash luxury lab (Tier-2 REFINED, 200 g Ash → CRYSTALLINE).
          grow_house: growHouse, // Phase-3 vector #3: the grow_house mid-grow (MID stage / ON_TRACK husbandry / tend_due).
          distribution_hub: distributionHub, // Phase-4 vector #4: the Tier-2 hub (MEDIUM, BUSY roster, FOOT/BIKE/CAR).
          money_holding: moneyHolding, // Phase-5 vector #5a: the Tier-2 vault (MEDIUM, MODERATE held, BUSY, EARNING, PENDING forfeiture).
        },
        // Phase-2b vector #2 (substances / Crick): the refinery holds 200 g Crick and is cold-by-nature → its storage
        // projection reads substance_type=CRICK, temperature_status=OPTIMAL_COLD, degrading=false (the cold-chain UI reads it).
        refinery, // top-level too, so the cold-chain T8 test can discover it with the same flat-regex extractor.
        // Phase-2c vector #2c (substances / Ash): the specialized_lab holds 200 g Ash at CRYSTALLINE purity, is REFINED
        // (Tier-2), and has a SCHEDULED appointment at its (Glass) venue — the Ash luxury UI (T12) reads all three.
        specialized_lab: ashLab, // top-level too, so the Ash T12 test can discover it with the same flat-regex extractor.
        ash_appointment_id: ashAppointmentId, // the SCHEDULED appointment booked at the specialized_lab (Glass venue).
        // Phase-3 vector #3 (grow_house): the grow_house holds an ACTIVE grow_session at MID stage / ON_TRACK husbandry /
        // tend_due — the grow UI (T10) reads grow_stage_band=MID, husbandry_band=ON_TRACK, tend_due=true, raid_risk climbed.
        grow_house: growHouse, // top-level too, so the grow T10 test can discover it with the same flat-regex extractor.
        grow_session_id: growSessionId, // the active grow_session the grow surface tracks (the projection id the UI queries).
        // Phase-4 vector #4 (distribution_hub): the hub is a Tier-2 MEDIUM hub in a tidewater district with HUB_DEMO_IN_TRANSIT
        // shipments in transit (BUSY roster) + bike/car unlocked — the hub UI (T9) reads hub_tier_band=MEDIUM, roster_band=BUSY,
        // available_vehicles=[FOOT,BIKE,CAR], and the Upgrade-hub-tier affordance (Tier-2 < MAX). Also dispatch source/dest
        // hints for the T9 dispatch test (the refinery holds product → a valid source; the dealer-spot is a valid destination).
        distribution_hub: distributionHub, // top-level too, so the hub T9 test can discover it with the same flat-regex extractor.
        hub_dispatch_from: refinery, // the in-transit demo source (holds Crick) — a valid dispatch source for the T9 vehicle test.
        hub_dispatch_to: dealerSpot, // a valid dispatch destination (a distinct operational building; from≠to).
        // Phase-5 vector #5a (money_holding): the Tier-2 vault holds $50k (MODERATE) below the $5M Tier-2 cap (BUSY) with the
        // passive yield EARNING + an ARMED forfeiture (PENDING) — the money_holding UI (T9) reads money_holding_tier_band=MEDIUM,
        // held_band=MODERATE, capacity_band=BUSY, yield_band=EARNING, forfeiture_band=PENDING, plus the upgrade + deposit/withdraw
        // affordances. A non-money_holding card carries the neutral NONE defaults (the refinery/lab control surfaces prove it).
        money_holding: moneyHolding, // top-level too, so the money_holding T9 test can discover it with the same flat-regex extractor.
        // Phase-2b raid surface (T7): the lab was raided → DAMAGED (the raided_building the building-card raid UI reads);
        // the stash is the healthy control (OPERATIONAL, never raided → raid_risk readable, no Repair button).
        raided_building: lab,
        healthy_building: stash,
        raid_block_id: raidBlockId,
        safehouse_id: safehouseId,
        laundering_node_id: nodeId, // the head Stage-1 node — the id the pipeline-overview screen queries.
        pipeline_node_ids: pipelineNodeIds, // the ordered chain head→tail (Stage1→2→3→4).
        pipeline_stage_count: pipelineNodeIds.length,
        dealer_id: dealerId,
        courier_id: courierId,
        lek_tile_id: lekTile,
        exception_lieutenant_id: exceptionLtId, // Phase-20: the COOK the teach-cards' ADD_RULE attaches to
        autonomy_report_id: autonomyReportId, // Phase-21: the open 2-issue report (depleted PRODUCTION_OPS, backlog_age_cycles=2)
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error('[op-seed] FAILED:', e.message);
  process.exit(1);
});
