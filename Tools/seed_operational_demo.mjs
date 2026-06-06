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
const EMAIL = 'operational_demo@example.test';
const CALLSIGN = 'operational_demo';
const PASSWORD = 'operational-demo-pw';

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
  const res = await fetch(`${BASE_URL}/auth/v1/signin`, {
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

  // Reset the wallet to a fixed generous balance (deterministic figures regardless of prior runs).
  psql(
    `INSERT INTO economy_states (player_id, cash_cents) VALUES ('${playerId}', ${WALLET_CENTS}) ` +
      `ON CONFLICT (player_id) DO UPDATE SET cash_cents = ${WALLET_CENTS};`,
  );

  // ─────────────────────────── 3. Sign in → Bearer ───────────────────────────
  const token = await signin();
  console.log('[op-seed] signed in (Bearer acquired)');

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

  // Phase-2b vector #2 (Crick cold-chain): a REFINERY on its OWN fresh district-16 block (offset past the stage
  // hosts → never the lab's block, so the raid at the end never touches it). Convert passes cold_storage_capable
  // explicitly (a refinery is cold-by-nature regardless, but the flag is part of the real convert contract).
  const refineryBlock = freeBlock(5 + PIPELINE_DOWNSTREAM_STAGES);
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
  const pyralinStock = psql(`SELECT COALESCE(SUM(quantity_units),0) FROM precursor_stock WHERE player_id='${playerId}' AND building_id='${lab}';`);
  console.log(`[op-seed] Pyralin order delivered → ${pyralinStock} units in the lab`);

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
        },
        // Phase-2b vector #2 (substances / Crick): the refinery holds 200 g Crick and is cold-by-nature → its storage
        // projection reads substance_type=CRICK, temperature_status=OPTIMAL_COLD, degrading=false (the cold-chain UI reads it).
        refinery, // top-level too, so the cold-chain T8 test can discover it with the same flat-regex extractor.
        // Phase-2c vector #2c (substances / Ash): the specialized_lab holds 200 g Ash at CRYSTALLINE purity, is REFINED
        // (Tier-2), and has a SCHEDULED appointment at its (Glass) venue — the Ash luxury UI (T12) reads all three.
        specialized_lab: ashLab, // top-level too, so the Ash T12 test can discover it with the same flat-regex extractor.
        ash_appointment_id: ashAppointmentId, // the SCHEDULED appointment booked at the specialized_lab (Glass venue).
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
