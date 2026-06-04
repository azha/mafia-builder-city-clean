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
  console.log('[op-seed] 5 buildings purchased + converted (gutting)');

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
        },
        safehouse_id: safehouseId,
        laundering_node_id: nodeId,
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
